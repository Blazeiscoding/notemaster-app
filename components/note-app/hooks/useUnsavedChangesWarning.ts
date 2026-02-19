import { useEffect, useRef, useMemo } from "react";
import type { NotePayload } from "@/types/note";

/**
 * Tracks whether the current note in the editor has unsaved changes.
 *
 * - Snapshots the note when the editor opens (when `currentNote` transitions
 *   from null to a value).
 * - Compares the live `currentNote` to the snapshot to derive `isDirty`.
 * - Attaches a `beforeunload` listener so the browser warns before navigating
 *   away with unsaved work.
 */
export function useUnsavedChangesWarning(
  currentNote: NotePayload | null
) {
  const snapshotRef = useRef<NotePayload | null>(null);

  // Snapshot the note when the editor first opens
  useEffect(() => {
    if (currentNote && !snapshotRef.current) {
      // Deep-clone the note so mutations to currentNote don't affect the snapshot
      snapshotRef.current = JSON.parse(JSON.stringify(currentNote));
    }
    if (!currentNote) {
      snapshotRef.current = null;
    }
  }, [currentNote]);

  const isDirty = useMemo(() => {
    if (!currentNote || !snapshotRef.current) return false;
    const snap = snapshotRef.current;
    return (
      currentNote.title !== snap.title ||
      currentNote.content !== snap.content ||
      currentNote.notebookId !== snap.notebookId ||
      currentNote.pinned !== snap.pinned ||
      currentNote.dueAt !== snap.dueAt ||
      JSON.stringify(currentNote.tags) !== JSON.stringify(snap.tags) ||
      JSON.stringify(currentNote.checklist) !== JSON.stringify(snap.checklist) ||
      JSON.stringify(currentNote.attachments) !== JSON.stringify(snap.attachments)
    );
  }, [currentNote]);

  // Attach beforeunload listener when dirty
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return { isDirty };
}
