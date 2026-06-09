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
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";
import { useAutosave } from "./useAutosave";

import type {
  NotePayload,
  NoteRevisionPayload,
  NoteSummaryPayload,
  SectionKey,
} from "@/types/note";
import { deriveNoteSummary } from "@/types/note";
import { buildNewNote } from "@/components/note-app/util";
import { NOTE_ORDER_STORAGE_KEY } from "@/components/note-app/constants";
import { hapticLight } from "@/lib/haptics";
import { apiRequest } from "@/lib/api-client";
import {
  deleteNoteDetail,
  getAllNotes,
  getNoteDetail,
  saveNoteDetail,
} from "@/lib/indexeddb";
import { useSSE } from "@/lib/use-sse";


type PaginatedNotesResponse = {
  notes: NoteSummaryPayload[];
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
  const [activeSection, setActiveSection] = useState<SectionKey>("notes");
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
  const fetchNoteSummariesFromServer = useCallback(async () => {
    const allNotes: NoteSummaryPayload[] = [];
    let cursor: string | null = null;

    while (true) {
      const params = new URLSearchParams({
        limit: String(NOTES_PAGE_SIZE),
      });

      if (cursor) {
        params.set("cursor", cursor);
      }

      const response = await apiRequest<
        NoteSummaryPayload[] | PaginatedNotesResponse
      >(
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

  const fetchNoteFromServer = useCallback(async (id: string) => {
    return apiRequest<NotePayload>(`/api/notes/${id}`, {
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

  const getGuestLocalStorageNotes = useCallback((): NotePayload[] => {
    if (typeof window === "undefined") return [];
    try {
      const rawNotes = window.localStorage?.getItem(storageKey);
      const parsed = rawNotes ? JSON.parse(rawNotes) : [];
      return Array.isArray(parsed) ? (parsed as NotePayload[]) : [];
    } catch (error) {
      console.error("Failed to read local notes", error);
      return [];
    }
  }, [storageKey]);

  const writeGuestLocalStorageNotes = useCallback(
    (nextNotes: NotePayload[]) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage?.setItem(storageKey, JSON.stringify(nextNotes));
      } catch (error) {
        console.error("Failed to persist local notes", error);
      }
    },
    [storageKey]
  );

  // Data loading
  const {
    notes,
    setNotes,
    isLoading,
    error: dataError,
    retry: retryLoadData,
  } = useNoteData(
    isAuthenticated,
    storageKey,
    {
      fetchNoteSummariesFromServer,
    },
    userId
  );

  // Note filtering and sorting
  const filterCriteria = useMemo(() => ({
    section: activeSection,
    search: searchQuery,
    tag: filterTag,
    sortBy,
  }), [activeSection, searchQuery, filterTag, sortBy]);

  const { sortedNotes, allTags, sectionCounts } = useNoteFiltering(
    notes,
    filterCriteria,
    customOrder
  );

  const openNote = useCallback(
    async (summary: NoteSummaryPayload) => {
      try {
        if (isAuthenticated) {
          const cached = await getNoteDetail(summary.id);
          if (cached && cached.updatedAt === summary.updatedAt) {
            setCurrentNote(cached);
            setShowSidebar(false);
            return;
          }

          try {
            const fullNote = await fetchNoteFromServer(summary.id);
            await saveNoteDetail(fullNote);
            setCurrentNote(fullNote);
            setShowSidebar(false);
          } catch (error) {
            if (!cached) {
              throw error;
            }

            setCurrentNote(cached);
            setShowSidebar(false);
            toast.info("Opened cached note", {
              description: "Showing the last saved local copy.",
            });
          }
          return;
        }

        const cached = await getNoteDetail(summary.id).catch(() => undefined);
        if (cached) {
          setCurrentNote(cached);
          setShowSidebar(false);
          return;
        }

        const localNote = getGuestLocalStorageNotes().find(
          (note) => note.id === summary.id
        );
        if (localNote) {
          setCurrentNote(localNote);
          setShowSidebar(false);
          return;
        }

        toast.error("Unable to open note. The full note was not found locally.");
      } catch (error) {
        console.error("Failed to open note", error);
        toast.error("Failed to open note. Please try again.");
      }
    },
    [
      fetchNoteFromServer,
      getGuestLocalStorageNotes,
      isAuthenticated,
      setCurrentNote,
      setShowSidebar,
    ]
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

  // Current note editing
  const currentNoteHook = useCurrentNote({ currentNote, setCurrentNote });

  // Unsaved changes warning (beforeunload + dirty tracking)
  const { hasUnsavedChanges } = useUnsavedChangesWarning(currentNote);

  // Close confirmation state
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);

  const handleCloseEditor = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowCloseConfirmation(true);
    } else {
      setCurrentNote(null);
    }
  }, [hasUnsavedChanges, setCurrentNote]);

  const confirmClose = useCallback(() => {
    setShowCloseConfirmation(false);
    setCurrentNote(null);
  }, [setCurrentNote]);

  const cancelClose = useCallback(() => {
    setShowCloseConfirmation(false);
  }, []);

  // Autosave drafts to IndexedDB
  const { clearDraft } = useAutosave(currentNote, {
    onRestore: setCurrentNote,
  });

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
        return [deriveNoteSummary(data as NotePayload), ...prev];
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
        next[index] = deriveNoteSummary(data as NotePayload);
        return next;
      });
      void saveNoteDetail(data as NotePayload);
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
      void deleteNoteDetail(noteId);
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
    const ownerId = isAuthenticated && userId ? userId : null;
    setCurrentNote(buildNewNote(ownerId));
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
    const ownerId = isAuthenticated && userId ? userId : null;
    setCurrentNote(buildNewNote(ownerId, { title, content, tags: ["shared"] }));
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
    };

    const applyLocal = (note: NotePayload) => {
      const summary = deriveNoteSummary(note);
      setNotes((prev) => {
        const existingIndex = prev.findIndex((n) => n.id === summary.id);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = summary;
          return next;
        }
        return [summary, ...prev];
      });
    };

    const exists = notes.some((n) => n.id === baseNote.id);

    if (isAuthenticated) {
      try {
        const payload: Partial<NotePayload> = {
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
        await saveNoteDetail(saved);
        clearDraft(baseNote.id);
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
      try {
        await saveNoteDetail(baseNote);
        const localNotes = await getAllNotes();
        writeGuestLocalStorageNotes(localNotes);
      } catch {
        const localNotes = getGuestLocalStorageNotes();
        const existingIndex = localNotes.findIndex((note) => note.id === baseNote.id);
        const nextNotes = [...localNotes];
        if (existingIndex >= 0) {
          nextNotes[existingIndex] = baseNote;
        } else {
          nextNotes.unshift(baseNote);
        }
        writeGuestLocalStorageNotes(nextNotes);
      }
      clearDraft(baseNote.id);
      setCurrentNote(null);
    }

    setIsSavingNote(false);
  }, [
    currentNote,
    isAuthenticated,
    notes,
    updateNoteOnServer,
    createNoteOnServer,
    clearDraft,
    userId,
    setNotes,
    setCurrentNote,
    getGuestLocalStorageNotes,
    writeGuestLocalStorageNotes,
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
    openNote,
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
    handleTitleChange: currentNoteHook.handleTitleChange,
    handleContentChange: currentNoteHook.handleContentChange,
    handleDueDateChange: currentNoteHook.handleDueDateChange,
    handleClearDueDate: currentNoteHook.handleClearDueDate,
    handleCloseEditor,
    showCloseConfirmation,
    confirmClose,
    cancelClose,
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
    revisions: revisionsHook.revisions,
    isRevisionOpen: revisionsHook.isRevisionOpen,
    isLoadingRevisions: revisionsHook.isLoadingRevisions,
    revisionTargetId: revisionsHook.revisionTargetId,
    handleOpenRevisions: revisionsHook.handleOpenRevisions,
    handleCloseRevisions: revisionsHook.handleCloseRevisions,
    handleRestoreRevision: revisionsHook.handleRestoreRevision,
  };
};
