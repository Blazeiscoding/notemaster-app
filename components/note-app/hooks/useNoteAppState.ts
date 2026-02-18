import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "./useTheme";
import { usePWA } from "./usePWA";
import { useAccent } from "./useAccent";
import { useNotes } from "./useNotes";
import { useCurrentNote } from "./useCurrentNote";
import { useNoteRevisions } from "./useNoteRevisions";
import { useNoteData } from "./useNoteData";
import { useNoteFiltering } from "./useNoteFiltering";

import type {
  NotePayload,
  NoteRevisionPayload,
  NotebookPayload,
  NotebookTreeNode,
} from "@/types/note";
import { generateId } from "@/components/note-app/util";
import { NOTE_ORDER_STORAGE_KEY } from "@/components/note-app/constants";
import { hapticLight } from "@/lib/haptics";
import { apiRequest } from "@/lib/api-client";
import { useSSE } from "@/lib/use-sse";

type NoteAppSection = "notes" | "archive" | "bin";
type PaginatedNotesResponse = {
  notes: NotePayload[];
  nextCursor: string | null;
  hasMore: boolean;
};

const NOTES_PAGE_SIZE = 100;

export const useNoteApp = () => {
  // User and authentication
  const { user } = useUser();
  const userFirstName =
    (user as { firstName?: string } | null)?.firstName ?? null;
  const userId = user?.id ?? null;
  const isAuthenticated = Boolean(userId);
  const storageKey = `notemaster-notes-${userId ?? "guest"}`;

  // UI state
  const [currentNote, setCurrentNote] = useState<NotePayload | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [filterTag, setFilterTag] = useState("all");
  const [sortBy, setSortBy] = useState<"updated" | "created" | "title">(
    "updated"
  );
  const [activeSection, setActiveSection] = useState<NoteAppSection>("notes");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [customOrder, setCustomOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage?.getItem(NOTE_ORDER_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.error("Failed to read note order", error);
    }
    return [];
  });

  // Extract hooks
  const { darkMode, setDarkMode } = useTheme();
  const { canInstall, installApp, showIosInstallTip, setShowIosInstallTip } =
    usePWA();
  const {
    accent,
    accentPreview,
    handlePreviewAccent,
    handleCancelAccentPreview,
    handleSelectAccent,
    accentPalettes,
  } = useAccent();

  // Server actions
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

      // Backward-compatible fallback in case server returns a plain array.
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

  const fetchNotebooksFromServer = useCallback(async () => {
    return apiRequest<NotebookPayload[]>("/api/notebooks", {
      cache: "no-store",
    });
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

  // Data loading
  const {
    notes,
    setNotes,
    notebooks,
    isLoading,
    error: dataError,
    retry: retryLoadData,
  } = useNoteData(isAuthenticated, storageKey, {
    fetchNotesFromServer,
    fetchNotebooksFromServer: fetchNotebooksFromServer as () => Promise<
      NotebookPayload[]
    >,
  }, userId);

  // Note filtering and sorting
  const filterCriteria = useMemo(() => ({
    section: activeSection,
    search: searchQuery,
    tag: filterTag,
    sortBy,
    notebookId: "all",
  }), [activeSection, searchQuery, filterTag, sortBy]);

  const { sortedNotes, allTags, sectionCounts } = useNoteFiltering(
    notes,
    filterCriteria,
    customOrder
  );

  // Notes operations
  const notesHook = useNotes(
    { notes, setNotes, currentNote, setCurrentNote },
    isAuthenticated,
    {
      updateNoteOnServer,
      deleteNoteOnServer,
    }
  );

  // Memoize notebook lookups to avoid creating new Map/Array on every render
  const notebooksById = useMemo(() => {
    const map = new Map<string, NotebookPayload>();
    for (const nb of notebooks) map.set(nb.id, nb);
    return map;
  }, [notebooks]);

  const notebookOptions = useMemo(() =>
    notebooks.map((nb) => ({ id: nb.id, label: nb.name })),
    [notebooks]
  );

  // Current note editing
  const currentNoteHook = useCurrentNote({ currentNote, setCurrentNote });

  // Revisions
  const revisionsHook = useNoteRevisions(
    { setNotes, setCurrentNote },
    isAuthenticated,
    {
      fetchRevisionsFromServer,
    }
  );

  const currentNoteIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentNoteIdRef.current = currentNote?.id ?? null;
  }, [currentNote?.id]);

  const handleSseNoteCreated = useCallback(
    (noteId: string, data?: Partial<NotePayload>) => {
      if (!data) return;
      // Only add if not already in list (to avoid duplicates from own actions)
      setNotes((prev) => {
        if (prev.some((n) => n.id === noteId)) return prev;
        return [data as NotePayload, ...prev];
      });
    },
    [setNotes]
  );

  const handleSseNoteUpdated = useCallback(
    (noteId: string, data?: Partial<NotePayload>) => {
      if (!data) return;
      setNotes((prev) => {
        const index = prev.findIndex((n) => n.id === noteId);
        if (index === -1) return prev;
        const next = [...prev];
        next[index] = { ...next[index], ...data };
        return next;
      });
    },
    [setNotes]
  );

  const handleSseNoteDeleted = useCallback(
    (noteId: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      // Close editor if the deleted note was being edited
      if (currentNoteIdRef.current === noteId) {
        setCurrentNote(null);
      }
    },
    [setNotes, setCurrentNote]
  );

  const sseHandlers = useMemo(
    () => ({
      onNoteCreated: handleSseNoteCreated,
      onNoteUpdated: handleSseNoteUpdated,
      onNoteDeleted: handleSseNoteDeleted,
    }),
    [handleSseNoteCreated, handleSseNoteDeleted, handleSseNoteUpdated]
  );

  // Real-time updates via SSE (only when authenticated)
  useSSE(sseHandlers, { enabled: isAuthenticated });

  // Close editor when switching away from notes section
  useEffect(() => {
    if (activeSection !== "notes" && currentNote) {
      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setCurrentNote(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeSection, currentNote, setCurrentNote]);

  // Create and save note handlers
  const createNote = useCallback(() => {
    setActiveSection("notes");
    hapticLight();
    const now = new Date().toISOString();
    const ownerId = isAuthenticated && userId ? userId : null;
    const newNote: NotePayload = {
      id: generateId(),
      userId: ownerId,
      notebookId: null,
      title: "",
      content: "",
      tags: [],
      checklist: [],
      attachments: [],
      type: "note",
      createdAt: now,
      updatedAt: now,
      pinned: false,
      archived: false,
      trashed: false,
      dueAt: null,
    };
    setCurrentNote(newNote);
    setShowSidebar(false);
  }, [
    isAuthenticated,
    userId,
    setCurrentNote,
    setActiveSection,
    setShowSidebar,
  ]);

  // Create note from PWA share target
  const createNoteFromShare = useCallback((title: string, content: string) => {
    setActiveSection("notes");
    hapticLight();
    const now = new Date().toISOString();
    const ownerId = isAuthenticated && userId ? userId : null;
    const newNote: NotePayload = {
      id: generateId(),
      userId: ownerId,
      notebookId: null,
      title,
      content,
      tags: ["shared"],
      checklist: [],
      attachments: [],
      type: "note",
      createdAt: now,
      updatedAt: now,
      pinned: false,
      archived: false,
      trashed: false,
      dueAt: null,
    };
    setCurrentNote(newNote);
    setShowSidebar(false);
  }, [isAuthenticated, userId, setCurrentNote, setActiveSection, setShowSidebar]);

  // Check for shared note from PWA share target on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      const sharedNoteRaw = sessionStorage.getItem("notemaster-shared-note");
      if (sharedNoteRaw) {
        sessionStorage.removeItem("notemaster-shared-note");
        const sharedNote = JSON.parse(sharedNoteRaw) as { title: string; content: string };
        if (sharedNote.title || sharedNote.content) {
          // Small delay to ensure app is fully loaded
          setTimeout(() => {
            createNoteFromShare(sharedNote.title || "Shared Note", sharedNote.content || "");
          }, 500);
        }
      }
    } catch (error) {
      console.error("Failed to process shared note:", error);
    }
  }, [createNoteFromShare]);

  const saveCurrentNote = useCallback(async () => {
    if (!currentNote) {
      return;
    }

    const hasContent =
      Boolean(currentNote.title?.trim()) ||
      Boolean(currentNote.content?.trim()) ||
      currentNote.checklist.length > 0 ||
      currentNote.attachments.length > 0;

    if (!hasContent) {
      return;
    }

    setIsSavingNote(true);

    const updatedAt = new Date().toISOString();
    const ownerId = isAuthenticated && userId ? userId : null;
    const baseNote: NotePayload = {
      ...currentNote,
      userId: ownerId,
      updatedAt,
      dueAt: currentNote.dueAt ?? null,
      notebookId:
        currentNote.notebookId && currentNote.notebookId.trim().length > 0
          ? currentNote.notebookId
          : null,
    };

    const applyLocal = (note: NotePayload) => {
      setNotes((prev) => {
        const existingIndex = prev.findIndex((n) => n.id === note.id);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = note;
          return next;
        }
        return [note, ...prev];
      });
    };

    const exists = notes.some((n) => n.id === baseNote.id);

    if (isAuthenticated) {
      try {
        const payload: Partial<NotePayload> = {
          notebookId: baseNote.notebookId,
          title: baseNote.title,
          content: baseNote.content,
          tags: baseNote.tags,
          checklist: baseNote.checklist,
          attachments: baseNote.attachments,
          pinned: baseNote.pinned,
          archived: baseNote.archived,
          trashed: baseNote.trashed,
          dueAt: baseNote.dueAt,
          updatedAt: baseNote.updatedAt,
        };

        const saved = exists
          ? await updateNoteOnServer(baseNote.id, payload)
          : await createNoteOnServer(baseNote);
        applyLocal(saved);
        setCurrentNote(null);
        toast.success(exists ? "Note updated" : "Note created");
      } catch (error) {
        console.error("Failed to save note", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save note";
        if (errorMessage.includes("Too many requests")) {
          toast.error("Too many requests. Please wait a moment and try again.");
        } else {
          toast.error("Failed to save note. Please try again.");
        }
        setIsSavingNote(false);
        return;
      }
    } else {
      applyLocal(baseNote);
      setCurrentNote(null);
    }

    setIsSavingNote(false);
  }, [
    currentNote,
    isAuthenticated,
    notes,
    updateNoteOnServer,
    createNoteOnServer,
    userId,
    setNotes,
    setCurrentNote,
  ]);

  return {
    isLoading,
    dataError,
    retryLoadData,
    userFirstName,
    isAuthenticated,
    darkMode,
    setDarkMode,
    notes,
    sortedNotes,
    currentNote,
    setCurrentNote,
    showSidebar,
    setShowSidebar,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    activeSection,
    setActiveSection,
    sectionCounts,
    filterTag,
    setFilterTag,
    allTags,
    accent,
    accentPreview,
    handlePreviewAccent,
    handleCancelAccentPreview,
    accentPalettes,
    handleSelectAccent,
    customOrder,
    setCustomOrder,
    canInstall,
    installApp,
    showIosInstallTip,
    setShowIosInstallTip,
    createNote,
    saveCurrentNote,
    isSavingNote,
    triggerAttachmentPicker: currentNoteHook.triggerAttachmentPicker,
    handleAttachmentsSelected: currentNoteHook.handleAttachmentsSelected,
    handleRemoveAttachment: currentNoteHook.handleRemoveAttachment,
    handleDownloadAttachment: currentNoteHook.handleDownloadAttachment,
    handleClearAttachments: currentNoteHook.handleClearAttachments,
    handleNotebookChange: currentNoteHook.handleNotebookChange,
    handleTitleChange: currentNoteHook.handleTitleChange,
    handleContentChange: currentNoteHook.handleContentChange,
    handleDueDateChange: currentNoteHook.handleDueDateChange,
    handleClearDueDate: currentNoteHook.handleClearDueDate,
    handleCloseEditor: currentNoteHook.handleCloseEditor,
    fileInputRef: currentNoteHook.fileInputRef,
    addChecklistItem: currentNoteHook.addChecklistItem,
    markAllChecklist: currentNoteHook.markAllChecklist,
    clearCompletedChecklist: currentNoteHook.clearCompletedChecklist,
    updateChecklistItem: currentNoteHook.updateChecklistItem,
    deleteChecklistItem: currentNoteHook.deleteChecklistItem,
    addTag: currentNoteHook.addTag,
    removeTag: currentNoteHook.removeTag,
    togglePin: notesHook.togglePin,
    archiveNote: notesHook.archiveNote,
    unarchiveNote: notesHook.unarchiveNote,
    trashNote: notesHook.trashNote,
    restoreFromBin: notesHook.restoreFromBin,
    deleteForever: notesHook.deleteForever,
    exportNotes: notesHook.exportNotes,
    importNotes: notesHook.importNotes,
    // Notebooks
    notebooks,
    notebookTree: [] as NotebookTreeNode[],
    notebooksById,
    notebookOptions,
    revisions: revisionsHook.revisions,
    isRevisionOpen: revisionsHook.isRevisionOpen,
    isLoadingRevisions: revisionsHook.isLoadingRevisions,
    revisionTargetId: revisionsHook.revisionTargetId,
    handleOpenRevisions: revisionsHook.handleOpenRevisions,
    handleCloseRevisions: revisionsHook.handleCloseRevisions,
    handleRestoreRevision: revisionsHook.handleRestoreRevision,
  };
};
