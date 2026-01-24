"use client";

import {
  getPendingSyncOperations,
  removePendingSync,
  updatePendingSyncRetry,
  addToPendingSync,
  type SyncOperation,
} from "@/lib/indexeddb";
import { apiRequest } from "@/lib/api-client";
import type { NotePayload, NotebookPayload } from "@/types/note";

// Max retries before giving up on an operation
const MAX_RETRIES = 5;

// Exponential backoff base delay (ms)
const BASE_DELAY = 1000;

/**
 * Register for background sync if supported
 */
export async function registerBackgroundSync(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration && "sync" in registration) {
      await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("notemaster-sync");
      return true;
    }
  } catch (error) {
    console.error("Background sync registration failed:", error);
  }
  return false;
}

/**
 * Check if the device is online
 */
export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

/**
 * Queue a sync operation for later processing
 */
export async function queueSyncOperation(
  operation: Omit<SyncOperation, "id" | "timestamp" | "retries">
): Promise<void> {
  await addToPendingSync(operation);
  
  // Try to sync immediately if online
  if (isOnline()) {
    await processSyncQueue();
  } else {
    // Register for background sync when we come back online
    await registerBackgroundSync();
  }
}

/**
 * Process all pending sync operations
 */
export async function processSyncQueue(): Promise<{
  success: number;
  failed: number;
  remaining: number;
}> {
  const operations = await getPendingSyncOperations();
  let success = 0;
  let failed = 0;
  
  for (const op of operations) {
    try {
      await processOperation(op);
      await removePendingSync(op.id);
      success++;
    } catch (error) {
      console.error(`Sync operation failed:`, op, error);
      
      if (op.retries >= MAX_RETRIES) {
        // Give up on this operation
        await removePendingSync(op.id);
        failed++;
      } else {
        // Increment retry count
        await updatePendingSyncRetry(op.id);
      }
    }
  }
  
  const remaining = await getPendingSyncOperations();
  
  return {
    success,
    failed,
    remaining: remaining.length,
  };
}

/**
 * Process a single sync operation
 */
async function processOperation(op: SyncOperation): Promise<void> {
  const { type, entity, entityId, data } = op;
  
  switch (entity) {
    case "note":
      await processNoteOperation(type, entityId, data as NotePayload | null);
      break;
    case "notebook":
      await processNotebookOperation(type, entityId, data as NotebookPayload | null);
      break;
    default:
      throw new Error(`Unknown entity type: ${entity}`);
  }
}

/**
 * Process note sync operation
 */
async function processNoteOperation(
  type: SyncOperation["type"],
  noteId: string,
  data: NotePayload | null
): Promise<void> {
  switch (type) {
    case "create":
      if (!data) throw new Error("Missing data for create operation");
      await apiRequest<NotePayload>("/api/notes", {
        method: "POST",
        body: JSON.stringify(data),
      });
      break;
      
    case "update":
      if (!data) throw new Error("Missing data for update operation");
      await apiRequest<NotePayload>(`/api/notes/${noteId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      break;
      
    case "delete":
      await apiRequest(`/api/notes/${noteId}`, {
        method: "DELETE",
      });
      break;
  }
}

/**
 * Process notebook sync operation
 */
async function processNotebookOperation(
  type: SyncOperation["type"],
  notebookId: string,
  data: NotebookPayload | null
): Promise<void> {
  switch (type) {
    case "create":
      if (!data) throw new Error("Missing data for create operation");
      await apiRequest<NotebookPayload>("/api/notebooks", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          parentId: data.parentId,
          color: data.color,
        }),
      });
      break;
      
    case "update":
      if (!data) throw new Error("Missing data for update operation");
      await apiRequest<NotebookPayload>(`/api/notebooks/${notebookId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: data.name,
          parentId: data.parentId,
          color: data.color,
        }),
      });
      break;
      
    case "delete":
      await apiRequest(`/api/notebooks/${notebookId}`, {
        method: "DELETE",
      });
      break;
  }
}

/**
 * Calculate exponential backoff delay
 */
export function getBackoffDelay(retries: number): number {
  return Math.min(BASE_DELAY * Math.pow(2, retries), 30000); // Max 30 seconds
}

/**
 * Setup online/offline event listeners
 */
export function setupConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === "undefined") return () => {};
  
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

/**
 * Hook into connectivity changes and process queue when coming online
 */
export function initBackgroundSync(): () => void {
  return setupConnectivityListeners(
    async () => {
      await processSyncQueue();
    },
    () => {
      // Operations will be queued automatically when offline
    }
  );
}
