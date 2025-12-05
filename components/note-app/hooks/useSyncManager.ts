"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import type { NotePayload, NotebookPayload } from "@/types/note";
import {
  getPendingSyncOperations,
  removePendingSync,
  updatePendingSyncRetry,
  addToPendingSync,
  type SyncOperation,
} from "@/lib/indexeddb";

const MAX_RETRIES = 3;
const SYNC_INTERVAL_MS = 30000; // 30 seconds

type SyncManagerProps = {
  isAuthenticated: boolean;
  onSyncNote?: (note: NotePayload) => Promise<NotePayload>;
  onDeleteNote?: (id: string) => Promise<void>;
  onSyncNotebook?: (notebook: NotebookPayload) => Promise<NotebookPayload>;
  onDeleteNotebook?: (id: string) => Promise<void>;
};

/**
 * SyncManager handles background synchronization of offline changes
 * when the user comes back online.
 */
export function useSyncManager({
  isAuthenticated,
  onSyncNote,
  onDeleteNote,
  onSyncNotebook,
  onDeleteNotebook,
}: SyncManagerProps) {
  const isSyncing = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processOperation = useCallback(
    async (op: SyncOperation): Promise<boolean> => {
      try {
        if (op.entity === "note") {
          if (op.type === "delete" && onDeleteNote) {
            await onDeleteNote(op.entityId);
          } else if ((op.type === "create" || op.type === "update") && onSyncNote && op.data) {
            await onSyncNote(op.data as NotePayload);
          }
        } else if (op.entity === "notebook") {
          if (op.type === "delete" && onDeleteNotebook) {
            await onDeleteNotebook(op.entityId);
          } else if ((op.type === "create" || op.type === "update") && onSyncNotebook && op.data) {
            await onSyncNotebook(op.data as NotebookPayload);
          }
        }
        return true;
      } catch (error) {
        console.error(`Failed to sync ${op.entity} ${op.entityId}:`, error);
        return false;
      }
    },
    [onSyncNote, onDeleteNote, onSyncNotebook, onDeleteNotebook]
  );

  const syncPendingOperations = useCallback(async () => {
    if (!isAuthenticated || isSyncing.current || !navigator.onLine) {
      return;
    }

    isSyncing.current = true;

    try {
      const operations = await getPendingSyncOperations();
      
      if (operations.length === 0) {
        isSyncing.current = false;
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const op of operations) {
        const success = await processOperation(op);

        if (success) {
          await removePendingSync(op.id);
          successCount++;
        } else {
          if (op.retries >= MAX_RETRIES) {
            // Max retries reached, remove the operation
            await removePendingSync(op.id);
            failCount++;
          } else {
            await updatePendingSyncRetry(op.id);
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Synced ${successCount} offline changes`);
      }

      if (failCount > 0) {
        toast.error(`Failed to sync ${failCount} changes after ${MAX_RETRIES} retries`);
      }
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      isSyncing.current = false;
    }
  }, [isAuthenticated, processOperation]);

  // Sync when coming back online
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      console.log("Back online, syncing pending operations...");
      syncPendingOperations();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncPendingOperations]);

  // Periodic sync check
  useEffect(() => {
    if (!isAuthenticated) return;

    const startPeriodicSync = () => {
      syncTimeoutRef.current = setInterval(() => {
        if (navigator.onLine) {
          syncPendingOperations();
        }
      }, SYNC_INTERVAL_MS);
    };

    // Initial sync
    if (navigator.onLine) {
      syncPendingOperations();
    }

    startPeriodicSync();

    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, [isAuthenticated, syncPendingOperations]);

  // Queue operation for sync
  const queueOperation = useCallback(
    async (
      type: "create" | "update" | "delete",
      entity: "note" | "notebook",
      entityId: string,
      data: NotePayload | NotebookPayload | null
    ) => {
      await addToPendingSync({ type, entity, entityId, data });
      
      // Attempt immediate sync if online
      if (navigator.onLine && isAuthenticated) {
        syncPendingOperations();
      }
    },
    [isAuthenticated, syncPendingOperations]
  );

  return {
    syncNow: syncPendingOperations,
    queueOperation,
    isSyncing: isSyncing.current,
  };
}

export default useSyncManager;
