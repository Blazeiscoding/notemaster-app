/**
 * Web Worker for search and filtering operations.
 * Offloads CPU-intensive note filtering from the main thread.
 */

import type { NotePayload } from "@/types/note";

export type SearchWorkerMessage = {
  type: "FILTER_NOTES";
  payload: {
    notes: NotePayload[];
    criteria: FilterCriteria;
  };
};

export type FilterCriteria = {
  search?: string;
  tag?: string;
  tags?: string[];
  section?: "notes" | "archive" | "bin" | "any";
  notebookId?: string;
  sortBy?: "updated" | "created" | "title";
  pinned?: boolean;
  dueWithinDays?: number;
};

export type SearchWorkerResponse = {
  type: "FILTER_RESULT";
  payload: {
    filteredNotes: NotePayload[];
    allTags: string[];
    sectionCounts: {
      notes: number;
      archive: number;
      bin: number;
    };
  };
};

// Worker message handler
self.onmessage = (event: MessageEvent<SearchWorkerMessage>) => {
  const { type, payload } = event.data;

  if (type === "FILTER_NOTES") {
    const result = filterNotes(payload.notes, payload.criteria);
    const response: SearchWorkerResponse = {
      type: "FILTER_RESULT",
      payload: result,
    };
    self.postMessage(response);
  }
};

function filterNotes(
  notes: NotePayload[],
  criteria: FilterCriteria
): SearchWorkerResponse["payload"] {
  const now = criteria.dueWithinDays ? Date.now() : 0;

  // Filter notes based on criteria
  const filtered = notes.filter((note) => {
    // Section filter
    const section = criteria.section ?? "notes";
    if (section !== "any") {
      if (section === "notes" && (note.archived || note.trashed)) return false;
      if (section === "archive" && (!note.archived || note.trashed)) return false;
      if (section === "bin" && !note.trashed) return false;
    }

    // Search filter
    if (criteria.search) {
      const searchLower = criteria.search.toLowerCase();
      const titleMatch = note.title.toLowerCase().includes(searchLower);
      const contentMatch = note.content.toLowerCase().includes(searchLower);
      const tagMatch = note.tags.some((tag) =>
        tag.toLowerCase().includes(searchLower)
      );
      if (!titleMatch && !contentMatch && !tagMatch) return false;
    }

    // Tag filter
    if (criteria.tag && criteria.tag !== "all") {
      if (!note.tags.includes(criteria.tag)) return false;
    }

    // Multiple tags filter
    if (criteria.tags && criteria.tags.length > 0) {
      const hasAllTags = criteria.tags.every((tag) => note.tags.includes(tag));
      if (!hasAllTags) return false;
    }

    // Notebook filter
    if (criteria.notebookId && criteria.notebookId !== "all") {
      if (note.notebookId !== criteria.notebookId) return false;
    }

    // Pinned filter
    if (criteria.pinned !== undefined) {
      if (note.pinned !== criteria.pinned) return false;
    }

    // Due within days filter
    if (criteria.dueWithinDays && note.dueAt) {
      const dueDate = new Date(note.dueAt).getTime();
      const threshold = now + criteria.dueWithinDays * 24 * 60 * 60 * 1000;
      if (dueDate > threshold) return false;
    }

    return true;
  });

  // Sort notes
  const sortBy = criteria.sortBy ?? "updated";
  const sorted = [...filtered].sort((a, b) => {
    // Pinned notes always first
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    // Then sort by specified field
    if (sortBy === "updated") {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    if (sortBy === "created") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  // Collect all unique tags
  const allTags = Array.from(
    new Set(notes.flatMap((note) => note.tags))
  ).sort();

  // Count notes per section
  const sectionCounts = {
    notes: notes.filter((n) => !n.archived && !n.trashed).length,
    archive: notes.filter((n) => n.archived && !n.trashed).length,
    bin: notes.filter((n) => n.trashed).length,
  };

  return {
    filteredNotes: sorted,
    allTags,
    sectionCounts,
  };
}

export {};
