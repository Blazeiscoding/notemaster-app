import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { NoteSummaryPayload } from "@/types/note";
import { deriveNoteSummary } from "@/types/note";
import {
  getAllNotes,
  migrateFromLocalStorage,
  isIndexedDBAvailable,
  getUserNoteSummaries,
  saveUserNoteSummaries,
} from "@/lib/indexeddb";

// Cache keys for stale-while-revalidate pattern
const CACHE_TIMESTAMP_PREFIX = "last-server-fetch-";
const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data older than this triggers background refresh

type ServerActions = {
  fetchNoteSummariesFromServer: () => Promise<NoteSummaryPayload[]>;
};

export function useNoteData(
  isAuthenticated: boolean,
  storageKey: string,
  serverActions: ServerActions,
  userId?: string | null
) {
  const { fetchNoteSummariesFromServer } = serverActions;
  const [noteSummaries, setNoteSummaries] = useState<NoteSummaryPayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useIndexedDB, setUseIndexedDB] = useState(true);
  const initialLoadComplete = useRef(false);

  // Check IndexedDB availability on mount
  useEffect(() => {
    isIndexedDBAvailable().then((available) => {
      setUseIndexedDB(available);
      if (!available) {
        console.warn("IndexedDB not available, falling back to localStorage");
      }
    });
  }, []);

  // Get cache timestamp from localStorage (simple and reliable)
  const getCacheTimestamp = useCallback((uid: string): number | null => {
    if (typeof window === "undefined") return null;
    const ts = localStorage.getItem(`${CACHE_TIMESTAMP_PREFIX}${uid}`);
    return ts ? parseInt(ts, 10) : null;
  }, []);

  const setCacheTimestamp = useCallback((uid: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${CACHE_TIMESTAMP_PREFIX}${uid}`, Date.now().toString());
  }, []);

  // Fetch and cache server data
  const fetchFromServer = useCallback(async (): Promise<NoteSummaryPayload[]> => {
    const remoteSummaries = await fetchNoteSummariesFromServer();

    if (useIndexedDB && userId) {
      await saveUserNoteSummaries(userId, remoteSummaries);
      setCacheTimestamp(userId);
    }

    return remoteSummaries;
  }, [fetchNoteSummariesFromServer, useIndexedDB, userId, setCacheTimestamp]);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isAuthenticated && userId) {
        // Stale-while-revalidate for authenticated users.
        let hasCachedData = false;

        if (useIndexedDB && !initialLoadComplete.current) {
          try {
            const cachedSummaries = await getUserNoteSummaries(userId);

            if (cachedSummaries.length > 0) {
              setNoteSummaries(cachedSummaries);
              hasCachedData = true;

              const lastFetch = getCacheTimestamp(userId);
              const isStale = !lastFetch || (Date.now() - lastFetch) > STALE_TIME;

              if (isStale) {
                setIsLoading(false);
                fetchFromServer()
                  .then((freshNotes) => {
                    setNoteSummaries(freshNotes);
                  })
                  .catch((err) => {
                    console.error("Background refresh failed:", err);
                  });
                initialLoadComplete.current = true;
                return;
              }
            }
          } catch {
            // Cache read failed, continue to fetch from server.
          }
        }

        if (!hasCachedData) {
          const freshNotes = await fetchFromServer();
          setNoteSummaries(freshNotes);
        }
      } else if (typeof window !== "undefined") {
        // Guest users: load from IndexedDB (with localStorage migration).
        if (useIndexedDB) {
          const migrated = await migrateFromLocalStorage(storageKey);

          if (migrated.notes.length > 0) {
            setNoteSummaries(migrated.notes.map(deriveNoteSummary));
          } else {
            const dbNotes = await getAllNotes();
            setNoteSummaries(dbNotes.map(deriveNoteSummary));
          }
        } else if (window.localStorage) {
          const rawNotes = window.localStorage.getItem(storageKey);
          const localNotes = rawNotes ? JSON.parse(rawNotes) : [];
          setNoteSummaries(
            Array.isArray(localNotes) ? localNotes.map(deriveNoteSummary) : []
          );
        } else {
          setNoteSummaries([]);
        }
      } else {
        setNoteSummaries([]);
      }

      initialLoadComplete.current = true;
    } catch (error) {
      console.error("Failed to load notes", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load your notes. Please refresh the page.";
      setError(errorMessage);

      if (isAuthenticated) {
        toast.error("Failed to load your notes. Please refresh the page.");
      } else {
        setNoteSummaries([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated,
    userId,
    storageKey,
    fetchFromServer,
    useIndexedDB,
    getCacheTimestamp,
  ]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Persist authenticated summaries to IndexedDB (debounced to avoid excessive writes)
  const notesPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!initialLoadComplete.current || isLoading) {
      return;
    }

    if (notesPersistTimer.current) {
      clearTimeout(notesPersistTimer.current);
    }

    notesPersistTimer.current = setTimeout(async () => {
      try {
        if (typeof window === "undefined") return;

        if (useIndexedDB && isAuthenticated && userId) {
          await saveUserNoteSummaries(userId, noteSummaries);
        }
      } catch (err) {
        console.error("Failed to save notes:", err);
        if (!isAuthenticated) {
          toast.error("Failed to save notes locally");
        }
      }
    }, 500);

    return () => {
      if (notesPersistTimer.current) {
        clearTimeout(notesPersistTimer.current);
      }
    };
  }, [noteSummaries, isLoading, isAuthenticated, userId, useIndexedDB]);

  const forceRefresh = useCallback(async () => {
    if (!isAuthenticated) {
      return loadNotes();
    }

    setIsLoading(true);
    setError(null);
    try {
      const freshNotes = await fetchFromServer();
      setNoteSummaries(freshNotes);
    } catch (error) {
      console.error("Failed to refresh notes", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to refresh your notes. Please try again.";
      setError(errorMessage);
      toast.error("Failed to refresh your notes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchFromServer, loadNotes]);

  return {
    notes: noteSummaries,
    setNotes: setNoteSummaries,
    isLoading,
    error,
    retry: loadNotes,
    forceRefresh,
  };
}
