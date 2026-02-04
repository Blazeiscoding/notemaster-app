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
  getMeta,
  setMeta,
} from "@/lib/indexeddb";

// Cache keys for stale-while-revalidate pattern
const CACHE_TIMESTAMP_KEY = "last-server-fetch";
const STALE_TIME = 5 * 60 * 1000; // 5 minutes - data older than this triggers background refresh

type ServerActions = {
  fetchNotesFromServer: () => Promise<NotePayload[]>;
  fetchNotebooksFromServer: () => Promise<NotebookPayload[]>;
};

export function useNoteData(
  isAuthenticated: boolean,
  storageKey: string,
  serverActions: ServerActions
) {
  const { fetchNotesFromServer, fetchNotebooksFromServer } = serverActions;
  const [notes, setNotes] = useState<NotePayload[]>([]);
  const [notebooks, setNotebooks] = useState<NotebookPayload[]>([]);
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
    if (useIndexedDB) {
      await Promise.all([
        saveNotesToDB(remoteNotes),
        saveNotebooksToDB(remoteNotebooks),
        setMeta(CACHE_TIMESTAMP_KEY, Date.now()),
      ]);
    }
    
    return { notes: remoteNotes, notebooks: remoteNotebooks };
  }, [fetchNotesFromServer, fetchNotebooksFromServer, useIndexedDB]);

  const loadNotesAndNotebooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isAuthenticated) {
        // Stale-while-revalidate pattern for authenticated users:
        // 1. Show cached data immediately if available
        // 2. Fetch fresh data in background
        // 3. Update UI when fresh data arrives
        
        let hasCachedData = false;
        
        if (useIndexedDB) {
          // Try to load cached data first for instant display
          const [cachedNotes, cachedNotebooks, lastFetch] = await Promise.all([
            getAllNotes(),
            getAllNotebooks(),
            getMeta<number>(CACHE_TIMESTAMP_KEY),
          ]);
          
          if (cachedNotes.length > 0 || cachedNotebooks.length > 0) {
            // Show cached data immediately
            setNotes(cachedNotes);
            setNotebooks(cachedNotebooks);
            hasCachedData = true;
            initialLoadComplete.current = true;
            
            // Check if cache is stale
            const isStale = !lastFetch || (Date.now() - lastFetch) > STALE_TIME;
            
            if (isStale) {
              // Fetch fresh data in background (don't show loading state)
              setIsLoading(false);
              fetchFromServer()
                .then(({ notes: freshNotes, notebooks: freshNotebooks }) => {
                  setNotes(freshNotes);
                  setNotebooks(freshNotebooks);
                })
                .catch((err) => {
                  console.error("Background refresh failed:", err);
                  // Silent fail - we already have cached data
                });
              return;
            }
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
    storageKey,
    fetchFromServer,
    useIndexedDB,
  ]);

  useEffect(() => {
    loadNotesAndNotebooks();
  }, [loadNotesAndNotebooks]);

  // Persist notes to local storage/IndexedDB
  // For guests: this is their primary storage
  // For authenticated users: this is cache for stale-while-revalidate
  useEffect(() => {
    // Don't persist during initial load
    if (!initialLoadComplete.current || isLoading) {
      return;
    }

    const persistNotes = async () => {
      try {
        if (typeof window === "undefined") return;

        if (useIndexedDB) {
          await saveNotesToDB(notes);
          // Update cache timestamp for authenticated users
          if (isAuthenticated) {
            await setMeta(CACHE_TIMESTAMP_KEY, Date.now());
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
    };

    persistNotes();
  }, [notes, isLoading, isAuthenticated, storageKey, useIndexedDB]);

  // Persist notebooks to local storage/IndexedDB
  useEffect(() => {
    // Don't persist during initial load
    if (!initialLoadComplete.current || isLoading) {
      return;
    }

    const persistNotebooks = async () => {
      try {
        if (typeof window === "undefined") return;

        if (useIndexedDB) {
          await saveNotebooksToDB(notebooks);
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
    };

    persistNotebooks();
  }, [notebooks, isAuthenticated, storageKey, useIndexedDB, isLoading]);

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
