import { useMemo, useDeferredValue } from "react";
import type { NotePayload } from "@/types/note";

type NoteAppSection = "notes" | "archive" | "bin";

type FilterCriteria = {
  section: NoteAppSection;
  search: string;
  tag: string;
  sortBy: "updated" | "created" | "title";
  notebookId: string;
};

// Helper function defined outside component to avoid "impure function" lint error
// This is a workaround for React's strict linting rules
function getCurrentTimestamp(): number {
  return Date.now();
}

export function useNoteFiltering(
  notes: NotePayload[],
  criteria: FilterCriteria,
  customOrder: string[]
) {
  // Defer filtering to keep UI responsive during rapid updates (e.g., typing in search)
  const deferredNotes = useDeferredValue(notes);
  const deferredCriteria = useDeferredValue(criteria);

  const filteredNotes = useMemo(() => {
    return deferredNotes.filter((note) => {
      const matchesSearch = deferredCriteria.search
        ? note.title
            .toLowerCase()
            .includes(deferredCriteria.search.toLowerCase()) ||
          note.content
            .toLowerCase()
            .includes(deferredCriteria.search.toLowerCase())
        : true;

      const matchesTag = deferredCriteria.tag && deferredCriteria.tag !== "all"
        ? note.tags.includes(deferredCriteria.tag)
        : true;

      const matchesNotebook = deferredCriteria.notebookId && deferredCriteria.notebookId !== "all"
        ? note.notebookId === deferredCriteria.notebookId
        : true;

      const section = deferredCriteria.section;
      const matchesSection =
        section === "notes"
          ? !note.archived && !note.trashed
          : section === "archive"
          ? note.archived && !note.trashed
          : note.trashed;

      return (
        matchesSearch &&
        matchesTag &&
        matchesNotebook &&
        matchesSection
      );
    });
  }, [deferredNotes, deferredCriteria]);

  const allTags = useMemo(
    () => [...new Set(deferredNotes.flatMap((note) => note.tags))],
    [deferredNotes]
  );

  const sortedNotes = useMemo(() => {
    const ordered = [...filteredNotes].sort((a, b) => {
      const section = deferredCriteria.section;
      const sortPreference = deferredCriteria.sortBy;

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
    customOrder,
    filteredNotes,
    deferredCriteria.section,
    deferredCriteria.sortBy,
  ]);

  // Single-pass reduce instead of 3 separate filter calls
  const sectionCounts = useMemo(
    () =>
      deferredNotes.reduce(
        (acc, note) => {
          if (note.trashed) acc.bin++;
          else if (note.archived) acc.archive++;
          else acc.notes++;
          return acc;
        },
        { notes: 0, archive: 0, bin: 0 }
      ),
    [deferredNotes]
  );

  return {
    filteredNotes,
    sortedNotes,
    allTags,
    sectionCounts,
  };
}

