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
import { useNoteServerActions } from "./useNoteServerActions";
import { useSharedNoteImport } from "./useSharedNoteImport";
import type { NotePayload, NoteSummaryPayload, SectionKey } from "@/types/note";
import { deriveNoteSummary } from "@/types/note";
import { buildNewNote } from "@/components/note-app/util";
import { NOTE_ORDER_STORAGE_KEY } from "@/components/note-app/constants";
import { hapticLight } from "@/lib/haptics";
import { useSSE } from "@/lib/use-sse";
import { addToPendingSync } from "@/lib/indexeddb";
import {
  deleteNoteDetail,
  getNoteDetail,
  saveNoteDetail,
} from "@/lib/indexeddb";
import { isOnline } from "@/lib/background-sync";

export const useNoteApp = () => {
  const { user } = useUser();
  const userFirstName =
    (user as { firstName?: string } | null)?.firstName ?? null;
  const userId = user?.id ?? null;
  const isAuthenticated = Boolean(userId);
  const storageKey = `notemaster-notes-${userId ?? "guest"}`;

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
      const parsed = stored ? (JSON.parse(stored) as string[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to read note order", error);
      return [];
    }
  });

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
  const serverActions = useNoteServerActions();

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
      fetchNoteSummariesFromServer: serverActions.fetchNoteSummariesFromServer,
    },
    userId
  );

  const filterCriteria = useMemo(
    () => ({
      section: activeSection,
      search: searchQuery,
      tag: filterTag,
      sortBy,
    }),
    [activeSection, searchQuery, filterTag, sortBy]
  );

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
            const fullNote = await serverActions.fetchNoteFromServer(summary.id);
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

        toast.error("Unable to open note. The full note was not found locally.");
      } catch (error) {
        console.error("Failed to open note", error);
        toast.error("Failed to open note. Please try again.");
      }
    },
    [
      serverActions,
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
      updateNoteOnServer: serverActions.updateNoteOnServer,
      deleteNoteOnServer: serverActions.deleteNoteOnServer,
    }
  );

  const currentNoteHook = useCurrentNote({ currentNote, setCurrentNote });
  const { hasUnsavedChanges } = useUnsavedChangesWarning(currentNote);
  const { clearDraft } = useAutosave(currentNote, {
    onRestore: setCurrentNote,
  });

  const revisionsHook = useNoteRevisions(
    { setNotes, setCurrentNote },
    isAuthenticated,
    {
      fetchRevisionsFromServer: serverActions.fetchRevisionsFromServer,
    }
  );

  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const currentNoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentNoteIdRef.current = currentNote?.id ?? null;
  }, [currentNote?.id]);

  const handleCloseEditor = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowCloseConfirmation(true);
    } else {
      setCurrentNote(null);
    }
  }, [hasUnsavedChanges]);

  const confirmClose = useCallback(() => {
    setShowCloseConfirmation(false);
    setCurrentNote(null);
  }, []);

  const cancelClose = useCallback(() => {
    setShowCloseConfirmation(false);
  }, []);

  const createNote = useCallback(() => {
    setActiveSection("notes");
    hapticLight();
    const ownerId = isAuthenticated && userId ? userId : null;
    setCurrentNote(buildNewNote(ownerId));
    setShowSidebar(false);
  }, [isAuthenticated, userId]);

  const createNoteFromShare = useCallback(
    (title: string, content: string) => {
      setActiveSection("notes");
      hapticLight();
      const ownerId = isAuthenticated && userId ? userId : null;
      setCurrentNote(
        buildNewNote(ownerId, { title, content, tags: ["shared"] })
      );
      setShowSidebar(false);
    },
    [isAuthenticated, userId]
  );

  useSharedNoteImport(createNoteFromShare);

  const applyLocal = useCallback((note: NotePayload) => {
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
  }, [setNotes]);

  const saveCurrentNote = useCallback(async () => {
    if (!currentNote) return;

    const hasContent =
      Boolean(currentNote.title?.trim()) ||
      Boolean(currentNote.content?.trim()) ||
      currentNote.checklist.length > 0 ||
      currentNote.attachments.length > 0;

    if (!hasContent) return;

    setIsSavingNote(true);

    const updatedAt = new Date().toISOString();
    const ownerId = isAuthenticated && userId ? userId : null;
    const baseNote: NotePayload = {
      ...currentNote,
      userId: ownerId,
      updatedAt,
      dueAt: currentNote.dueAt ?? null,
    };
    const exists = notes.some((n) => n.id === baseNote.id);

    if (!isAuthenticated) {
      applyLocal(baseNote);
      await saveNoteDetail(baseNote);
      clearDraft(baseNote.id);
      setCurrentNote(null);
      setIsSavingNote(false);
      return;
    }

    if (!isOnline()) {
      applyLocal(baseNote);
      await addToPendingSync({
        type: exists ? "update" : "create",
        entity: "note",
        entityId: baseNote.id,
        data: baseNote,
      });
      clearDraft(baseNote.id);
      setCurrentNote(null);
      setIsSavingNote(false);
      toast.success(exists ? "Note updated and queued for sync" : "Note created and queued for sync");
      return;
    }

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
        ? await serverActions.updateNoteOnServer(baseNote.id, payload)
        : await serverActions.createNoteOnServer(baseNote);
      applyLocal(saved);
      await saveNoteDetail(saved);
      clearDraft(baseNote.id);
      setCurrentNote(null);
      toast.success(exists ? "Note updated" : "Note created");
    } catch (error) {
      console.error("Failed to save note", error);
      if (error instanceof TypeError || error instanceof DOMException) {
        applyLocal(baseNote);
        await addToPendingSync({
          type: exists ? "update" : "create",
          entity: "note",
          entityId: baseNote.id,
          data: baseNote,
        });
        clearDraft(baseNote.id);
        setCurrentNote(null);
        toast.success(exists ? "Note updated and queued for sync" : "Note created and queued for sync");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to save note";
        toast.error(
          errorMessage.includes("Too many requests")
            ? "Too many requests. Please wait a moment and try again."
            : errorMessage
        );
      }
    } finally {
      setIsSavingNote(false);
    }
  }, [
    applyLocal,
    clearDraft,
    currentNote,
    isAuthenticated,
    notes,
    serverActions,
    userId,
  ]);

  const applyRemoteNote = useCallback(
    (note: NotePayload, { insertIfMissing }: { insertIfMissing: boolean }) => {
      const summary = deriveNoteSummary(note);
      setNotes((prev) => {
        const index = prev.findIndex((n) => n.id === note.id);
        if (index === -1) {
          return insertIfMissing ? [summary, ...prev] : prev;
        }
        const next = [...prev];
        next[index] = summary;
        return next;
      });
      void saveNoteDetail(note);
    },
    [setNotes]
  );

  /**
   * Events for large notes arrive without a payload (the Postgres NOTIFY size
   * cap), so pull the note by id rather than dropping the update.
   */
  const fetchAndApplyRemoteNote = useCallback(
    async (noteId: string, insertIfMissing: boolean) => {
      try {
        const note = await serverActions.fetchNoteFromServer(noteId);
        applyRemoteNote(note, { insertIfMissing });
      } catch (error) {
        console.error("Failed to fetch note for realtime event", error);
      }
    },
    [applyRemoteNote, serverActions]
  );

  const handleSseNoteCreated = useCallback(
    (noteId: string, data?: Partial<NotePayload>) => {
      if (!data) {
        void fetchAndApplyRemoteNote(noteId, true);
        return;
      }
      applyRemoteNote(data as NotePayload, { insertIfMissing: true });
    },
    [applyRemoteNote, fetchAndApplyRemoteNote]
  );

  const handleSseNoteUpdated = useCallback(
    (noteId: string, data?: Partial<NotePayload>) => {
      if (!data) {
        void fetchAndApplyRemoteNote(noteId, false);
        return;
      }
      applyRemoteNote(data as NotePayload, { insertIfMissing: false });
    },
    [applyRemoteNote, fetchAndApplyRemoteNote]
  );

  const handleSseNoteDeleted = useCallback(
    (noteId: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (currentNoteIdRef.current === noteId) {
        setCurrentNote(null);
      }
      void deleteNoteDetail(noteId);
    },
    [setNotes]
  );

  useSSE(
    useMemo(
      () => ({
        onNoteCreated: handleSseNoteCreated,
        onNoteUpdated: handleSseNoteUpdated,
        onNoteDeleted: handleSseNoteDeleted,
      }),
      [handleSseNoteCreated, handleSseNoteDeleted, handleSseNoteUpdated]
    ),
    { enabled: isAuthenticated }
  );

  useEffect(() => {
    if (activeSection !== "notes" && currentNote) {
      const timer = setTimeout(() => {
        setCurrentNote(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeSection, currentNote]);

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
    isRestoringRevision: revisionsHook.isRestoringRevision,
    revisionTargetId: revisionsHook.revisionTargetId,
    handleOpenRevisions: revisionsHook.handleOpenRevisions,
    handleCloseRevisions: revisionsHook.handleCloseRevisions,
    handleRestoreRevision: revisionsHook.handleRestoreRevision,
  };
};
