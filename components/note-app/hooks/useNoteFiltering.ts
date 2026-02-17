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

export function useNoteFiltering(
  notes: NotePayload[],
  criteria: FilterCriteria,
  customOrder: string[]
) {
  // Defer filtering to keep UI responsive during rapid updates (e.g., typing in search)
  const deferredNotes = useDeferredValue(notes);
  const deferredCriteria = useDeferredValue(criteria);

  const { filteredNotes, allTags, sectionCounts } = useMemo(() => {
    const normalizedSearch = deferredCriteria.search.trim().toLowerCase();
    const hasSearch = normalizedSearch.length > 0;
    const hasTagFilter =
      deferredCriteria.tag.length > 0 && deferredCriteria.tag !== "all";
    const hasNotebookFilter =
      deferredCriteria.notebookId.length > 0 &&
      deferredCriteria.notebookId !== "all";

    const tags = new Set<string>();
    const section = deferredCriteria.section;
    const counts: Record<NoteAppSection, number> = {
      notes: 0,
      archive: 0,
      bin: 0,
    };
    const filtered: NotePayload[] = [];

    for (const note of deferredNotes) {
      for (const tag of note.tags) {
        tags.add(tag);
      }

      if (note.trashed) {
        counts.bin += 1;
      } else if (note.archived) {
        counts.archive += 1;
      } else {
        counts.notes += 1;
      }

      const matchesSection =
        section === "notes"
          ? !note.archived && !note.trashed
          : section === "archive"
          ? note.archived && !note.trashed
          : note.trashed;

      if (!matchesSection) continue;
      if (hasTagFilter && !note.tags.includes(deferredCriteria.tag)) continue;
      if (hasNotebookFilter && note.notebookId !== deferredCriteria.notebookId) {
        continue;
      }

      if (hasSearch) {
        const title = note.title?.toLowerCase() ?? "";
        const content = note.content?.toLowerCase() ?? "";
        if (
          !title.includes(normalizedSearch) &&
          !content.includes(normalizedSearch)
        ) {
          continue;
        }
      }

      filtered.push(note);
    }

    return {
      filteredNotes: filtered,
      allTags: Array.from(tags),
      sectionCounts: counts,
    };
  }, [deferredNotes, deferredCriteria]);

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

  return {
    filteredNotes,
    sortedNotes,
    allTags,
    sectionCounts,
  };
}

