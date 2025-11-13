import { useState, useCallback } from "react";
import type { NotePayload, NoteRevisionPayload } from "@/types/note";

type RevisionsState = {
  notes: NotePayload[];
  setNotes: React.Dispatch<React.SetStateAction<NotePayload[]>>;
  currentNote: NotePayload | null;
  setCurrentNote: React.Dispatch<React.SetStateAction<NotePayload | null>>;
};

type ServerActions = {
  fetchRevisionsFromServer: (id: string) => Promise<NoteRevisionPayload[]>;
};

export function useNoteRevisions(
  { notes, setNotes, currentNote, setCurrentNote }: RevisionsState,
  isAuthenticated: boolean,
  serverActions: ServerActions
) {
  const { fetchRevisionsFromServer } = serverActions;
  const [revisions, setRevisions] = useState<NoteRevisionPayload[]>([]);
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);
  const [revisionTargetId, setRevisionTargetId] = useState<string | null>(null);

  const handleOpenRevisions = useCallback(
    async (noteId: string) => {
      setIsRevisionOpen(true);
      setRevisionTargetId(noteId);
      if (!isAuthenticated) {
        setRevisions([]);
        return;
      }
      setIsLoadingRevisions(true);
      try {
        const history = await fetchRevisionsFromServer(noteId);
        setRevisions(history);
      } catch (error) {
        console.error("Failed to load revisions", error);
        setRevisions([]);
      } finally {
        setIsLoadingRevisions(false);
      }
    },
    [fetchRevisionsFromServer, isAuthenticated]
  );

  const handleCloseRevisions = useCallback(() => {
    setIsRevisionOpen(false);
    setRevisionTargetId(null);
    setRevisions([]);
  }, []);

  const handleRestoreRevision = useCallback(
    async (noteId: string, revisionId: string) => {
      if (!isAuthenticated) return;

      try {
        const response = await fetch(`/api/notes/${noteId}/revisions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revisionId }),
        });

        if (!response.ok) {
          throw new Error("Failed to restore revision");
        }

        const restored = (await response.json()) as NotePayload;
        setNotes((prev) =>
          prev.map((note) => (note.id === restored.id ? restored : note))
        );
        setCurrentNote(restored);
        handleCloseRevisions();
      } catch (error) {
        console.error("Failed to restore revision", error);
      }
    },
    [handleCloseRevisions, isAuthenticated, setNotes, setCurrentNote]
  );

  return {
    revisions,
    isRevisionOpen,
    isLoadingRevisions,
    revisionTargetId,
    handleOpenRevisions,
    handleCloseRevisions,
    handleRestoreRevision,
  };
}

