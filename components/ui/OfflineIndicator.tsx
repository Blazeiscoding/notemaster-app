"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, CloudOff, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPendingSyncCount } from "@/lib/indexeddb";

type SyncStatus = "online" | "offline" | "syncing" | "synced";

type OfflineIndicatorProps = {
  className?: string;
};

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("online");
  const [showBanner, setShowBanner] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus("syncing");
      // Trigger sync when back online
      setTimeout(() => setSyncStatus("synced"), 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
    };

    // Initial state
    setIsOnline(navigator.onLine);
    setSyncStatus(navigator.onLine ? "online" : "offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Monitor pending sync count
  useEffect(() => {
    const checkPending = async () => {
      try {
        const count = await getPendingSyncCount();
        setPendingCount(count);
      } catch {
        // IndexedDB might not be available
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Show banner when offline or syncing
  useEffect(() => {
    if (!isOnline || pendingCount > 0) {
      setShowBanner(true);
    } else if (syncStatus === "synced") {
      // Hide after showing "synced" briefly
      const timer = setTimeout(() => setShowBanner(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setShowBanner(false);
    }
  }, [isOnline, pendingCount, syncStatus]);

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 z-50 -translate-x-1/2 transform",
        "animate-in slide-in-from-top-2 fade-in duration-300",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 shadow-lg backdrop-blur-sm",
          "border transition-colors duration-300",
          !isOnline && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
          isOnline && pendingCount > 0 && "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
          syncStatus === "synced" && "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
        )}
      >
        {!isOnline && (
          <>
            <WifiOff className="size-4" />
            <span className="text-sm font-medium">You&apos;re offline</span>
            {pendingCount > 0 && (
              <span className="text-xs opacity-75">
                ({pendingCount} pending)
              </span>
            )}
          </>
        )}

        {isOnline && syncStatus === "syncing" && (
          <>
            <RefreshCw className="size-4 animate-spin" />
            <span className="text-sm font-medium">Syncing...</span>
          </>
        )}

        {isOnline && syncStatus === "synced" && pendingCount === 0 && (
          <>
            <Check className="size-4" />
            <span className="text-sm font-medium">All synced</span>
          </>
        )}

        {isOnline && pendingCount > 0 && syncStatus !== "syncing" && (
          <>
            <CloudOff className="size-4" />
            <span className="text-sm font-medium">
              {pendingCount} changes pending
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default OfflineIndicator;
