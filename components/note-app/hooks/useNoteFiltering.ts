import { useMemo, useDeferredValue } from "react";
import type { NoteSummaryPayload, SectionKey } from "@/types/note";

type FilterCriteria = {
  section: SectionKey;
  search: string;
  tag: string;
  sortBy: "updated" | "created" | "title";
};

export function useNoteFiltering(
  notes: NoteSummaryPayload[],
  criteria: FilterCriteria,
  customOrder: string[]
) {
  type PreparedNote = {
    note: NoteSummaryPayload;
    createdAtMs: number;
    updatedAtMs: number;
    titleLower: string;
    previewLower: string;
    tagsLower: string;
  };

  // Defer filtering to keep UI responsive during rapid updates (e.g., typing in search)
  const deferredNotes = useDeferredValue(notes);
  const deferredCriteria = useDeferredValue(criteria);

  const preparedNotes = useMemo<PreparedNote[]>(
    () =>
      deferredNotes.map((note) => {
        const createdAtMs = Date.parse(note.createdAt);
        const updatedAtMs = Date.parse(note.updatedAt);
        return {
          note,
          createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
          updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : 0,
          titleLower: note.title?.toLowerCase() ?? "",
          previewLower: note.preview.toLowerCase(),
          tagsLower: note.tags.join(" ").toLowerCase(),
        };
      }),
    [deferredNotes]
  );

  const { filteredPreparedNotes, allTags, sectionCounts } = useMemo(() => {
    const normalizedSearch = deferredCriteria.search.trim().toLowerCase();
    const hasSearch = normalizedSearch.length > 0;
    const hasTagFilter =
      deferredCriteria.tag.length > 0 && deferredCriteria.tag !== "all";

    const tags = new Set<string>();
    const section = deferredCriteria.section;
    const counts: Record<SectionKey, number> = {
      notes: 0,
      archive: 0,
      bin: 0,
    };
    const filtered: PreparedNote[] = [];

    for (const prepared of preparedNotes) {
      const { note } = prepared;

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

      // Note bodies are encrypted at rest and only a 240-char preview reaches
      // the client, so search covers title, preview and tags. Matching the full
      // body would need the server to hold a searchable index of plaintext.
      if (hasSearch) {
        if (
          !prepared.titleLower.includes(normalizedSearch) &&
          !prepared.previewLower.includes(normalizedSearch) &&
          !prepared.tagsLower.includes(normalizedSearch)
        ) {
          continue;
        }
      }

      filtered.push(prepared);
    }

    return {
      filteredPreparedNotes: filtered,
      allTags: Array.from(tags),
      sectionCounts: counts,
    };
  }, [preparedNotes, deferredCriteria]);


  const sortedNotes = useMemo(() => {
    const ordered = [...filteredPreparedNotes].sort((a, b) => {
      const section = deferredCriteria.section;
      const sortPreference = deferredCriteria.sortBy;

      if (section === "notes") {
        const pinnedDiff = Number(b.note.pinned) - Number(a.note.pinned);
        if (pinnedDiff !== 0) return pinnedDiff;
      }

      if (sortPreference === "title")
        return (a.note.title || "").localeCompare(b.note.title || "");
      if (sortPreference === "created") return b.createdAtMs - a.createdAtMs;
      return b.updatedAtMs - a.updatedAtMs;
    });

    if (!customOrder.length) {
      return ordered.map((entry) => entry.note);
    }

    const orderMap = new Map(
      customOrder.map((id, index) => [id, index] as const)
    );
    const withWeights = ordered.map((entry) => ({
      entry,
      weight: orderMap.get(entry.note.id) ?? Number.MAX_SAFE_INTEGER,
    }));

    withWeights.sort((a, b) => a.weight - b.weight);
    return withWeights.map(({ entry }) => entry.note);
  }, [
    customOrder,
    filteredPreparedNotes,
    deferredCriteria.section,
    deferredCriteria.sortBy,
  ]);

  return {
    sortedNotes,
    allTags,
    sectionCounts,
  };
}
