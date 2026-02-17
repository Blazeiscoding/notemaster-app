"use client";

import { useEffect, useState, useCallback } from "react";
import {
  initBackgroundSync,
  processSyncQueue,
  isOnline,
} from "@/lib/background-sync";
import { getPendingSyncCount } from "@/lib/indexeddb";

export type SyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

export function useBackgroundSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    isOnline() ? "idle" : "offline"
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [isConnected, setIsConnected] = useState(() => isOnline());

  const markSyncedThenIdle = useCallback(() => {
    setSyncStatus("synced");
    setTimeout(() => setSyncStatus("idle"), 2000);
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    } catch {
      // Ignore errors
    }
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline()) {
      setSyncStatus("offline");
      return;
    }

    setSyncStatus("syncing");
    try {
      const result = await processSyncQueue();
      if (result.remaining === 0) {
        markSyncedThenIdle();
      } else {
        setSyncStatus("idle");
      }
      await updatePendingCount();
    } catch {
      setSyncStatus("error");
    }
  }, [markSyncedThenIdle, updatePendingCount]);

  // Initialize background sync on mount
  useEffect(() => {
    // Initialize background sync listeners
    const cleanup = initBackgroundSync();

    // Update pending count initially
    const initialPendingTimer = setTimeout(() => {
      void updatePendingCount();
    }, 0);

    // Listen for online/offline changes
    const handleOnline = () => {
      setIsConnected(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsConnected(false);
      setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for service worker sync completion messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        markSyncedThenIdle();
        updatePendingCount();
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);

    // Periodic pending count update
    const interval = setInterval(updatePendingCount, 30000);

    return () => {
      clearTimeout(initialPendingTimer);
      cleanup();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, [markSyncedThenIdle, triggerSync, updatePendingCount]);

  return {
    syncStatus,
    pendingCount,
    isConnected,
    triggerSync,
    updatePendingCount,
  };
}
