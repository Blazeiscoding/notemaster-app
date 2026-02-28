import { useCallback } from "react";
import { toast } from "sonner";
import type { NotePayload } from "@/types/note";
import {
  hapticError,
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from "@/lib/haptics";

type NotesState = {
  notes: NotePayload[];
  setNotes: React.Dispatch<React.SetStateAction<NotePayload[]>>;
  currentNote: NotePayload | null;
  setCurrentNote: React.Dispatch<React.SetStateAction<NotePayload | null>>;
};

type ServerActions = {
  updateNoteOnServer: (id: string, updates: Partial<NotePayload>) => Promise<NotePayload>;
  deleteNoteOnServer: (id: string) => Promise<void>;
};

// ---------------------------------------------------------------------------
// Optimistic update helper
// ---------------------------------------------------------------------------

type OptimisticUpdateOptions = {
  /** Fields to merge onto the existing note (optimistic state). */
  updates: Partial<NotePayload>;
  /** Server payload — only the fields that need to be persisted. */
  serverPayload: Partial<NotePayload>;
  /** Toast message on success. */
  successMessage: string;
  /** Haptic feedback function to call after optimistic apply. */
  haptic: () => void;
  /** If true, close the editor when the note being edited matches. */
  closeIfCurrent?: boolean;
};

/**
 * Creates a reusable async function that:
 * 1. Applies an optimistic update to local state
 * 2. Syncs with the server (if authenticated)
 * 3. Rolls back on failure
 */
function makeOptimisticAction(
  { setNotes, currentNote, setCurrentNote }: NotesState,
  isAuthenticated: boolean,
  updateNoteOnServer: ServerActions["updateNoteOnServer"]
) {
  return async (id: string, opts: OptimisticUpdateOptions) => {
    let existing: NotePayload | undefined;

    setNotes((prev) => {
      existing = prev.find((n) => n.id === id);
      if (!existing) return prev;
      const optimistic: NotePayload = {
        ...existing,
        ...opts.updates,
        updatedAt: new Date().toISOString(),
      };
      return prev.map((note) => (note.id === id ? optimistic : note));
    });

    if (!existing) return;
    opts.haptic();

    const wasCurrent = currentNote?.id === id;
    if (opts.closeIfCurrent && wasCurrent) setCurrentNote(null);

    if (isAuthenticated) {
      try {
        const saved = await updateNoteOnServer(id, opts.serverPayload);
        setNotes((prev) =>
          prev.map((note) => (note.id === id ? saved : note))
        );
        toast.success(opts.successMessage);
      } catch (error) {
        console.error(`Failed to ${opts.successMessage.toLowerCase()}`, error);
        const rollback = existing;
        setNotes((prev) =>
          prev.map((note) => (note.id === id ? rollback : note))
        );
        if (opts.closeIfCurrent && wasCurrent) setCurrentNote(rollback);
        toast.error(`Failed to update note. Please try again.`);
      }
    } else {
      toast.success(opts.successMessage);
    }
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotes(
  state: NotesState,
  isAuthenticated: boolean,
  serverActions: ServerActions
) {
  const { notes, setNotes, currentNote, setCurrentNote } = state;
  const { updateNoteOnServer, deleteNoteOnServer } = serverActions;

  const optimisticAction = useCallback(
    (id: string, opts: OptimisticUpdateOptions) =>
      makeOptimisticAction(state, isAuthenticated, updateNoteOnServer)(id, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentNote, isAuthenticated, updateNoteOnServer, setNotes, setCurrentNote]
  );

  const togglePin = useCallback(
    async (id: string) => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      const newPinned = !note.pinned;
      await optimisticAction(id, {
        updates: { pinned: newPinned },
        serverPayload: { pinned: newPinned },
        successMessage: newPinned ? "Note pinned" : "Note unpinned",
        haptic: hapticLight,
      });
    },
    [notes, optimisticAction]
  );

  const archiveNote = useCallback(
    (id: string) =>
      optimisticAction(id, {
        updates: { archived: true, pinned: false },
        serverPayload: { archived: true, pinned: false },
        successMessage: "Note archived",
        haptic: hapticMedium,
      }),
    [optimisticAction]
  );

  const unarchiveNote = useCallback(
    (id: string) =>
      optimisticAction(id, {
        updates: { archived: false },
        serverPayload: { archived: false },
        successMessage: "Note restored",
        haptic: hapticMedium,
      }),
    [optimisticAction]
  );

  const trashNote = useCallback(
    (id: string) =>
      optimisticAction(id, {
        updates: { trashed: true, archived: false, pinned: false },
        serverPayload: { trashed: true, archived: false, pinned: false },
        successMessage: "Note moved to bin",
        haptic: hapticMedium,
        closeIfCurrent: true,
      }),
    [optimisticAction]
  );

  const restoreFromBin = useCallback(
    (id: string) =>
      optimisticAction(id, {
        updates: { trashed: false, archived: false },
        serverPayload: { trashed: false, archived: false },
        successMessage: "Note restored",
        haptic: hapticSuccess,
      }),
    [optimisticAction]
  );

  const deleteForever = useCallback(
    async (id: string) => {
      let existing: NotePayload | undefined;
      let existingIndex = -1;

      setNotes((prev) => {
        existingIndex = prev.findIndex((n) => n.id === id);
        if (existingIndex === -1) return prev;
        existing = prev[existingIndex];
        return prev.filter((n) => n.id !== id);
      });

      if (!existing || existingIndex === -1) return;
      hapticError();

      const wasCurrent = currentNote?.id === id;
      if (wasCurrent) setCurrentNote(null);

      if (isAuthenticated) {
        try {
          await deleteNoteOnServer(id);
          toast.success("Note deleted permanently");
        } catch (error) {
          console.error("Failed to delete note", error);
          const rollback = existing;
          const rollbackIndex = existingIndex;
          setNotes((prev) => {
            const next = [...prev];
            next.splice(rollbackIndex, 0, rollback);
            return next;
          });
          if (wasCurrent) setCurrentNote(rollback);
          toast.error("Failed to delete note. Please try again.");
        }
      } else {
        toast.success("Note deleted permanently");
      }
    },
    [currentNote, isAuthenticated, deleteNoteOnServer, setNotes, setCurrentNote]
  );

  const exportNotes = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(notes, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notemaster-notes-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Notes exported successfully");
    } catch (error) {
      console.error("Failed to export notes", error);
      toast.error("Failed to export notes. Please try again.");
    }
  }, [notes]);

  const importNotes = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          if (Array.isArray(data)) {
            const map = new Map<string, NotePayload>(
              notes.map((n) => [n.id, n])
            );
            for (const n of data) map.set(n.id, n as NotePayload);
            setNotes(Array.from(map.values()));
            toast.success(`Imported ${data.length} note(s)`);
          } else {
            toast.error("Invalid file format. Expected an array of notes.");
          }
        } catch (error) {
          console.error("Failed to import notes", error);
          toast.error("Failed to import notes. Invalid file format.");
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read file. Please try again.");
      };
      reader.readAsText(file);
    },
    [notes, setNotes]
  );

  return {
    togglePin,
    archiveNote,
    unarchiveNote,
    trashNote,
    restoreFromBin,
    deleteForever,
    exportNotes,
    importNotes,
  };
}
