import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useUser } from "@clerk/nextjs";

import type {
  NotePayload,
  Attachment,
  NotebookPayload,
  NoteRevisionPayload,
  NotebookTreeNode,
  AccentPalette,
} from "@/types/note";
import {
  buildNotebookTree,
  buildNotebookOptions,
  parseInputToIso,
  generateId,
  toBase64,
  pickAccessibleTextColor,
  hexToRgba,
} from "@/components/note-app/util";
import {
  ACCENT_PALETTES,
  ACCENT_STORAGE_KEY,
  DEFAULT_ACCENT,
  THEME_STORAGE_KEY,
} from "@/components/note-app/constants";
import {
  hapticError,
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from "@/lib/haptics";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: string }>;
};

type NoteAppSection = "notes" | "archive" | "bin";

export const useNoteApp = () => {
  const [notes, setNotes] = useState<NotePayload[]>([]);
  const [currentNote, setCurrentNote] = useState<NotePayload | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      const stored = window.localStorage?.getItem(THEME_STORAGE_KEY);
      if (stored === "dark") {
        return true;
      }
      if (stored === "light") {
        return false;
      }
      if (typeof window.matchMedia === "function") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
    } catch (error) {
      console.error("Failed to read theme preference", error);
    }
    return false;
  });
  const [showSidebar, setShowSidebar] = useState(false);
  const [filterTag, setFilterTag] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"updated" | "created" | "title">(
    "updated"
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showIosInstallTip, setShowIosInstallTip] = useState(false);
  const [activeSection, setActiveSection] =
    useState<NoteAppSection>("notes");
  const [accent, setAccent] = useState<AccentPalette>(() => {
    if (typeof window === "undefined") return DEFAULT_ACCENT;
    try {
      const raw = window.localStorage?.getItem(ACCENT_STORAGE_KEY);
      if (!raw) return DEFAULT_ACCENT;
      const parsed = JSON.parse(raw) as AccentPalette;
      if (parsed?.id && parsed?.primary && parsed?.accent) {
        return parsed;
      }
    } catch (error) {
      console.error("Failed to read accent palette", error);
    }
    return DEFAULT_ACCENT;
  });
  const [notebooks, setNotebooks] = useState<NotebookPayload[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string>("all");
  const [revisions, setRevisions] = useState<NoteRevisionPayload[]>([]);
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);
  const [revisionTargetId, setRevisionTargetId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");
  const [newNotebookParent, setNewNotebookParent] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeSection !== "notes") {
      setCurrentNote(null);
    }
  }, [activeSection]);

  const { user } = useUser();
  const userFirstName = (user as { firstName?: string } | null)?.firstName ?? null;
  const userId = user?.id ?? null;
  const isAuthenticated = Boolean(userId);
  const storageKey = `notemaster-notes-${userId ?? "guest"}`;

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
    async (payload: { name: string; parentId?: string | null; color?: string }) => {
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
    return (await response.json()) as { success: boolean; releasedNotes: number };
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

  const handleSelectAccent = useCallback((palette: AccentPalette) => {
    setAccent(palette);
  }, []);

  const handleSelectNotebookFilter = useCallback((notebookId: string) => {
    setActiveNotebookId(notebookId);
  }, []);

  const handleCreateNotebook = useCallback(async () => {
    const name = newNotebookName.trim();
    if (!name) return;

    setIsCreatingNotebook(true);

    const resetForm = () => {
      setNewNotebookName("");
      setNewNotebookParent(null);
      setIsCreatingNotebook(false);
    };

    try {
      if (isAuthenticated) {
        const created = await createNotebookOnServer({
          name,
          parentId: newNotebookParent,
        });
        setNotebooks((prev) => [created, ...prev]);
      } else {
        const now = new Date().toISOString();
        const created: NotebookPayload = {
          id: generateId(),
          userId: "guest",
          name,
          parentId: newNotebookParent ?? null,
          color: DEFAULT_ACCENT.primary,
          createdAt: now,
          updatedAt: now,
        };
        setNotebooks((prev) => [created, ...prev]);
      }
    } catch (error) {
      console.error("Failed to create notebook", error);
    } finally {
      resetForm();
    }
  }, [
    newNotebookName,
    newNotebookParent,
    isAuthenticated,
    createNotebookOnServer,
  ]);

  const handleDeleteNotebook = useCallback(
    async (id: string) => {
      try {
        if (isAuthenticated) {
          await deleteNotebookOnServer(id);
        }

        setNotebooks((prev) => prev.filter((notebook) => notebook.id !== id));
        setNotes((prev) =>
          prev.map((note) =>
            note.notebookId === id ? { ...note, notebookId: null } : note
          )
        );

        if (activeNotebookId === id) {
          setActiveNotebookId("all");
        }
      } catch (error) {
        console.error("Failed to delete notebook", error);
      }
    },
    [activeNotebookId, deleteNotebookOnServer, isAuthenticated]
  );

  const handleOpenRevisions = useCallback(
    async (noteId: string) => {
      setIsRevisionOpen(true);
      setRevisionTargetId(noteId);
      if (!isAuthenticated) {
        setRevisions([]);
        return;
      }
      setIsLoadingRevisions(true);
      try {
        const history = await fetchRevisionsFromServer(noteId);
        setRevisions(history);
      } catch (error) {
        console.error("Failed to load revisions", error);
        setRevisions([]);
      } finally {
        setIsLoadingRevisions(false);
      }
    },
    [fetchRevisionsFromServer, isAuthenticated]
  );

  const handleCloseRevisions = useCallback(() => {
    setIsRevisionOpen(false);
    setRevisionTargetId(null);
    setRevisions([]);
  }, []);

  const handleRestoreRevision = useCallback(
    async (noteId: string, revisionId: string) => {
      if (!isAuthenticated) return;

      try {
        const response = await fetch(`/api/notes/${noteId}/revisions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revisionId }),
        });

        if (!response.ok) {
          throw new Error("Failed to restore revision");
        }

        const restored = (await response.json()) as NotePayload;
        setNotes((prev) =>
          prev.map((note) => (note.id === restored.id ? restored : note))
        );
        setCurrentNote(restored);
        handleCloseRevisions();
      } catch (error) {
        console.error("Failed to restore revision", error);
      }
    },
    [handleCloseRevisions, isAuthenticated]
  );

  const triggerAttachmentPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAttachmentsSelected = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || !currentNote) return;

      try {
        const attachments: Attachment[] = [];
        for (const file of Array.from(files)) {
          const data = await toBase64(file);
          attachments.push({
            id: generateId(),
            name: file.name,
            type: file.type,
            size: file.size,
            data,
          });
        }

        setCurrentNote({
          ...currentNote,
          attachments: [...currentNote.attachments, ...attachments],
        });
      } catch (error) {
        console.error("Failed to attach files", error);
      } finally {
        event.target.value = "";
      }
    },
    [currentNote]
  );

  const handleRemoveAttachment = useCallback(
    (attachmentId: string) => {
      if (!currentNote) return;
      setCurrentNote({
        ...currentNote,
        attachments: currentNote.attachments.filter((item) => item.id !== attachmentId),
      });
    },
    [currentNote]
  );

  const handleDownloadAttachment = useCallback((attachment: Attachment) => {
    try {
      const link = document.createElement("a");
      link.href = attachment.data;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download attachment", error);
    }
  }, []);

  const handleClearAttachments = useCallback(() => {
    setCurrentNote((prev) => (prev ? { ...prev, attachments: [] } : prev));
  }, []);

  const handleNotebookChange = useCallback((notebookId: string | null) => {
    setCurrentNote((prev) => (prev ? { ...prev, notebookId } : prev));
  }, []);

  const handleTitleChange = useCallback((value: string) => {
    setCurrentNote((prev) => (prev ? { ...prev, title: value } : prev));
  }, []);

  const handleContentChange = useCallback((value: string) => {
    setCurrentNote((prev) => (prev ? { ...prev, content: value } : prev));
  }, []);

  const handleDueDateChange = useCallback((value: string) => {
    const iso = parseInputToIso(value);
    setCurrentNote((prev) => (prev ? { ...prev, dueAt: iso } : prev));
  }, []);

  const handleClearDueDate = useCallback(() => {
    setCurrentNote((prev) => (prev ? { ...prev, dueAt: null } : prev));
  }, []);

  const handleCloseEditor = useCallback(() => {
    setCurrentNote(null);
  }, []);

  const togglePreview = useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  const addChecklistItem = useCallback(() => {
    if (currentNote) {
      setCurrentNote({
        ...currentNote,
        checklist: [
          ...currentNote.checklist,
          { id: generateId(), text: "", checked: false },
        ],
      });
    }
  }, [currentNote]);

  const markAllChecklist = useCallback(
    (checked: boolean) => {
      if (currentNote) {
        setCurrentNote({
          ...currentNote,
          checklist: currentNote.checklist.map((item) => ({
            ...item,
            checked,
          })),
        });
      }
    },
    [currentNote]
  );

  const clearCompletedChecklist = useCallback(() => {
    if (currentNote) {
      setCurrentNote({
        ...currentNote,
        checklist: currentNote.checklist.filter((i) => !i.checked),
      });
    }
  }, [currentNote]);

  const updateChecklistItem = useCallback(
    (itemId: string, field: "text" | "checked", value: string | boolean) => {
      if (currentNote) {
        setCurrentNote({
          ...currentNote,
          checklist: currentNote.checklist.map((item) =>
            item.id === itemId ? { ...item, [field]: value as never } : item
          ),
        });
      }
    },
    [currentNote]
  );

  const deleteChecklistItem = useCallback(
    (itemId: string) => {
      if (currentNote) {
        setCurrentNote({
          ...currentNote,
          checklist: currentNote.checklist.filter((item) => item.id !== itemId),
        });
      }
    },
    [currentNote]
  );

  const addTag = useCallback(
    (tag: string) => {
      if (currentNote && tag && !currentNote.tags.includes(tag)) {
        setCurrentNote({
          ...currentNote,
          tags: [...currentNote.tags, tag],
        });
      }
    },
    [currentNote]
  );

  const removeTag = useCallback(
    (tag: string) => {
      if (currentNote) {
        setCurrentNote({
          ...currentNote,
          tags: currentNote.tags.filter((t) => t !== tag),
        });
      }
    },
    [currentNote]
  );

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch =
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = filterTag === "all" || note.tags.includes(filterTag);
      const matchesNotebook =
        activeNotebookId === "all" || note.notebookId === activeNotebookId;

      if (!matchesSearch || !matchesTag || !matchesNotebook) return false;

      if (activeSection === "notes") return !note.archived && !note.trashed;
      if (activeSection === "archive") return note.archived && !note.trashed;
      if (activeSection === "bin") return note.trashed;

      return false;
    });
  }, [notes, searchQuery, filterTag, activeSection, activeNotebookId]);

  const allTags = useMemo(
    () => [...new Set(notes.flatMap((note) => note.tags))],
    [notes]
  );

  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (activeSection === "notes") {
        const pinnedDiff = Number(b.pinned) - Number(a.pinned);
        if (pinnedDiff !== 0) return pinnedDiff;
      }

      if (sortBy === "title")
        return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "created")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredNotes, sortBy, activeSection]);

  const notebookTree = useMemo(
    () => buildNotebookTree(notebooks),
    [notebooks]
  );

  const notebooksById = useMemo(() => {
    const map = new Map<string, NotebookPayload>();
    notebooks.forEach((notebook) => map.set(notebook.id, notebook));
    return map;
  }, [notebooks]);

  const notebookOptions = useMemo(
    () => buildNotebookOptions(notebookTree),
    [notebookTree]
  );

  const sectionCounts = useMemo(
    () => ({
      notes: notes.filter((note) => !note.archived && !note.trashed).length,
      archive: notes.filter((note) => note.archived && !note.trashed).length,
      bin: notes.filter((note) => note.trashed).length,
    }),
    [notes]
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (darkMode) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [darkMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage?.setItem(
        THEME_STORAGE_KEY,
        darkMode ? "dark" : "light"
      );
    } catch (error) {
      console.error("Failed to persist theme preference", error);
    }
  }, [darkMode]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handler as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const matchStandalone = window.matchMedia("(display-mode: standalone)");

    const isStandalone = () =>
      matchStandalone.matches ||
      // @ts-expect-error standalone is only available in certain browsers
      window.navigator.standalone === true;

    const isiOSSafari = () => {
      const navigatorAny = window.navigator as Navigator & {
        platform?: string;
        maxTouchPoints?: number;
      } & { standalone?: boolean };
      const ua = navigatorAny.userAgent || "";
      const platform = navigatorAny.platform || "";
      const maxTouchPoints = navigatorAny.maxTouchPoints ?? 0;
      const iOSDevice =
        /iPad|iPhone|iPod/i.test(ua) ||
        (platform === "MacIntel" && maxTouchPoints > 1);
      const isSafari =
        /Safari/i.test(ua) &&
        !/Chrome/i.test(ua) &&
        !/CriOS/i.test(ua) &&
        !/FxiOS/i.test(ua);
      return iOSDevice && isSafari;
    };

    const updateInstallState = () => {
      if (isStandalone()) {
        setCanInstall(false);
        setShowIosInstallTip(false);
        return;
      }

      if (isiOSSafari()) {
        setShowIosInstallTip(true);
      }
    };

    updateInstallState();

    const handleChange = () => updateInstallState();

    if (matchStandalone.addEventListener) {
      matchStandalone.addEventListener("change", handleChange);
      return () => {
        matchStandalone.removeEventListener("change", handleChange);
      };
    }

    return undefined;
  }, []);

  const loadNotesAndNotebooks = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated) {
        const [remoteNotes, remoteNotebooks] = await Promise.all([
          fetchNotesFromServer(),
          fetchNotebooksFromServer(),
        ]);
        setNotes(remoteNotes);
        setNotebooks(remoteNotebooks);
      } else if (typeof window !== "undefined" && window.localStorage) {
        const rawNotes = window.localStorage.getItem(storageKey);
        const rawNotebooks = window.localStorage.getItem(`${storageKey}-notebooks`);
        setNotes(rawNotes ? JSON.parse(rawNotes) : []);
        setNotebooks(rawNotebooks ? JSON.parse(rawNotebooks) : []);
      } else {
        setNotes([]);
        setNotebooks([]);
      }
    } catch (error) {
      console.error("Failed to load workspace", error);
      if (!isAuthenticated) {
        setNotes([]);
        setNotebooks([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    isAuthenticated,
    storageKey,
    fetchNotesFromServer,
    fetchNotebooksFromServer,
  ]);

  useEffect(() => {
    loadNotesAndNotebooks();
  }, [loadNotesAndNotebooks]);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(storageKey, JSON.stringify(notes));
        }
      } catch (err) {
        console.error("Failed to save notes:", err);
      }
    }
  }, [notes, isLoading, isAuthenticated, storageKey]);

  useEffect(() => {
    if (!isAuthenticated && typeof window !== "undefined") {
      try {
        window.localStorage?.setItem(
          `${storageKey}-notebooks`,
          JSON.stringify(notebooks)
        );
      } catch (error) {
        console.error("Failed to save notebooks", error);
      }
    }
  }, [notebooks, isAuthenticated, storageKey]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const accentForeground = pickAccessibleTextColor(accent.primary);
    const accentRing = hexToRgba(accent.primary, 0.45);
    const accentSoft = hexToRgba(accent.primary, 0.12);
    root.style.setProperty("--accent-foreground", accentForeground);
    root.style.setProperty("--accent-primary", accent.primary);
    root.style.setProperty("--accent-secondary", accent.accent);
    root.style.setProperty("--interactive-accent", accent.primary);
    root.style.setProperty("--interactive-accent-strong", accent.accent);
    root.style.setProperty("--interactive-accent-contrast", accentForeground);
    root.style.setProperty("--interactive-accent-soft", accentSoft);
    root.style.setProperty("--interactive-accent-ring", accentRing);
    if (typeof window !== "undefined") {
      try {
        window.localStorage?.setItem(ACCENT_STORAGE_KEY, JSON.stringify(accent));
      } catch (error) {
        console.error("Failed to persist accent", error);
      }
    }
  }, [accent]);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === "accepted") {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const createNote = useCallback(() => {
    setActiveSection("notes");
    hapticLight();
    const now = new Date().toISOString();
    const ownerId = isAuthenticated && userId ? userId : null;
    const newNote: NotePayload = {
      id: generateId(),
      userId: ownerId,
      notebookId: activeNotebookId === "all" ? null : activeNotebookId,
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
  }, [isAuthenticated, userId, activeNotebookId]);

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
  ]);

  const togglePin = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

      hapticLight();

      const optimistic: NotePayload = {
        ...existing,
        pinned: !existing.pinned,
        updatedAt: new Date().toISOString(),
      };

      setNotes((prev) =>
        prev.map((note) => (note.id === id ? optimistic : note))
      );

      if (isAuthenticated) {
        try {
          const saved = await updateNoteOnServer(id, {
            pinned: optimistic.pinned,
          });
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? saved : note))
          );
        } catch (error) {
          console.error("Failed to toggle pin", error);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? existing : note))
          );
        }
      }
    },
    [notes, isAuthenticated, updateNoteOnServer]
  );

  const archiveNote = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

      hapticMedium();

      const optimistic: NotePayload = {
        ...existing,
        archived: true,
        pinned: false,
        updatedAt: new Date().toISOString(),
      };

      setNotes((prev) =>
        prev.map((note) => (note.id === id ? optimistic : note))
      );

      if (isAuthenticated) {
        try {
          const saved = await updateNoteOnServer(id, {
            archived: true,
            pinned: false,
          });
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? saved : note))
          );
        } catch (error) {
          console.error("Failed to archive note", error);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? existing : note))
          );
        }
      }
    },
    [notes, isAuthenticated, updateNoteOnServer]
  );

  const unarchiveNote = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

      hapticMedium();

      const optimistic: NotePayload = {
        ...existing,
        archived: false,
        updatedAt: new Date().toISOString(),
      };

      setNotes((prev) =>
        prev.map((note) => (note.id === id ? optimistic : note))
      );

      if (isAuthenticated) {
        try {
          const saved = await updateNoteOnServer(id, {
            archived: false,
          });
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? saved : note))
          );
        } catch (error) {
          console.error("Failed to unarchive note", error);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? existing : note))
          );
        }
      }
    },
    [notes, isAuthenticated, updateNoteOnServer]
  );

  const trashNote = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

      hapticMedium();

      const optimistic: NotePayload = {
        ...existing,
        trashed: true,
        archived: false,
        pinned: false,
        updatedAt: new Date().toISOString(),
      };

      const wasCurrent = currentNote?.id === id;

      setNotes((prev) =>
        prev.map((note) => (note.id === id ? optimistic : note))
      );
      if (wasCurrent) setCurrentNote(null);

      if (isAuthenticated) {
        try {
          const saved = await updateNoteOnServer(id, {
            trashed: true,
            archived: false,
            pinned: false,
          });
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? saved : note))
          );
        } catch (error) {
          console.error("Failed to move note to bin", error);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? existing : note))
          );
          if (wasCurrent) setCurrentNote(existing);
        }
      }
    },
    [notes, currentNote, isAuthenticated, updateNoteOnServer]
  );

  const restoreFromBin = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

      hapticSuccess();

      const optimistic: NotePayload = {
        ...existing,
        trashed: false,
        archived: false,
        updatedAt: new Date().toISOString(),
      };

      setNotes((prev) =>
        prev.map((note) => (note.id === id ? optimistic : note))
      );

      if (isAuthenticated) {
        try {
          const saved = await updateNoteOnServer(id, {
            trashed: false,
            archived: false,
          });
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? saved : note))
          );
        } catch (error) {
          console.error("Failed to restore note", error);
          setNotes((prev) =>
            prev.map((note) => (note.id === id ? existing : note))
          );
        }
      }
    },
    [notes, isAuthenticated, updateNoteOnServer]
  );

  const deleteForever = useCallback(
    async (id: string) => {
      const index = notes.findIndex((n) => n.id === id);
      if (index === -1) return;
      const existing = notes[index];
      const wasCurrent = currentNote?.id === id;

      hapticError();

      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (wasCurrent) setCurrentNote(null);

      if (isAuthenticated) {
        try {
          await deleteNoteOnServer(id);
        } catch (error) {
          console.error("Failed to delete note", error);
          setNotes((prev) => {
            const next = [...prev];
            next.splice(index, 0, existing);
            return next;
          });
          if (wasCurrent) setCurrentNote(existing);
        }
      }
    },
    [notes, currentNote, isAuthenticated, deleteNoteOnServer]
  );

  const exportNotes = useCallback(() => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notemaster-notes-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [notes]);

  const importNotes = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          if (Array.isArray(data)) {
            const map = new Map<string, NotePayload>(notes.map((n) => [n.id, n]));
            for (const n of data) map.set(n.id, n as NotePayload);
            setNotes(Array.from(map.values()));
          }
        } catch (error) {
          console.error("Failed to import notes", error);
        }
      };
      reader.readAsText(file);
    },
    [notes]
  );

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
    accentPalettes: ACCENT_PALETTES,
    handleSelectAccent,
    canInstall,
    installApp,
    showIosInstallTip,
    setShowIosInstallTip,
    showPreview,
    togglePreview,
    createNote,
    saveCurrentNote,
    isSavingNote,
    triggerAttachmentPicker,
    handleAttachmentsSelected,
    handleRemoveAttachment,
    handleDownloadAttachment,
    handleClearAttachments,
    handleNotebookChange,
    handleTitleChange,
    handleContentChange,
    handleDueDateChange,
    handleClearDueDate,
    handleCloseEditor,
    fileInputRef,
    addChecklistItem,
    markAllChecklist,
    clearCompletedChecklist,
    updateChecklistItem,
    deleteChecklistItem,
    addTag,
    removeTag,
    togglePin,
    archiveNote,
    unarchiveNote,
    trashNote,
    restoreFromBin,
    deleteForever,
    exportNotes,
    importNotes,
    notebooks,
    notebookTree,
    notebooksById,
    notebookOptions,
    newNotebookName,
    setNewNotebookName,
    newNotebookParent,
    setNewNotebookParent,
    isCreatingNotebook,
    handleCreateNotebook,
    activeNotebookId,
    handleSelectNotebookFilter,
    handleDeleteNotebook,
    revisions,
    isRevisionOpen,
    isLoadingRevisions,
    revisionTargetId,
    handleOpenRevisions,
    handleCloseRevisions,
    handleRestoreRevision,
  };
};
