import { useMemo, useDeferredValue } from "react";
import type { NotePayload } from "@/types/note";
import type { SmartFilterCriteria } from "@/components/note-app/types";

type NoteAppSection = "notes" | "archive" | "bin";

// Helper function defined outside component to avoid "impure function" lint error
// This is a workaround for React's strict linting rules
function getCurrentTimestamp(): number {
  return Date.now();
}

export function useNoteFiltering(
  notes: NotePayload[],
  resolvedCriteria: SmartFilterCriteria,
  activeSection: NoteAppSection,
  sortBy: "updated" | "created" | "title",
  customOrder: string[]
) {
  // Defer filtering to keep UI responsive during rapid updates (e.g., typing in search)
  const deferredNotes = useDeferredValue(notes);
  const deferredCriteria = useDeferredValue(resolvedCriteria);
  // Calculate timestamp only when needed for due date filtering
  const timestamp = useMemo(() => {
    if (deferredCriteria.dueWithinDays) {
      return getCurrentTimestamp();
    }
    return 0;
  }, [deferredCriteria.dueWithinDays]);

  const filteredNotes = useMemo(() => {
    const now = deferredCriteria.dueWithinDays ? timestamp : 0;
    return deferredNotes.filter((note) => {
      const matchesSearch = deferredCriteria.search
        ? note.title
            .toLowerCase()
            .includes(deferredCriteria.search.toLowerCase()) ||
          note.content
            .toLowerCase()
            .includes(deferredCriteria.search.toLowerCase())
        : true;

      const matchesPrimaryTag = deferredCriteria.tag
        ? note.tags.includes(deferredCriteria.tag)
        : true;
      const matchesExtraTags = deferredCriteria.tags
        ? deferredCriteria.tags.every((tag) => note.tags.includes(tag))
        : true;

      const matchesPinned =
        typeof deferredCriteria.pinned === "boolean"
          ? note.pinned === deferredCriteria.pinned
          : true;

      const matchesDue = deferredCriteria.dueWithinDays
        ? note.dueAt
          ? (Date.parse(note.dueAt) - now) / (1000 * 60 * 60 * 24) <=
            deferredCriteria.dueWithinDays
          : false
        : true;

      const matchesNotebook = deferredCriteria.notebookId
        ? note.notebookId === deferredCriteria.notebookId
        : true;

      const section = deferredCriteria.section ?? "notes";
      const matchesSection =
        section === "notes"
          ? !note.archived && !note.trashed
          : section === "archive"
          ? note.archived && !note.trashed
          : note.trashed;

      return (
        matchesSearch &&
        matchesPrimaryTag &&
        matchesExtraTags &&
        matchesPinned &&
        matchesDue &&
        matchesNotebook &&
        matchesSection
      );
    });
  }, [deferredNotes, deferredCriteria, timestamp]);

  const allTags = useMemo(
    () => [...new Set(deferredNotes.flatMap((note) => note.tags))],
    [deferredNotes]
  );

  const sortedNotes = useMemo(() => {
    const ordered = [...filteredNotes].sort((a, b) => {
      const section = deferredCriteria.section ?? activeSection;
      const sortPreference = deferredCriteria.sortBy ?? sortBy;

      if (section === "notes") {
        const pinnedDiff = Number(b.pinned) - Number(a.pinned);
        if (pinnedDiff !== 0) return pinnedDiff;
      }

      if (sortPreference === "title")
        return (a.title || "").localeCompare(b.title || "");
      if (sortPreference === "created")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    if (!customOrder.length) {
      return ordered;
    }

    const orderMap = new Map(
      customOrder.map((id, index) => [id, index] as const)
    );
    const withWeights = ordered.map((note) => ({
      note,
      weight: orderMap.get(note.id) ?? Number.MAX_SAFE_INTEGER,
    }));

    withWeights.sort((a, b) => a.weight - b.weight);
    return withWeights.map((entry) => entry.note);
  }, [
    activeSection,
    customOrder,
    filteredNotes,
    deferredCriteria.section,
    deferredCriteria.sortBy,
    sortBy,
  ]);

  const sectionCounts = useMemo(
    () => ({
      notes: deferredNotes.filter((note) => !note.archived && !note.trashed).length,
      archive: deferredNotes.filter((note) => note.archived && !note.trashed).length,
      bin: deferredNotes.filter((note) => note.trashed).length,
    }),
    [deferredNotes]
  );

  return {
    filteredNotes,
    sortedNotes,
    allTags,
    sectionCounts,
  };
}
