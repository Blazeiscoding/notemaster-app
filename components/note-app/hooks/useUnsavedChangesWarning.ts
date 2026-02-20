import { useCallback, useEffect, useRef } from "react";
import type { NotePayload } from "@/types/note";

/**
 * Tracks whether the current note in the editor has unsaved changes.
 *
 * - Snapshots the note when the editor opens (when `currentNote` transitions
 *   from null to a value).
 * - Exposes a callback to check whether the current note differs from snapshot.
 * - Attaches a `beforeunload` listener so the browser warns before navigating
 *   away with unsaved work.
 */
export function useUnsavedChangesWarning(
  currentNote: NotePayload | null
) {
  const snapshotRef = useRef<NotePayload | null>(null);
  const currentNoteRef = useRef<NotePayload | null>(null);

  // Snapshot the note when the editor first opens
  useEffect(() => {
    currentNoteRef.current = currentNote;

    if (currentNote && !snapshotRef.current) {
      // Deep-clone the note so mutations to currentNote don't affect the snapshot
      snapshotRef.current = JSON.parse(JSON.stringify(currentNote)) as NotePayload;
    }
    if (!currentNote) {
      snapshotRef.current = null;
    }
  }, [currentNote]);

  const hasUnsavedChanges = useCallback(() => {
    const note = currentNoteRef.current;
    const snap = snapshotRef.current;
    if (!note || !snap) return false;

    return (
      note.title !== snap.title ||
      note.content !== snap.content ||
      note.pinned !== snap.pinned ||
      note.dueAt !== snap.dueAt ||
      JSON.stringify(note.tags) !== JSON.stringify(snap.tags) ||
      JSON.stringify(note.checklist) !== JSON.stringify(snap.checklist) ||
      JSON.stringify(note.attachments) !== JSON.stringify(snap.attachments)
    );
  }, []);

  // Warn on browser navigation when there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  return { hasUnsavedChanges };
}
