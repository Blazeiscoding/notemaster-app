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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [isConnected, setIsConnected] = useState(true);

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
        setSyncStatus("synced");
      } else {
        setSyncStatus("idle");
      }
      await updatePendingCount();
    } catch {
      setSyncStatus("error");
    }
  }, [updatePendingCount]);

  // Initialize background sync on mount
  useEffect(() => {
    // Set initial online status
    setIsConnected(isOnline());

    // Initialize background sync listeners
    const cleanup = initBackgroundSync();

    // Update pending count initially
    updatePendingCount();

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
        setSyncStatus("synced");
        updatePendingCount();
        // Reset to idle after a short delay
        setTimeout(() => setSyncStatus("idle"), 2000);
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);

    // Periodic pending count update
    const interval = setInterval(updatePendingCount, 30000);

    return () => {
      cleanup();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, [triggerSync, updatePendingCount]);

  return {
    syncStatus,
    pendingCount,
    isConnected,
    triggerSync,
    updatePendingCount,
  };
}
