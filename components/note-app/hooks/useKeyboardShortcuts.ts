"use client";

import { useEffect, useCallback } from "react";
import { toast } from "sonner";

type KeyboardShortcutsConfig = {
  onCreateNote: () => void;
  onSaveNote: () => void;
  onCloseEditor: () => void;
  onFocusSearch: () => void;
  currentNote: unknown;
  isSaving: boolean;
};

export function useKeyboardShortcuts({
  onCreateNote,
  onSaveNote,
  onCloseEditor,
  onFocusSearch,
  currentNote,
  isSaving,
}: KeyboardShortcutsConfig) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? event.metaKey : event.ctrlKey;
      const isInputFocused =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target as HTMLElement)?.isContentEditable;

      // Don't trigger shortcuts when typing in inputs (except for specific shortcuts)
      if (isInputFocused && !modKey && event.key !== "Escape") {
        return;
      }

      // Ctrl/Cmd + N - New note
      if (modKey && event.key === "n" && !event.shiftKey) {
        event.preventDefault();
        onCreateNote();
        return;
      }

      // Ctrl/Cmd + S - Save note
      if (modKey && event.key === "s") {
        event.preventDefault();
        if (currentNote && !isSaving) {
          onSaveNote();
        }
        return;
      }

      // Esc - Close editor
      if (event.key === "Escape" && currentNote) {
        event.preventDefault();
        onCloseEditor();
        return;
      }

      // Ctrl/Cmd + K - Focus search
      if (modKey && event.key === "k") {
        event.preventDefault();
        onFocusSearch();
        return;
      }

      // Ctrl/Cmd + / - Show shortcuts help
      if (modKey && event.key === "/") {
        event.preventDefault();
        const modKeyText = isMac ? "⌘" : "Ctrl";
        toast.info("Keyboard Shortcuts", {
          description: `${modKeyText} + N - New note\n${modKeyText} + S - Save note\n${modKeyText} + K - Focus search\nEsc - Close editor`,
          duration: 5000,
        });
        return;
      }
    },
    [
      onCreateNote,
      onSaveNote,
      onCloseEditor,
      onFocusSearch,
      currentNote,
      isSaving,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}

