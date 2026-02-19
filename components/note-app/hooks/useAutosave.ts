import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { NotePayload } from "@/types/note";
import { saveDraft, getDraft, deleteDraft } from "@/lib/indexeddb";

const AUTOSAVE_DELAY_MS = 2_000;

/**
 * Debounced autosave of the current note to IndexedDB.
 *
 * - Saves a draft 2 seconds after the last edit.
 * - On editor open, checks for an existing draft and restores it via `onRestore`.
 * - Call `clearDraft` after a successful server/local save to remove the draft.
 */
export function useAutosave(
  currentNote: NotePayload | null,
  {
    onRestore,
  }: {
    onRestore: (note: NotePayload) => void;
  }
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredIdsRef = useRef(new Set<string>());

  // Restore draft on editor open
  useEffect(() => {
    if (!currentNote) return;

    const noteId = currentNote.id;

    // Only attempt restore once per note open
    if (restoredIdsRef.current.has(noteId)) return;
    restoredIdsRef.current.add(noteId);

    getDraft(noteId).then((draft) => {
      if (draft && draft.updatedAt > currentNote.updatedAt) {
        onRestore(draft);
        toast.info("Draft restored", {
          description: "Your unsaved changes have been recovered.",
        });
      }
    }).catch((err) => {
      console.error("Failed to check for draft", err);
    });
  }, [currentNote, onRestore]);

  // Clear tracked IDs when editor closes
  useEffect(() => {
    if (!currentNote) {
      restoredIdsRef.current.clear();
    }
  }, [currentNote]);

  // Debounced save to IndexedDB
  useEffect(() => {
    if (!currentNote) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      saveDraft({
        ...currentNote,
        updatedAt: new Date().toISOString(),
      }).catch((err) => {
        console.error("Draft autosave failed", err);
      });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [currentNote]);

  const clearDraft = (noteId: string) => {
    deleteDraft(noteId).catch((err) => {
      console.error("Failed to clear draft", err);
    });
  };

  return { clearDraft };
}
