import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { NotePayload } from "@/types/note";
import {
  getAllNotes,
  saveNotes as saveNotesToDB,
  migrateFromLocalStorage,
  isIndexedDBAvailable,
  getUserNotes,
  saveUserNotes,
} from "@/lib/indexeddb";

// Cache keys for stale-while-revalidate pattern
const CACHE_TIMESTAMP_PREFIX = "last-server-fetch-";
const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data older than this triggers background refresh

type ServerActions = {
  fetchNotesFromServer: () => Promise<NotePayload[]>;
};

export function useNoteData(
  isAuthenticated: boolean,
  storageKey: string,
  serverActions: ServerActions,
  userId?: string | null
) {
  const { fetchNotesFromServer } = serverActions;
  const [notes, setNotes] = useState<NotePayload[]>([]);
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
  const fetchFromServer = useCallback(async (): Promise<NotePayload[]> => {
    const remoteNotes = await fetchNotesFromServer();

    if (useIndexedDB && userId) {
      await saveUserNotes(userId, remoteNotes);
      setCacheTimestamp(userId);
    }

    return remoteNotes;
  }, [fetchNotesFromServer, useIndexedDB, userId, setCacheTimestamp]);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isAuthenticated && userId) {
        // Stale-while-revalidate for authenticated users.
        let hasCachedData = false;

        if (useIndexedDB && !initialLoadComplete.current) {
          try {
            const cachedNotes = await getUserNotes(userId);

            if (cachedNotes.length > 0) {
              setNotes(cachedNotes);
              hasCachedData = true;

              const lastFetch = getCacheTimestamp(userId);
              const isStale = !lastFetch || (Date.now() - lastFetch) > STALE_TIME;

              if (isStale) {
                setIsLoading(false);
                fetchFromServer()
                  .then((freshNotes) => {
                    setNotes(freshNotes);
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
          setNotes(freshNotes);
        }
      } else if (typeof window !== "undefined") {
        // Guest users: load from IndexedDB (with localStorage migration).
        if (useIndexedDB) {
          const migrated = await migrateFromLocalStorage(storageKey);

          if (migrated.notes.length > 0) {
            setNotes(migrated.notes);
          } else {
            const dbNotes = await getAllNotes();
            setNotes(dbNotes);
          }
        } else if (window.localStorage) {
          const rawNotes = window.localStorage.getItem(storageKey);
          setNotes(rawNotes ? JSON.parse(rawNotes) : []);
        } else {
          setNotes([]);
        }
      } else {
        setNotes([]);
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
        setNotes([]);
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

  // Persist notes to local storage/IndexedDB (debounced to avoid excessive writes)
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

        if (useIndexedDB) {
          if (isAuthenticated && userId) {
            await saveUserNotes(userId, notes);
          } else {
            await saveNotesToDB(notes);
          }
        } else if (!isAuthenticated && window.localStorage) {
          window.localStorage.setItem(storageKey, JSON.stringify(notes));
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
  }, [notes, isLoading, isAuthenticated, userId, storageKey, useIndexedDB]);

  const forceRefresh = useCallback(async () => {
    if (!isAuthenticated) {
      return loadNotes();
    }

    setIsLoading(true);
    setError(null);
    try {
      const freshNotes = await fetchFromServer();
      setNotes(freshNotes);
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
    notes,
    setNotes,
    isLoading,
    error,
    retry: loadNotes,
    forceRefresh,
  };
}
