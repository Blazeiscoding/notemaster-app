"use client";

import { WifiOff, CloudOff, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBackgroundSync } from "@/components/note-app/hooks/useBackgroundSync";

type OfflineIndicatorProps = {
  className?: string;
};

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const { syncStatus, pendingCount, isConnected, triggerSync } = useBackgroundSync();
  const showBanner =
    !isConnected ||
    pendingCount > 0 ||
    syncStatus === "syncing" ||
    syncStatus === "synced";

  if (!showBanner) return null;

  const handleSyncClick = () => {
    if (isConnected && pendingCount > 0) {
      triggerSync();
    }
  };

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 z-50 -translate-x-1/2 transform",
        "animate-in slide-in-from-top-2 fade-in duration-300",
        className
      )}
    >
      <button
        onClick={handleSyncClick}
        disabled={!isConnected || syncStatus === "syncing"}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 shadow-lg backdrop-blur-sm",
          "border transition-all duration-300",
          "disabled:cursor-default",
          isConnected && pendingCount > 0 && "hover:scale-105 cursor-pointer",
          !isConnected && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
          isConnected && pendingCount > 0 && syncStatus !== "syncing" && "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
          syncStatus === "syncing" && "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
          syncStatus === "synced" && pendingCount === 0 && "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300"
        )}
      >
        {!isConnected && (
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

        {isConnected && syncStatus === "syncing" && (
          <>
            <RefreshCw className="size-4 animate-spin" />
            <span className="text-sm font-medium">Syncing...</span>
          </>
        )}

        {isConnected && syncStatus === "synced" && pendingCount === 0 && (
          <>
            <Check className="size-4" />
            <span className="text-sm font-medium">All synced</span>
          </>
        )}

        {isConnected && pendingCount > 0 && syncStatus !== "syncing" && syncStatus !== "synced" && (
          <>
            <CloudOff className="size-4" />
            <span className="text-sm font-medium">
              {pendingCount} pending
            </span>
            <span className="text-xs opacity-75">
              (tap to sync)
            </span>
          </>
        )}
      </button>
    </div>
  );
}

export default OfflineIndicator;
