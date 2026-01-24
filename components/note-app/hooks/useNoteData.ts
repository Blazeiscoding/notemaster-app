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

  const loadNotesAndNotebooks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isAuthenticated && userId) {
        // Stale-while-revalidate for authenticated users
        // Step 1: Load cached data immediately (if available)
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
              setIsLoading(false);
              isRevalidating.current = true;
            }
          } catch {
            // Cache read failed, continue to fetch from server
          }
        }

        // Step 2: Fetch fresh data from server (in background if we showed cache)
        const [remoteNotes, remoteNotebooks] = await Promise.all([
          fetchNotesFromServer(),
          fetchNotebooksFromServer(),
        ]);
        setNotes(remoteNotes);
        setNotebooks(remoteNotebooks);

        // Step 3: Update cache with fresh data
        if (useIndexedDB) {
          try {
            await Promise.all([
              saveUserNotes(userId, remoteNotes),
              saveUserNotebooks(userId, remoteNotebooks),
            ]);
          } catch {
            // Cache write failed, not critical
          }
        }
        isRevalidating.current = false;
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
    fetchNotesFromServer,
    fetchNotebooksFromServer,
    useIndexedDB,
  ]);

  useEffect(() => {
    loadNotesAndNotebooks();
  }, [loadNotesAndNotebooks]);

  // Persist notes for guest users
  useEffect(() => {
    // Don't persist during initial load or for authenticated users
    if (isAuthenticated || !initialLoadComplete.current || isLoading) {
      return;
    }

    const persistNotes = async () => {
      try {
        if (typeof window === "undefined") return;

        if (useIndexedDB) {
          await saveNotesToDB(notes);
        } else if (window.localStorage) {
          window.localStorage.setItem(storageKey, JSON.stringify(notes));
        }
      } catch (err) {
        console.error("Failed to save notes:", err);
        toast.error("Failed to save notes locally");
      }
    };

    persistNotes();
  }, [notes, isLoading, isAuthenticated, storageKey, useIndexedDB]);

  // Persist notebooks for guest users
  useEffect(() => {
    // Don't persist during initial load or for authenticated users
    if (isAuthenticated || !initialLoadComplete.current || isLoading) {
      return;
    }

    const persistNotebooks = async () => {
      try {
        if (typeof window === "undefined") return;

        if (useIndexedDB) {
          await saveNotebooksToDB(notebooks);
        } else if (window.localStorage) {
          window.localStorage.setItem(
            `${storageKey}-notebooks`,
            JSON.stringify(notebooks)
          );
        }
      } catch (err) {
        console.error("Failed to save notebooks:", err);
        toast.error("Failed to save notebooks locally");
      }
    };

    persistNotebooks();
  }, [notebooks, isAuthenticated, storageKey, useIndexedDB, isLoading]);

  return {
    notes,
    setNotes,
    notebooks,
    setNotebooks,
    isLoading,
    error,
    retry: loadNotesAndNotebooks,
  };
}

