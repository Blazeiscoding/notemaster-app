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

export function useNotes(
  { notes, setNotes, currentNote, setCurrentNote }: NotesState,
  isAuthenticated: boolean,
  serverActions: ServerActions
) {
  const { updateNoteOnServer, deleteNoteOnServer } = serverActions;

  const togglePin = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

      hapticLight();

      const optimistic: NotePayload = {
        ...existing,
        pinned: !existing.pinned,
        updatedAt: new Date().toISOString(),
      };

      setNotes((prev) =>
        prev.map((note) => (note.id === id ? optimistic : note))
      );

      if (isAuthenticated) {
        try {
          const saved = await updateNoteOnServer(id, {
            pinned: optimistic.pinned,
          });
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? saved : note))
          );
        } catch (error) {
          console.error("Failed to toggle pin", error);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? existing : note))
          );
          toast.error("Failed to update note. Please try again.");
        }
      }
    },
    [notes, isAuthenticated, updateNoteOnServer, setNotes]
  );

  const archiveNote = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

      hapticMedium();

      const optimistic: NotePayload = {
        ...existing,
        archived: true,
        pinned: false,
        updatedAt: new Date().toISOString(),
      };

      setNotes((prev) =>
        prev.map((note) => (note.id === id ? optimistic : note))
      );

      if (isAuthenticated) {
        try {
          const saved = await updateNoteOnServer(id, {
            archived: true,
            pinned: false,
          });
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? saved : note))
          );
        } catch (error) {
          console.error("Failed to archive note", error);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? existing : note))
          );
          toast.error("Failed to archive note. Please try again.");
        }
      }
    },
    [notes, isAuthenticated, updateNoteOnServer, setNotes]
  );

  const unarchiveNote = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

      hapticMedium();

      const optimistic: NotePayload = {
        ...existing,
        archived: false,
        updatedAt: new Date().toISOString(),
      };

      setNotes((prev) =>
        prev.map((note) => (note.id === id ? optimistic : note))
      );

      if (isAuthenticated) {
        try {
          const saved = await updateNoteOnServer(id, {
            archived: false,
          });
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? saved : note))
          );
        } catch (error) {
          console.error("Failed to unarchive note", error);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? existing : note))
          );
          toast.error("Failed to unarchive note. Please try again.");
        }
      }
    },
    [notes, isAuthenticated, updateNoteOnServer, setNotes]
  );

  const trashNote = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

      hapticMedium();

      const optimistic: NotePayload = {
        ...existing,
        trashed: true,
        archived: false,
        pinned: false,
        updatedAt: new Date().toISOString(),
      };

      const wasCurrent = currentNote?.id === id;

      setNotes((prev) =>
        prev.map((note) => (note.id === id ? optimistic : note))
      );
      if (wasCurrent) setCurrentNote(null);

      if (isAuthenticated) {
        try {
          const saved = await updateNoteOnServer(id, {
            trashed: true,
            archived: false,
            pinned: false,
          });
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? saved : note))
          );
        } catch (error) {
          console.error("Failed to move note to bin", error);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? existing : note))
          );
          if (wasCurrent) setCurrentNote(existing);
          toast.error("Failed to move note to bin. Please try again.");
        }
      }
    },
    [notes, currentNote, isAuthenticated, updateNoteOnServer, setNotes, setCurrentNote]
  );

  const restoreFromBin = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

      hapticSuccess();

      const optimistic: NotePayload = {
        ...existing,
        trashed: false,
        archived: false,
        updatedAt: new Date().toISOString(),
      };

      setNotes((prev) =>
        prev.map((note) => (note.id === id ? optimistic : note))
      );

      if (isAuthenticated) {
        try {
          const saved = await updateNoteOnServer(id, {
            trashed: false,
            archived: false,
          });
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? saved : note))
          );
        } catch (error) {
          console.error("Failed to restore note", error);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? existing : note))
          );
          toast.error("Failed to restore note. Please try again.");
        }
      }
    },
    [notes, isAuthenticated, updateNoteOnServer, setNotes]
  );

  const deleteForever = useCallback(
    async (id: string) => {
      const index = notes.findIndex((n) => n.id === id);
      if (index === -1) return;
      const existing = notes[index];
      const wasCurrent = currentNote?.id === id;

      hapticError();

      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (wasCurrent) setCurrentNote(null);

      if (isAuthenticated) {
        try {
          await deleteNoteOnServer(id);
        } catch (error) {
          console.error("Failed to delete note", error);
          setNotes((prev) => {
            const next = [...prev];
            next.splice(index, 0, existing);
            return next;
          });
          if (wasCurrent) setCurrentNote(existing);
          toast.error("Failed to delete note. Please try again.");
        }
      }
    },
    [notes, currentNote, isAuthenticated, deleteNoteOnServer, setNotes, setCurrentNote]
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

