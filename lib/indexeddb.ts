"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { NotePayload } from "@/types/note";

// Database schema version - increment when schema changes
const DB_VERSION = 2;
const DB_NAME = "notemaster";

// Types for pending sync operations
export type SyncOperation = {
  id: string;
  type: "create" | "update" | "delete";
  entity: "note";
  entityId: string;
  data: NotePayload | null;
  timestamp: number;
  retries: number;
};

export type RecentSearch = {
  id: string;
  query: string;
  timestamp: number;
};

// IndexedDB Schema
interface NoteMasterDB extends DBSchema {
  notes: {
    key: string;
    value: NotePayload & { _localUpdatedAt?: number };
    indexes: { "by-userId": string; "by-updatedAt": string };
  };
  pendingSync: {
    key: string;
    value: SyncOperation;
    indexes: { "by-timestamp": number };
  };
  recentSearches: {
    key: string;
    value: RecentSearch;
    indexes: { "by-timestamp": number };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbPromise: Promise<IDBPDatabase<NoteMasterDB>> | null = null;
const SYNC_QUEUE_EVENT = "notemaster:sync-queue-changed";

function notifySyncQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_QUEUE_EVENT));
  }
}

export const syncQueueChangedEvent = SYNC_QUEUE_EVENT;

// Get or create database connection
function getDB(): Promise<IDBPDatabase<NoteMasterDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available on server"));
  }

  if (!dbPromise) {
    dbPromise = openDB<NoteMasterDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Fresh install or upgrade from version 0
        if (oldVersion < 1) {
          const notesStore = db.createObjectStore("notes", { keyPath: "id" });
          notesStore.createIndex("by-userId", "userId");
          notesStore.createIndex("by-updatedAt", "updatedAt");

          const pendingSyncStore = db.createObjectStore("pendingSync", {
            keyPath: "id",
          });
          pendingSyncStore.createIndex("by-timestamp", "timestamp");

          const recentSearchesStore = db.createObjectStore("recentSearches", {
            keyPath: "id",
          });
          recentSearchesStore.createIndex("by-timestamp", "timestamp");

          db.createObjectStore("meta", { keyPath: "key" });
        }

        // Remove legacy notebooks store after notebook feature removal.
        if (
          oldVersion < 2 &&
          (db as unknown as IDBDatabase).objectStoreNames.contains("notebooks")
        ) {
          (db as unknown as IDBDatabase).deleteObjectStore("notebooks");
        }
      },
      blocked() {
        console.warn("IndexedDB blocked - close other tabs");
      },
      blocking() {
        dbPromise?.then((db) => db.close());
        dbPromise = null;
      },
    });
  }

  return dbPromise;
}

// =====================
// Notes Operations
// =====================

export async function getAllNotes(): Promise<NotePayload[]> {
  const db = await getDB();
  return db.getAll("notes");
}

export async function saveNotes(notes: NotePayload[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("notes", "readwrite");
  const timestamp = Date.now();

  await Promise.all([
    ...notes.map((note) =>
      tx.store.put({ ...note, _localUpdatedAt: timestamp })
    ),
    tx.done,
  ]);
}

// Get notes for a specific authenticated user (for stale-while-revalidate cache)
export async function getUserNotes(userId: string): Promise<NotePayload[]> {
  const db = await getDB();
  return db.getAllFromIndex("notes", "by-userId", userId);
}

function shouldUpsertUserNote(
  existing: (NotePayload & { _localUpdatedAt?: number }) | undefined,
  note: NotePayload
): boolean {
  if (!existing) return true;

  return (
    existing.updatedAt !== note.updatedAt ||
    existing.createdAt !== note.createdAt ||
    existing.title !== note.title ||
    existing.content !== note.content ||
    existing.pinned !== note.pinned ||
    existing.archived !== note.archived ||
    existing.trashed !== note.trashed ||
    existing.dueAt !== note.dueAt ||
    existing.tags.length !== note.tags.length ||
    existing.checklist.length !== note.checklist.length ||
    existing.attachments.length !== note.attachments.length
  );
}

// Save notes for authenticated user with diff-based writes.
export async function saveUserNotes(
  userId: string,
  notes: NotePayload[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("notes", "readwrite");
  const index = tx.store.index("by-userId");
  const timestamp = Date.now();
  const existingNotes = await index.getAll(userId);
  const existingById = new Map(existingNotes.map((note) => [note.id, note]));
  const incomingIds = new Set(notes.map((note) => note.id));

  for (const existing of existingNotes) {
    if (!incomingIds.has(existing.id)) {
      await tx.store.delete(existing.id);
    }
  }

  for (const note of notes) {
    if (shouldUpsertUserNote(existingById.get(note.id), note)) {
      await tx.store.put({ ...note, _localUpdatedAt: timestamp });
    }
  }

  await tx.done;
}

// =====================
// Pending Sync Queue
// =====================

export async function addToPendingSync(
  operation: Omit<SyncOperation, "id" | "timestamp" | "retries">
): Promise<void> {
  const db = await getDB();
  const existingOps = await db.getAllFromIndex("pendingSync", "by-timestamp");
  const existing = existingOps.find(
    (op) => op.entity === operation.entity && op.entityId === operation.entityId
  );

  if (existing) {
    if (existing.type === "create" && operation.type === "delete") {
      await db.delete("pendingSync", existing.id);
      return;
    }

    const nextType =
      existing.type === "create" && operation.type === "update"
        ? "create"
        : operation.type;

    await db.put("pendingSync", {
      ...existing,
      type: nextType,
      data: operation.data,
      timestamp: Date.now(),
      retries: 0,
    });
    notifySyncQueueChanged();
    return;
  }

  const syncOp: SyncOperation = {
    ...operation,
    id: `${operation.entity}-${operation.entityId}-${Date.now()}`,
    timestamp: Date.now(),
    retries: 0,
  };
  await db.put("pendingSync", syncOp);
  notifySyncQueueChanged();
}

export async function getPendingSyncOperations(): Promise<SyncOperation[]> {
  const db = await getDB();
  return db.getAllFromIndex("pendingSync", "by-timestamp");
}

export async function removePendingSync(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("pendingSync", id);
  notifySyncQueueChanged();
}

export async function updatePendingSyncRetry(id: string): Promise<void> {
  const db = await getDB();
  const op = await db.get("pendingSync", id);
  if (op) {
    op.retries += 1;
    await db.put("pendingSync", op);
    notifySyncQueueChanged();
  }
}

export async function getPendingSyncCount(): Promise<number> {
  const db = await getDB();
  return db.count("pendingSync");
}

// =====================
// Recent Searches
// =====================

const MAX_RECENT_SEARCHES = 10;

export async function addRecentSearch(query: string): Promise<void> {
  if (!query.trim()) return;

  const db = await getDB();
  const tx = db.transaction("recentSearches", "readwrite");

  const existing = await tx.store.getAll();
  const duplicate = existing.find(
    (s) => s.query.toLowerCase() === query.toLowerCase()
  );

  if (duplicate) {
    await tx.store.put({ ...duplicate, timestamp: Date.now() });
  } else {
    await tx.store.put({
      id: `search-${Date.now()}`,
      query: query.trim(),
      timestamp: Date.now(),
    });

    const all = await tx.store.index("by-timestamp").getAll();
    if (all.length > MAX_RECENT_SEARCHES) {
      const toRemove = all.slice(0, all.length - MAX_RECENT_SEARCHES);
      for (const item of toRemove) {
        await tx.store.delete(item.id);
      }
    }
  }

  await tx.done;
}

export async function getRecentSearches(): Promise<RecentSearch[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("recentSearches", "by-timestamp");
  return all.reverse();
}

export async function clearRecentSearches(): Promise<void> {
  const db = await getDB();
  await db.clear("recentSearches");
}

export async function removeRecentSearch(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("recentSearches", id);
}

// =====================
// Meta / Settings
// =====================

async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const result = await db.get("meta", key);
  return result?.value as T | undefined;
}

async function setMeta<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put("meta", { key, value });
}

// =====================
// Migration from localStorage
// =====================

export async function migrateFromLocalStorage(
  storageKey: string
): Promise<{ notes: NotePayload[] }> {
  if (typeof window === "undefined") {
    return { notes: [] };
  }

  const migrated = await getMeta<boolean>(`migrated-${storageKey}`);
  if (migrated) {
    return { notes: [] };
  }

  let notes: NotePayload[] = [];

  try {
    const notesRaw = window.localStorage.getItem(storageKey);
    if (notesRaw) {
      notes = JSON.parse(notesRaw);
      if (Array.isArray(notes)) {
        await saveNotes(notes);
      }
    }

    await setMeta(`migrated-${storageKey}`, true);

    console.log(`Migrated ${notes.length} notes from localStorage`);
  } catch (error) {
    console.error("Failed to migrate from localStorage:", error);
  }

  return { notes };
}

// =====================
// Utility
// =====================

export async function isIndexedDBAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const db = await getDB();
    return !!db;
  } catch {
    return false;
  }
}

// =====================
// Draft Autosave
// =====================

const DRAFT_KEY_PREFIX = "draft-";

export async function saveDraft(note: NotePayload): Promise<void> {
  await setMeta(`${DRAFT_KEY_PREFIX}${note.id}`, note);
}

export async function getDraft(noteId: string): Promise<NotePayload | undefined> {
  return getMeta<NotePayload>(`${DRAFT_KEY_PREFIX}${noteId}`);
}

export async function deleteDraft(noteId: string): Promise<void> {
  const db = await getDB();
  await db.delete("meta", `${DRAFT_KEY_PREFIX}${noteId}`);
}
