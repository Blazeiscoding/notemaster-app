import { useCallback } from "react";
import type { NotePayload, NoteRevisionPayload } from "@/types/note";
import { apiRequest } from "@/lib/api-client";

type PaginatedNotesResponse = {
  notes: NotePayload[];
  nextCursor: string | null;
  hasMore: boolean;
};

const NOTES_PAGE_SIZE = 100;

export function useNoteServerActions() {
  const fetchNotesFromServer = useCallback(async () => {
    const allNotes: NotePayload[] = [];
    let cursor: string | null = null;

    while (true) {
      const params = new URLSearchParams({
        limit: String(NOTES_PAGE_SIZE),
      });

      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await apiRequest<NotePayload[] | PaginatedNotesResponse>(
        `/api/notes?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      if (Array.isArray(response)) {
        return response;
      }

      allNotes.push(...response.notes);

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
    }

    return allNotes;
  }, []);

  const fetchRevisionsFromServer = useCallback(async (id: string) => {
    return apiRequest<NoteRevisionPayload[]>(`/api/notes/${id}/revisions`, {
      cache: "no-store",
    });
  }, []);

  const createNoteOnServer = useCallback(async (note: NotePayload) => {
    return apiRequest<NotePayload>("/api/notes", {
      method: "POST",
      body: JSON.stringify(note),
    });
  }, []);

  const updateNoteOnServer = useCallback(
    async (id: string, updates: Partial<NotePayload>) => {
      return apiRequest<NotePayload>(`/api/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    []
  );

  const deleteNoteOnServer = useCallback(async (id: string) => {
    await apiRequest(`/api/notes/${id}`, { method: "DELETE" });
  }, []);

  return {
    fetchNotesFromServer,
    fetchRevisionsFromServer,
    createNoteOnServer,
    updateNoteOnServer,
    deleteNoteOnServer,
  };
}
