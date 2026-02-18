import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import type { NotePayload, NotebookPayload } from "@/types/note";
import {
  getAllNotes,
  getAllNotebooks,
  saveNotes as saveNotesToDB,
  saveNotebooks as saveNotebooksToDB,
  migrateFromLocalStorage,
  isIndexedDBAvailable,
  getUserNotes,
  getUserNotebooks,
  saveUserNotes,
  saveUserNotebooks,
} from "@/lib/indexeddb";

// Cache keys for stale-while-revalidate pattern
const CACHE_TIMESTAMP_PREFIX = "last-server-fetch-";
const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data older than this triggers background refresh

type ServerActions = {
  fetchNotesFromServer: () => Promise<NotePayload[]>;
  fetchNotebooksFromServer: () => Promise<NotebookPayload[]>;
};

export function useNoteData(
  isAuthenticated: boolean,
  storageKey: string,
  serverActions: ServerActions,
  userId?: string | null
) {
  const { fetchNotesFromServer, fetchNotebooksFromServer } = serverActions;
  const [notes, setNotes] = useState<NotePayload[]>([]);
  const [notebooks, setNotebooks] = useState<NotebookPayload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useIndexedDB, setUseIndexedDB] = useState(true);
  const initialLoadComplete = useRef(false);
  const isRevalidating = useRef(false);

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

  // Background fetch from server (for stale-while-revalidate)
  const fetchFromServer = useCallback(async (): Promise<{
    notes: NotePayload[];
    notebooks: NotebookPayload[];
  }> => {
    const [remoteNotes, remoteNotebooks] = await Promise.all([
      fetchNotesFromServer(),
      fetchNotebooksFromServer(),
    ]);
    
    // Cache the fresh data to IndexedDB for next time
    if (useIndexedDB && userId) {
      await Promise.all([
        saveUserNotes(userId, remoteNotes),
        saveUserNotebooks(userId, remoteNotebooks),
      ]);
      setCacheTimestamp(userId);
    }
    
    return { notes: remoteNotes, notebooks: remoteNotebooks };
  }, [fetchNotesFromServer, fetchNotebooksFromServer, useIndexedDB, userId, setCacheTimestamp]);

  const loadNotesAndNotebooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isAuthenticated && userId) {
        // Stale-while-revalidate pattern for authenticated users:
        // 1. Show cached data immediately if available
        // 2. Fetch fresh data in background if cache is stale
        // 3. Update UI when fresh data arrives
        
        let hasCachedData = false;
        
        if (useIndexedDB && !initialLoadComplete.current) {
          try {
            const [cachedNotes, cachedNotebooks] = await Promise.all([
              getUserNotes(userId),
              getUserNotebooks(userId),
            ]);
            
            if (cachedNotes.length > 0 || cachedNotebooks.length > 0) {
              // Show cached data immediately
              setNotes(cachedNotes);
              setNotebooks(cachedNotebooks);
              hasCachedData = true;
              
              // Check if cache is stale
              const lastFetch = getCacheTimestamp(userId);
              const isStale = !lastFetch || (Date.now() - lastFetch) > STALE_TIME;
              
              if (isStale) {
                // Fetch fresh data in background (don't show loading state)
                setIsLoading(false);
                isRevalidating.current = true;
                fetchFromServer()
                  .then(({ notes: freshNotes, notebooks: freshNotebooks }) => {
                    setNotes(freshNotes);
                    setNotebooks(freshNotebooks);
                    isRevalidating.current = false;
                  })
                  .catch((err) => {
                    console.error("Background refresh failed:", err);
                    isRevalidating.current = false;
                    // Silent fail - we already have cached data
                  });
                initialLoadComplete.current = true;
                return;
              }
            }
          } catch {
            // Cache read failed, continue to fetch from server
          }
        }
        
        // No cache or cache is fresh, fetch from server
        if (!hasCachedData) {
          const { notes: freshNotes, notebooks: freshNotebooks } = await fetchFromServer();
          setNotes(freshNotes);
          setNotebooks(freshNotebooks);
        }
      } else if (typeof window !== "undefined") {
        // Guest users: load from IndexedDB (with localStorage migration)
        if (useIndexedDB) {
          // First, try to migrate from localStorage if not done yet
          const migrated = await migrateFromLocalStorage(storageKey);
          
          if (migrated.notes.length > 0 || migrated.notebooks.length > 0) {
            // Use migrated data
            setNotes(migrated.notes);
            setNotebooks(migrated.notebooks);
          } else {
            // Load from IndexedDB
            const [dbNotes, dbNotebooks] = await Promise.all([
              getAllNotes(),
              getAllNotebooks(),
            ]);
            setNotes(dbNotes);
            setNotebooks(dbNotebooks);
          }
        } else if (window.localStorage) {
          // Fallback to localStorage
          const rawNotes = window.localStorage.getItem(storageKey);
          const rawNotebooks = window.localStorage.getItem(
            `${storageKey}-notebooks`
          );
          setNotes(rawNotes ? JSON.parse(rawNotes) : []);
          setNotebooks(rawNotebooks ? JSON.parse(rawNotebooks) : []);
        } else {
          setNotes([]);
          setNotebooks([]);
        }
      } else {
        setNotes([]);
        setNotebooks([]);
      }
      initialLoadComplete.current = true;
    } catch (error) {
      console.error("Failed to load workspace", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load your notes. Please refresh the page.";
      setError(errorMessage);
      if (isAuthenticated) {
        toast.error("Failed to load your notes. Please refresh the page.");
      } else {
        setNotes([]);
        setNotebooks([]);
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
    loadNotesAndNotebooks();
  }, [loadNotesAndNotebooks]);

  // Persist notes to local storage/IndexedDB (debounced to avoid excessive writes)
  // For guests: this is their primary storage
  // For authenticated users: this is cache for stale-while-revalidate
  const notesPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Don't persist during initial load
    if (!initialLoadComplete.current || isLoading) {
      return;
    }

    // Clear any pending persist
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
          // localStorage fallback only for guests
          window.localStorage.setItem(storageKey, JSON.stringify(notes));
        }
      } catch (err) {
        console.error("Failed to save notes:", err);
        if (!isAuthenticated) {
          toast.error("Failed to save notes locally");
        }
      }
    }, 500); // Debounce: batch writes within 500ms

    return () => {
      if (notesPersistTimer.current) {
        clearTimeout(notesPersistTimer.current);
      }
    };
  }, [notes, isLoading, isAuthenticated, userId, storageKey, useIndexedDB]);

  // Persist notebooks to local storage/IndexedDB (debounced)
  const notebooksPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    // Don't persist during initial load
    if (!initialLoadComplete.current || isLoading) {
      return;
    }

    // Clear any pending persist
    if (notebooksPersistTimer.current) {
      clearTimeout(notebooksPersistTimer.current);
    }

    notebooksPersistTimer.current = setTimeout(async () => {
      try {
        if (typeof window === "undefined") return;

        if (useIndexedDB) {
          if (isAuthenticated && userId) {
            await saveUserNotebooks(userId, notebooks);
          } else {
            await saveNotebooksToDB(notebooks);
          }
        } else if (!isAuthenticated && window.localStorage) {
          // localStorage fallback only for guests
          window.localStorage.setItem(
            `${storageKey}-notebooks`,
            JSON.stringify(notebooks)
          );
        }
      } catch (err) {
        console.error("Failed to save notebooks:", err);
        if (!isAuthenticated) {
          toast.error("Failed to save notebooks locally");
        }
      }
    }, 500); // Debounce: batch writes within 500ms

    return () => {
      if (notebooksPersistTimer.current) {
        clearTimeout(notebooksPersistTimer.current);
      }
    };
  }, [notebooks, isAuthenticated, userId, storageKey, useIndexedDB, isLoading]);

  // Force refresh function that bypasses cache
  const forceRefresh = useCallback(async () => {
    if (!isAuthenticated) {
      return loadNotesAndNotebooks();
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const { notes: freshNotes, notebooks: freshNotebooks } = await fetchFromServer();
      setNotes(freshNotes);
      setNotebooks(freshNotebooks);
    } catch (error) {
      console.error("Failed to refresh workspace", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to refresh your notes. Please try again.";
      setError(errorMessage);
      toast.error("Failed to refresh your notes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, fetchFromServer, loadNotesAndNotebooks]);

  return {
    notes,
    setNotes,
    notebooks,
    setNotebooks,
    isLoading,
    error,
    retry: loadNotesAndNotebooks,
    forceRefresh,
  };
}
