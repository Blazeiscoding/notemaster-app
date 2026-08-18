import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { NotePayload } from "@/types/note";
import { saveDraft, getDraft, deleteDraft } from "@/lib/indexeddb";

const AUTOSAVE_DELAY_MS = 2_000;

/**
 * Serialize the fields a user can edit, so drafts are compared by content
 * rather than by `updatedAt` (which the autosave itself rewrites).
 */
export function snapshotNote(note: NotePayload): string {
  return JSON.stringify([
    note.title,
    note.content,
    note.tags,
    note.checklist,
    note.attachments,
    note.dueAt,
    note.pinned,
    note.archived,
    note.trashed,
  ]);
}

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
  /** Snapshot of each note as it was opened, to detect real edits. */
  const baselineRef = useRef(new Map<string, string>());

  // Restore draft on editor open
  useEffect(() => {
    if (!currentNote) return;

    const noteId = currentNote.id;

    // Only attempt restore once per note open
    if (restoredIdsRef.current.has(noteId)) return;
    restoredIdsRef.current.add(noteId);
    baselineRef.current.set(noteId, snapshotNote(currentNote));

    getDraft(noteId).then((draft) => {
      if (!draft) return;

      // Compare content, not timestamps: the draft's `updatedAt` is always
      // "now", so a timestamp check reported a recovered draft even when the
      // stored draft was byte-identical to the note being opened.
      if (snapshotNote(draft) === baselineRef.current.get(noteId)) {
        void deleteDraft(noteId);
        return;
      }

      baselineRef.current.set(noteId, snapshotNote(draft));
      onRestore(draft);
      toast.info("Draft restored", {
        description: "Your unsaved changes have been recovered.",
      });
    }).catch((err) => {
      console.error("Failed to check for draft", err);
    });
  }, [currentNote, onRestore]);

  // Clear tracked IDs when editor closes
  useEffect(() => {
    if (!currentNote) {
      restoredIdsRef.current.clear();
      baselineRef.current.clear();
    }
  }, [currentNote]);

  // Debounced save to IndexedDB
  useEffect(() => {
    if (!currentNote) return;

    // Opening a note used to schedule a draft write even with no edits, which
    // left a stale draft behind on every close. Only persist actual changes.
    const baseline = baselineRef.current.get(currentNote.id);
    if (baseline !== undefined && snapshotNote(currentNote) === baseline) {
      return;
    }

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

  const clearDraft = useCallback((noteId: string) => {
    baselineRef.current.delete(noteId);
    deleteDraft(noteId).catch((err) => {
      console.error("Failed to clear draft", err);
    });
  }, []);

  return { clearDraft };
}
