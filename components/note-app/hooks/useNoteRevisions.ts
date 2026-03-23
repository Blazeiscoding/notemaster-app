import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { NotePayload, NoteRevisionPayload } from "@/types/note";
import { apiRequest } from "@/lib/api-client";

type RevisionsState = {
  setNotes: React.Dispatch<React.SetStateAction<NotePayload[]>>;
  setCurrentNote: React.Dispatch<React.SetStateAction<NotePayload | null>>;
};

type ServerActions = {
  fetchRevisionsFromServer: (id: string) => Promise<NoteRevisionPayload[]>;
};

export function useNoteRevisions(
  { setNotes, setCurrentNote }: RevisionsState,
  isAuthenticated: boolean, 
  serverActions: ServerActions
) {
  const { fetchRevisionsFromServer } = serverActions;
  const [revisions, setRevisions] = useState<NoteRevisionPayload[]>([]);
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);
  const [isRestoringRevision, setIsRestoringRevision] = useState(false);
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
        toast.error("Failed to load revision history");
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
        setIsRestoringRevision(true);
        const restored = await apiRequest<NotePayload>(
          `/api/notes/${noteId}/revisions`,
          {
            method: "POST",
            body: JSON.stringify({ revisionId }),
          }
        );
        setNotes((prev) =>
          prev.map((note) => (note.id === restored.id ? restored : note))
        );
        setCurrentNote(restored);
        handleCloseRevisions();
        toast.success("Revision restored");
      } catch (error) {
        console.error("Failed to restore revision", error);
        toast.error("Failed to restore revision. Please try again.");
      } finally {
        setIsRestoringRevision(false);
      }
    },
    [handleCloseRevisions, isAuthenticated, setNotes, setCurrentNote]
  );

  return {
    revisions,
    isRevisionOpen,
    isLoadingRevisions,
    isRestoringRevision,
    revisionTargetId,
    handleOpenRevisions,
    handleCloseRevisions,
    handleRestoreRevision,
  };
}

