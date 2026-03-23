import { useEffect } from "react";

export function useSharedNoteImport(
  onCreateFromShare: (title: string, content: string) => void
) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const sharedNoteRaw = sessionStorage.getItem("notemaster-shared-note");
      if (!sharedNoteRaw) return;

      sessionStorage.removeItem("notemaster-shared-note");
      const sharedNote = JSON.parse(sharedNoteRaw) as {
        title?: string;
        content?: string;
      };

      if (!sharedNote.title && !sharedNote.content) {
        return;
      }

      const timer = window.setTimeout(() => {
        onCreateFromShare(
          sharedNote.title || "Shared Note",
          sharedNote.content || ""
        );
      }, 300);

      return () => window.clearTimeout(timer);
    } catch (error) {
      console.error("Failed to process shared note:", error);
    }
  }, [onCreateFromShare]);
}
