import { useMemo } from "react";
import type { NotePayload } from "@/types/note";
import type { SmartFilterCriteria } from "@/components/note-app/types";

type NoteAppSection = "notes" | "archive" | "bin";

export function useNoteFiltering(
  notes: NotePayload[],
  resolvedCriteria: SmartFilterCriteria,
  activeSection: NoteAppSection,
  sortBy: "updated" | "created" | "title",
  customOrder: string[]
) {
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch = resolvedCriteria.search
        ? note.title
            .toLowerCase()
            .includes(resolvedCriteria.search.toLowerCase()) ||
          note.content
            .toLowerCase()
            .includes(resolvedCriteria.search.toLowerCase())
        : true;

      const matchesPrimaryTag = resolvedCriteria.tag
        ? note.tags.includes(resolvedCriteria.tag)
        : true;
      const matchesExtraTags = resolvedCriteria.tags
        ? resolvedCriteria.tags.every((tag) => note.tags.includes(tag))
        : true;

      const matchesPinned =
        typeof resolvedCriteria.pinned === "boolean"
          ? note.pinned === resolvedCriteria.pinned
          : true;

      const matchesDue = resolvedCriteria.dueWithinDays
        ? note.dueAt
          ? (Date.parse(note.dueAt) - Date.now()) / (1000 * 60 * 60 * 24) <=
            resolvedCriteria.dueWithinDays
          : false
        : true;

      const matchesNotebook = resolvedCriteria.notebookId
        ? note.notebookId === resolvedCriteria.notebookId
        : true;

      const section = resolvedCriteria.section ?? "notes";
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
  }, [notes, resolvedCriteria]);

  const allTags = useMemo(
    () => [...new Set(notes.flatMap((note) => note.tags))],
    [notes]
  );

  const sortedNotes = useMemo(() => {
    const ordered = [...filteredNotes].sort((a, b) => {
      const section = resolvedCriteria.section ?? activeSection;
      const sortPreference = resolvedCriteria.sortBy ?? sortBy;

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
    resolvedCriteria.section,
    resolvedCriteria.sortBy,
    sortBy,
  ]);

  const sectionCounts = useMemo(
    () => ({
      notes: notes.filter((note) => !note.archived && !note.trashed).length,
      archive: notes.filter((note) => note.archived && !note.trashed).length,
      bin: notes.filter((note) => note.trashed).length,
    }),
    [notes]
  );

  return {
    filteredNotes,
    sortedNotes,
    allTags,
    sectionCounts,
  };
}

