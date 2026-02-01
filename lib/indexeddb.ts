"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { NotePayload, NotebookPayload } from "@/types/note";

// Database schema version - increment when schema changes
const DB_VERSION = 1;
const DB_NAME = "notemaster";

// Types for pending sync operations
export type SyncOperation = {
  id: string;
  type: "create" | "update" | "delete";
  entity: "note" | "notebook";
  entityId: string;
  data: NotePayload | NotebookPayload | null;
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
  notebooks: {
    key: string;
    value: NotebookPayload & { _localUpdatedAt?: number };
    indexes: { "by-userId": string };
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
          // Notes store
          const notesStore = db.createObjectStore("notes", { keyPath: "id" });
          notesStore.createIndex("by-userId", "userId");
          notesStore.createIndex("by-updatedAt", "updatedAt");

          // Notebooks store
          const notebooksStore = db.createObjectStore("notebooks", {
            keyPath: "id",
          });
          notebooksStore.createIndex("by-userId", "userId");

          // Pending sync operations
          const pendingSyncStore = db.createObjectStore("pendingSync", {
            keyPath: "id",
          });
          pendingSyncStore.createIndex("by-timestamp", "timestamp");

          // Recent searches
          const recentSearchesStore = db.createObjectStore("recentSearches", {
            keyPath: "id",
          });
          recentSearchesStore.createIndex("by-timestamp", "timestamp");

          // Meta store for app settings
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
      blocked() {
        console.warn("IndexedDB blocked - close other tabs");
      },
      blocking() {
        // Close connection to allow upgrade in other tab
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
  // Get all notes (for guest users, notes don't have userId field)
  const allNotes = await db.getAll("notes");
  return allNotes;
}

async function getNote(id: string): Promise<NotePayload | undefined> {
  const db = await getDB();
  return db.get("notes", id);
}

async function saveNote(note: NotePayload): Promise<void> {
  const db = await getDB();
  const noteWithMeta = {
    ...note,
    _localUpdatedAt: Date.now(),
  };
  await db.put("notes", noteWithMeta);
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

async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("notes", id);
}

async function clearAllNotes(userId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("notes", "readwrite");
  const index = tx.store.index("by-userId");

  let cursor = await index.openCursor(userId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

// Get notes for a specific authenticated user (for stale-while-revalidate cache)
export async function getUserNotes(userId: string): Promise<NotePayload[]> {
  const db = await getDB();
  return db.getAllFromIndex("notes", "by-userId", userId);
}

// Get notebooks for a specific authenticated user
export async function getUserNotebooks(userId: string): Promise<NotebookPayload[]> {
  const db = await getDB();
  return db.getAllFromIndex("notebooks", "by-userId", userId);
}

// Save notes for authenticated user (replaces all cached notes for this user)
export async function saveUserNotes(userId: string, notes: NotePayload[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("notes", "readwrite");
  const index = tx.store.index("by-userId");
  const timestamp = Date.now();

  // Clear existing notes for this user
  let cursor = await index.openCursor(userId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  // Add new notes
  for (const note of notes) {
    await tx.store.put({ ...note, _localUpdatedAt: timestamp });
  }
  
  await tx.done;
}

// Save notebooks for authenticated user
export async function saveUserNotebooks(userId: string, notebooks: NotebookPayload[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("notebooks", "readwrite");
  const index = tx.store.index("by-userId");
  const timestamp = Date.now();

  // Clear existing notebooks for this user
  let cursor = await index.openCursor(userId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  // Add new notebooks
  for (const nb of notebooks) {
    await tx.store.put({ ...nb, _localUpdatedAt: timestamp });
  }
  
  await tx.done;
}

// =====================
// Notebooks Operations
// =====================

export async function getAllNotebooks(): Promise<NotebookPayload[]> {
  const db = await getDB();
  // Get all notebooks (for guest users, notebooks don't have userId field)
  return db.getAll("notebooks");
}

async function saveNotebook(notebook: NotebookPayload): Promise<void> {
  const db = await getDB();
  await db.put("notebooks", { ...notebook, _localUpdatedAt: Date.now() });
}

export async function saveNotebooks(
  notebooks: NotebookPayload[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("notebooks", "readwrite");
  const timestamp = Date.now();

  await Promise.all([
    ...notebooks.map((nb) =>
      tx.store.put({ ...nb, _localUpdatedAt: timestamp })
    ),
    tx.done,
  ]);
}

async function deleteNotebook(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("notebooks", id);
}

// =====================
// Pending Sync Queue
// =====================

export async function addToPendingSync(
  operation: Omit<SyncOperation, "id" | "timestamp" | "retries">
): Promise<void> {
  const db = await getDB();
  const syncOp: SyncOperation = {
    ...operation,
    id: `${operation.entity}-${operation.entityId}-${Date.now()}`,
    timestamp: Date.now(),
    retries: 0,
  };
  await db.put("pendingSync", syncOp);
}

export async function getPendingSyncOperations(): Promise<SyncOperation[]> {
  const db = await getDB();
  return db.getAllFromIndex("pendingSync", "by-timestamp");
}

export async function removePendingSync(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("pendingSync", id);
}

export async function updatePendingSyncRetry(id: string): Promise<void> {
  const db = await getDB();
  const op = await db.get("pendingSync", id);
  if (op) {
    op.retries += 1;
    await db.put("pendingSync", op);
  }
}

async function clearPendingSync(): Promise<void> {
  const db = await getDB();
  await db.clear("pendingSync");
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

  // Check if this query already exists
  const existing = await tx.store.getAll();
  const duplicate = existing.find(
    (s) => s.query.toLowerCase() === query.toLowerCase()
  );

  if (duplicate) {
    // Update timestamp instead of adding new
    await tx.store.put({ ...duplicate, timestamp: Date.now() });
  } else {
    // Add new search
    await tx.store.put({
      id: `search-${Date.now()}`,
      query: query.trim(),
      timestamp: Date.now(),
    });

    // Remove oldest if over limit
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
  // Return in reverse chronological order
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
): Promise<{ notes: NotePayload[]; notebooks: NotebookPayload[] }> {
  if (typeof window === "undefined") {
    return { notes: [], notebooks: [] };
  }

  const migrated = await getMeta<boolean>(`migrated-${storageKey}`);
  if (migrated) {
    return { notes: [], notebooks: [] };
  }

  let notes: NotePayload[] = [];
  let notebooks: NotebookPayload[] = [];

  try {
    // Load notes from localStorage
    const notesRaw = window.localStorage.getItem(storageKey);
    if (notesRaw) {
      notes = JSON.parse(notesRaw);
      if (Array.isArray(notes)) {
        await saveNotes(notes);
      }
    }

    // Load notebooks from localStorage
    const notebooksRaw = window.localStorage.getItem(`${storageKey}-notebooks`);
    if (notebooksRaw) {
      notebooks = JSON.parse(notebooksRaw);
      if (Array.isArray(notebooks)) {
        await saveNotebooks(notebooks);
      }
    }

    // Mark as migrated
    await setMeta(`migrated-${storageKey}`, true);

    // Optionally clear localStorage after successful migration
    // window.localStorage.removeItem(storageKey);
    // window.localStorage.removeItem(`${storageKey}-notebooks`);

    console.log(
      `Migrated ${notes.length} notes and ${notebooks.length} notebooks from localStorage`
    );
  } catch (error) {
    console.error("Failed to migrate from localStorage:", error);
  }

  return { notes, notebooks };
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


