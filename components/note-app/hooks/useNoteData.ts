import { useState, useEffect, useCallback } from "react";
import type { NotePayload, NotebookPayload } from "@/types/note";

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

  const loadNotesAndNotebooks = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated) {
        const [remoteNotes, remoteNotebooks] = await Promise.all([
          fetchNotesFromServer(),
          fetchNotebooksFromServer(),
        ]);
        setNotes(remoteNotes);
        setNotebooks(remoteNotebooks);
      } else if (typeof window !== "undefined" && window.localStorage) {
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
    } catch (error) {
      console.error("Failed to load workspace", error);
      if (!isAuthenticated) {
        setNotes([]);
        setNotebooks([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated,
    storageKey,
    fetchNotesFromServer,
    fetchNotebooksFromServer,
  ]);

  useEffect(() => {
    loadNotesAndNotebooks();
  }, [loadNotesAndNotebooks]);

  // Persist notes for guest users
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(storageKey, JSON.stringify(notes));
        }
      } catch (err) {
        console.error("Failed to save notes:", err);
      }
    }
  }, [notes, isLoading, isAuthenticated, storageKey]);

  // Persist notebooks for guest users
  useEffect(() => {
    if (!isAuthenticated && typeof window !== "undefined") {
      try {
        window.localStorage?.setItem(
          `${storageKey}-notebooks`,
          JSON.stringify(notebooks)
        );
      } catch (error) {
        console.error("Failed to save notebooks", error);
      }
    }
  }, [notebooks, isAuthenticated, storageKey]);

  return {
    notes,
    setNotes,
    notebooks,
    setNotebooks,
    isLoading,
  };
}

