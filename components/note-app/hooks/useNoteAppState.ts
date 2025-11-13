import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useTheme } from "./useTheme";
import { usePWA } from "./usePWA";
import { useAccent } from "./useAccent";
import { useSmartFilters } from "./useSmartFilters";
import { useNotes } from "./useNotes";
import { useNotebooks } from "./useNotebooks";
import { useCurrentNote } from "./useCurrentNote";
import { useNoteRevisions } from "./useNoteRevisions";
import { useNoteData } from "./useNoteData";
import { useNoteFiltering } from "./useNoteFiltering";

import type {
  NotePayload,
  NoteRevisionPayload,
  NotebookPayload,
} from "@/types/note";
import { generateId } from "@/components/note-app/util";
import { NOTE_ORDER_STORAGE_KEY } from "@/components/note-app/constants";
import { hapticLight } from "@/lib/haptics";

type NoteAppSection = "notes" | "archive" | "bin";

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
  const [showPreview, setShowPreview] = useState(false);
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
    const response = await fetch("/api/notes", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch notes");
    }
    return (await response.json()) as NotePayload[];
  }, []);

  const fetchNotebooksFromServer = useCallback(async () => {
    const response = await fetch("/api/notebooks", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch notebooks");
    }
    return (await response.json()) as NotebookPayload[];
  }, []);

  const createNotebookOnServer = useCallback(
    async (payload: {
      name: string;
      parentId?: string | null;
      color?: string;
    }) => {
      const response = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to create notebook");
      }
      return (await response.json()) as NotebookPayload;
    },
    []
  );

  const deleteNotebookOnServer = useCallback(async (id: string) => {
    const response = await fetch(`/api/notebooks/${id}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error("Failed to delete notebook");
    }
    return (await response.json()) as {
      success: boolean;
      releasedNotes: number;
    };
  }, []);

  const fetchRevisionsFromServer = useCallback(async (id: string) => {
    const response = await fetch(`/api/notes/${id}/revisions`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Failed to fetch revisions");
    }
    return (await response.json()) as NoteRevisionPayload[];
  }, []);

  const createNoteOnServer = useCallback(async (note: NotePayload) => {
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note),
    });
    if (!response.ok) {
      throw new Error("Failed to create note");
    }
    return (await response.json()) as NotePayload;
  }, []);

  const updateNoteOnServer = useCallback(
    async (id: string, updates: Partial<NotePayload>) => {
      const response = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error("Failed to update note");
      }
      return (await response.json()) as NotePayload;
    },
    []
  );

  const deleteNoteOnServer = useCallback(async (id: string) => {
    const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error("Failed to delete note");
    }
  }, []);

  // Data loading
  const { notes, setNotes, notebooks, setNotebooks, isLoading } = useNoteData(
    isAuthenticated,
    storageKey,
    {
      fetchNotesFromServer,
      fetchNotebooksFromServer,
    }
  );

  // Notebooks management
  const notebooksHook = useNotebooks(
    {
      notebooks,
      setNotebooks,
      notes: notes as Array<{ notebookId: string | null }>,
      setNotes: setNotes as React.Dispatch<
        React.SetStateAction<Array<{ notebookId: string | null }>>
      >,
    },
    isAuthenticated,
    userId,
    storageKey,
    {
      createNotebookOnServer,
      deleteNotebookOnServer,
    }
  );

  // Smart filters
  const smartFiltersHook = useSmartFilters(
    activeSection,
    sortBy,
    searchQuery,
    filterTag,
    notebooksHook.activeNotebookId
  );

  // Note filtering and sorting
  const { sortedNotes, allTags, sectionCounts } = useNoteFiltering(
    notes,
    smartFiltersHook.currentSmartFilterCriteria,
    activeSection,
    sortBy,
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

  // Current note editing
  const currentNoteHook = useCurrentNote({ currentNote, setCurrentNote });

  // Revisions
  const revisionsHook = useNoteRevisions(
    { notes, setNotes, currentNote, setCurrentNote },
    isAuthenticated,
    {
      fetchRevisionsFromServer,
    }
  );

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
      notebookId:
        notebooksHook.activeNotebookId === "all"
          ? null
          : notebooksHook.activeNotebookId,
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
    notebooksHook.activeNotebookId,
    setCurrentNote,
    setActiveSection,
    setShowSidebar,
  ]);

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
      } catch (error) {
        console.error("Failed to save note", error);
        setIsSavingNote(false);
        return;
      }
    } else {
      applyLocal(baseNote);
      setCurrentNote(baseNote);
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

  const togglePreview = useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  return {
    isLoading,
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
    smartFilters: smartFiltersHook.smartFilters,
    activeSmartFilterId: smartFiltersHook.activeSmartFilterId,
    currentSmartFilterCriteria: smartFiltersHook.currentSmartFilterCriteria,
    canSaveSmartFilter: smartFiltersHook.canSaveSmartFilter,
    addSmartFilter: smartFiltersHook.addSmartFilter,
    updateSmartFilter: smartFiltersHook.updateSmartFilter,
    removeSmartFilter: smartFiltersHook.removeSmartFilter,
    applySmartFilter: smartFiltersHook.applySmartFilter,
    customOrder,
    setCustomOrder,
    canInstall,
    installApp,
    showIosInstallTip,
    setShowIosInstallTip,
    showPreview,
    togglePreview,
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
    notebooks: notebooksHook.notebooks,
    notebookTree: notebooksHook.notebookTree,
    notebooksById: notebooksHook.notebooksById,
    notebookOptions: notebooksHook.notebookOptions,
    newNotebookName: notebooksHook.newNotebookName,
    setNewNotebookName: notebooksHook.setNewNotebookName,
    newNotebookParent: notebooksHook.newNotebookParent,
    setNewNotebookParent: notebooksHook.setNewNotebookParent,
    isCreatingNotebook: notebooksHook.isCreatingNotebook,
    handleCreateNotebook: notebooksHook.handleCreateNotebook,
    activeNotebookId: notebooksHook.activeNotebookId,
    handleSelectNotebookFilter: notebooksHook.handleSelectNotebookFilter,
    handleDeleteNotebook: notebooksHook.handleDeleteNotebook,
    revisions: revisionsHook.revisions,
    isRevisionOpen: revisionsHook.isRevisionOpen,
    isLoadingRevisions: revisionsHook.isLoadingRevisions,
    revisionTargetId: revisionsHook.revisionTargetId,
    handleOpenRevisions: revisionsHook.handleOpenRevisions,
    handleCloseRevisions: revisionsHook.handleCloseRevisions,
    handleRestoreRevision: revisionsHook.handleRestoreRevision,
  };
};
