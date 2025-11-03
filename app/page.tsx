/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  NotePayload,
  Attachment,
  NotebookPayload,
  NoteRevisionPayload,
  NotebookTreeNode,
  AccentPalette,
} from "@/types/note";
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  Check,
  Clock,
  Download,
  Eye,
  EyeOff,
  Folder,
  FolderPlus,
  History,
  Loader2,
  Menu,
  Moon,
  Palette as PaletteIcon,
  Paperclip,
  Pin,
  Plus,
  Search,
  Share,
  Sun,
  Tag,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const THEME_STORAGE_KEY = "notemaster-theme";
const ACCENT_STORAGE_KEY = "notemaster-accent";

const DEFAULT_ACCENT: AccentPalette = {
  id: "azure",
  name: "Azure",
  primary: "#2563EB",
  accent: "#1D4ED8",
};

const ACCENT_PALETTES: AccentPalette[] = [
  DEFAULT_ACCENT,
  { id: "violet", name: "Violet", primary: "#7C3AED", accent: "#5B21B6" },
  { id: "rose", name: "Rose", primary: "#E11D48", accent: "#BE123C" },
  { id: "pink", name: "Pink", primary: "#EC4899", accent: "#DB2777" },
  { id: "emerald", name: "Emerald", primary: "#10B981", accent: "#047857" },
  { id: "amber", name: "Amber", primary: "#F59E0B", accent: "#B45309" },
  { id: "olive", name: "Olive", primary: "#708238", accent: "#556B2F" },
];

const buildNotebookTree = (items: NotebookPayload[]): NotebookTreeNode[] => {
  const map = new Map<string, NotebookTreeNode>();
  const roots: NotebookTreeNode[] = [];

  items.forEach((notebook) => {
    map.set(notebook.id, { ...notebook, children: [] });
  });

  items.forEach((notebook) => {
    if (notebook.parentId && map.has(notebook.parentId)) {
      map.get(notebook.parentId)!.children.push(map.get(notebook.id)!);
    } else {
      roots.push(map.get(notebook.id)!);
    }
  });

  return roots.sort((a, b) => a.name.localeCompare(b.name));
};

const formatDateTimeForInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
};

const parseInputToIso = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const formatBytes = (size: number) => {
  if (!size) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1
  );
  const value = size / Math.pow(1024, exponent);
  const precision = value >= 10 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[exponent]}`;
};

type NotebookNodeProps = {
  node: NotebookTreeNode;
  activeId: string;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  depth?: number;
};

const NotebookNode = ({
  node,
  activeId,
  onSelect,
  onDelete,
  depth = 0,
}: NotebookNodeProps) => {
  const isActive = node.id === activeId;
  const hasChildren = node.children.length > 0;

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center justify-between rounded-md px-2 py-1 text-sm transition hover:bg-muted",
          isActive && "bg-muted"
        )}
        style={{ marginLeft: depth * 12 }}
      >
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => onSelect(node.id)}
        >
          <Folder className="size-4 text-muted-foreground" />
          <span className="truncate">{node.name}</span>
          {hasChildren && (
            <span className="text-xs text-muted-foreground">({node.children.length})</span>
          )}
        </button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(node.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      {hasChildren && (
        <div className="space-y-1">
          {node.children
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => (
              <NotebookNode
                key={child.id}
                node={child}
                activeId={activeId}
                onSelect={onSelect}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const generateId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const NoteApp = () => {
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
  const [deferredPrompt, setDeferredPrompt] = useState<{
    prompt: () => Promise<void>;
    userChoice?: Promise<{ outcome: string }>;
  } | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [showIosInstallTip, setShowIosInstallTip] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "notes" | "archive" | "bin"
  >("notes");
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
  const notebookTree = useMemo(() => buildNotebookTree(notebooks), [notebooks]);
  const notebooksById = useMemo(() => {
    const map = new Map<string, NotebookPayload>();
    notebooks.forEach((notebook) => map.set(notebook.id, notebook));
    return map;
  }, [notebooks]);
  const notebookOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];

    const walk = (nodes: NotebookTreeNode[], depth = 0) => {
      nodes
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((node) => {
          const indent = depth === 0 ? "" : `${"\u00A0".repeat(depth * 2)}↳ `;
          options.push({ id: node.id, label: `${indent}${node.name}` });
          walk(node.children, depth + 1);
        });
    };

    walk(notebookTree);
    return options;
  }, [notebookTree]);
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
  const userFirstName = (user as { firstName?: string } | null)?.firstName;
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

  const updateNotebookOnServer = useCallback(
    async (
      id: string,
      payload: { name?: string; color?: string; parentId?: string | null }
    ) => {
      const response = await fetch(`/api/notebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to update notebook");
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
    async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const sectionCounts = useMemo(
    () => ({
      notes: notes.filter((note) => !note.archived && !note.trashed).length,
      archive: notes.filter((note) => note.archived && !note.trashed).length,
      bin: notes.filter((note) => note.trashed).length,
    }),
    [notes]
  );

  // Sync `.dark` class on <html> so Tailwind dark: variants work
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

  // Capture install prompt for PWA
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      // @ts-expect-error beforeinstallprompt is not typed in TS lib
      setDeferredPrompt(e);
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

  // Detect standalone mode or show manual install hint on iOS Safari
  useEffect(() => {
    if (typeof window === "undefined") return;

    const matchStandalone = window.matchMedia("(display-mode: standalone)");

    const isStandalone = () =>
      matchStandalone.matches ||
      // @ts-expect-error standalone is only available in iOS Safari
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

  // Save notes to storage whenever they change (guests only)
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
    root.style.setProperty("--accent-primary", accent.primary);
    root.style.setProperty("--accent-secondary", accent.accent);
    if (typeof window !== "undefined") {
      try {
        window.localStorage?.setItem(ACCENT_STORAGE_KEY, JSON.stringify(accent));
      } catch (error) {
        console.error("Failed to persist accent", error);
      }
    }
  }, [accent]);

  const installApp = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await (
        deferredPrompt as unknown as {
          userChoice?: Promise<{ outcome: string }>;
        }
      ).userChoice;
      if (choice?.outcome === "accepted") {
        setCanInstall(false);
      }
      setDeferredPrompt(null);
    }
  };

  const createNote = useCallback(() => {
    setActiveSection("notes");
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
        setCurrentNote(saved);
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

  const allTags = [...new Set(notes.flatMap((note) => note.tags))];

  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort((a, b) => {
      if (activeSection === "notes") {
        const pinnedDiff = Number(b.pinned) - Number(a.pinned);
        if (pinnedDiff !== 0) return pinnedDiff;
      }

      if (sortBy === "title")
        return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "created")
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [filteredNotes, sortBy, activeSection]);

  const togglePin = useCallback(
    async (id: string) => {
      const existing = notes.find((n) => n.id === id);
      if (!existing) return;

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

 
  const exportNotes = () => {
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notemaster-notes-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importNotes = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (Array.isArray(data)) {
          // naive merge by id; prefer imported
          const map = new Map<string, NotePayload>(notes.map((n) => [n.id, n]));
          for (const n of data) map.set(n.id, n as NotePayload);
          setNotes(Array.from(map.values()));
        }
      } catch (e) {
        console.error("Failed to import notes", e);
      }
    };
    reader.readAsText(file);
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon-sm"
              className="sm:hidden"
              onClick={() => setShowSidebar((prev) => !prev)}
            >
              <Menu className="size-4" />
            </Button>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Welcome back{userFirstName ? `, ${userFirstName}` : ""}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight">
                NoteMaster
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canInstall && (
              <Button variant="outline" size="sm" onClick={installApp}>
                <Download className="size-4" />
                Install
              </Button>
            )}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setDarkMode((prev) => !prev)}
            >
              {darkMode ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>
            <Button size="sm" onClick={createNote}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">New note</span>
            </Button>
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="sm" variant="ghost">
                  Sign in
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{ elements: { userButtonAvatarBox: "size-8" } }}
              />
            </SignedIn>
          </div>
        </header>

        {showIosInstallTip && (
          <Alert className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AlertTitle>Install NoteMaster on your device</AlertTitle>
              <AlertDescription>
                <p>
                  On iPhone or iPad, tap the
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Share className="size-4" /> Share
                  </span>
                  button in Safari, then choose{" "}
                  <strong>Add to Home Screen</strong>.
                </p>
              </AlertDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowIosInstallTip(false)}
            >
              Got it
            </Button>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Mobile backdrop overlay */}
          {showSidebar && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={cn(
              "space-y-6 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300",
              // Mobile: fixed overlay that slides in from left
              "fixed inset-y-0 left-0 z-50 w-[280px] overflow-y-auto",
              "lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:block",
              // Mobile show/hide
              showSidebar
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            )}
          >
            {/* Mobile close button */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-2 lg:hidden"
              onClick={() => setShowSidebar(false)}
            >
              <X className="size-4" />
            </Button>
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search notes"
                  className="pl-9"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sections
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant={activeSection === "notes" ? "default" : "ghost"}
                    size="sm"
                    className="justify-between"
                    onClick={() => setActiveSection("notes")}
                  >
                    <span>Notes</span>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                      {sectionCounts.notes}
                    </span>
                  </Button>
                  <Button
                    variant={activeSection === "archive" ? "default" : "ghost"}
                    size="sm"
                    className="justify-between"
                    onClick={() => setActiveSection("archive")}
                  >
                    <span>Archive</span>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                      {sectionCounts.archive}
                    </span>
                  </Button>
                  <Button
                    variant={activeSection === "bin" ? "default" : "ghost"}
                    size="sm"
                    className="justify-between"
                    onClick={() => setActiveSection("bin")}
                  >
                    <span>Bin</span>
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                      {sectionCounts.bin}
                    </span>
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterTag === "all" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setFilterTag("all")}
                >
                  All
                  <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    {notes.length}
                  </span>
                </Button>
                <select
                  value={sortBy}
                  onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                    setSortBy(event.target.value as typeof sortBy)
                  }
                  className="w-36 rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="updated">Last updated</option>
                  <option value="created">Date created</option>
                  <option value="title">Title</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Tag className="size-4" />
                  Tags
                </div>
                {allTags.length > 0 && (
                  <button
                    className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => setFilterTag("all")}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={filterTag === tag ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterTag(tag)}
                  >
                    #{tag}
                    <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                      {notes.filter((note) => note.tags.includes(tag)).length}
                    </span>
                  </Button>
                ))}
                {allTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags yet</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Folder className="size-4" />
                  Notebooks
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowSidebar(false)}
                  className="lg:hidden text-muted-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={newNotebookName}
                    onChange={(event) => setNewNotebookName(event.target.value)}
                    placeholder="New notebook"
                    className="flex-1"
                    disabled={isCreatingNotebook}
                  />
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={handleCreateNotebook}
                    disabled={isCreatingNotebook || !newNotebookName.trim()}
                  >
                    <FolderPlus className="size-4" />
                  </Button>
                </div>
                {notebooks.length > 0 && (
                  <select
                    value={newNotebookParent ?? ""}
                    onChange={(event) =>
                      setNewNotebookParent(event.target.value || null)
                    }
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Parent notebook</option>
                    {notebooks.map((notebook) => (
                      <option key={notebook.id} value={notebook.id}>
                        {notebook.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  variant={activeNotebookId === "all" ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => handleSelectNotebookFilter("all")}
                >
                  All notebooks
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
                    {notes.length}
                  </span>
                </Button>
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-dashed p-3">
                  {notebookTree.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Create notebooks to organize notes by project or theme.
                    </p>
                  )}
                  {notebookTree.map((node) => (
                    <NotebookNode
                      key={node.id}
                      node={node}
                      activeId={activeNotebookId}
                      onSelect={handleSelectNotebookFilter}
                      onDelete={handleDeleteNotebook}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <PaletteIcon className="size-4" />
                  Accent color
                </div>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {ACCENT_PALETTES.map((palette) => (
                  <button
                    key={palette.id}
                    className={cn(
                      "h-10 rounded-full border transition",
                      palette.id === accent.id
                        ? "ring-2 ring-offset-2 ring-(--accent-primary)"
                        : "hover:ring-1"
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${palette.primary}, ${palette.accent})`,
                    }}
                    aria-label={`Switch to ${palette.name}`}
                    onClick={() => handleSelectAccent(palette)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportNotes}
                className="w-full justify-between"
              >
                <span>Export notes</span>
                <Download className="size-4" />
              </Button>
              <label className="w-full">
                <input
                  type="file"
                  accept="application/json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) importNotes(file);
                  }}
                  className="hidden"
                />
                <span className="flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                  Import notes
                  <Upload className="size-4" />
                </span>
              </label>
            </div>
          </aside>

          <main className="space-y-6">
            {currentNote ? (
              <Card className="border bg-card/60 backdrop-blur animate-in fade-in slide-in-from-bottom-4">
                <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-3">
                    <Input
                      value={currentNote.title}
                      onChange={(event) =>
                        setCurrentNote((prev) =>
                          prev ? { ...prev, title: event.target.value } : prev
                        )
                      }
                      placeholder="Title"
                      className="border-none px-0 text-xl font-semibold focus-visible:ring-0"
                    />
                    <CardDescription className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="size-3.5" />
                        Edited {new Date(currentNote.updatedAt).toLocaleString()}
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Folder className="size-3.5" />
                        {currentNote.notebookId
                          ? notebooksById.get(currentNote.notebookId)?.name ?? "Notebook"
                          : "Inbox"}
                      </span>
                      {currentNote.dueAt && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <CalendarClock className="size-3.5" />
                          Due {new Date(currentNote.dueAt).toLocaleString()}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex w-full flex-col items-end gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPreview((prev) => !prev)}
                      >
                        {showPreview ? (
                          <>
                            <EyeOff className="size-4" />
                            Editor
                          </>
                        ) : (
                          <>
                            <Eye className="size-4" />
                            Preview
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRevisions(currentNote.id)}
                        disabled={!isAuthenticated || !notes.some((n) => n.id === currentNote.id)}
                        title={isAuthenticated ? "View revision history" : "Sign in to see revision history"}
                      >
                        <History className="size-4" />
                        History
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentNote(null)}
                      >
                        <X className="size-4" />
                        Close
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveCurrentNote}
                        disabled={isSavingNote}
                        className="bg-(--accent-primary) text-white hover:bg-(--accent-secondary)"
                      >
                        {isSavingNote ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        {isSavingNote ? "Saving" : "Save"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Notebook
                      </label>
                      <select
                        value={currentNote.notebookId ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setCurrentNote((prev) =>
                            prev ? { ...prev, notebookId: value || null } : prev
                          );
                        }}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:border-(--accent-primary) focus:outline-none focus:ring-2 focus:ring-(--accent-primary)/50"
                      >
                        <option value="">Inbox</option>
                        {notebookOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Reminder
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={formatDateTimeForInput(currentNote.dueAt)}
                          onChange={(event) => {
                            const iso = parseInputToIso(event.target.value);
                            setCurrentNote((prev) =>
                              prev ? { ...prev, dueAt: iso } : prev
                            );
                          }}
                          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:border-(--accent-primary) focus:outline-none focus:ring-2 focus:ring-(--accent-primary)/50"
                        />
                        {currentNote.dueAt && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setCurrentNote((prev) =>
                                prev ? { ...prev, dueAt: null } : prev
                              )
                            }
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {showPreview ? (
                    <div className="rounded-2xl border bg-muted/40 p-4">
                      <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {currentNote.content.trim().length > 0
                            ? currentNote.content
                            : "_Nothing to preview yet. Start writing in the editor._"}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <Textarea
                      value={currentNote.content}
                      onChange={(event) =>
                        setCurrentNote((prev) =>
                          prev ? { ...prev, content: event.target.value } : prev
                        )
                      }
                      placeholder="Capture your thoughts..."
                      className="min-h-[240px] resize-y border-none bg-transparent px-0 text-base focus-visible:ring-0"
                    />
                  )}

                  <section className="space-y-4">
                    <header className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Checklist
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAllChecklist(true)}
                        >
                          Mark all
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAllChecklist(false)}
                        >
                          Unmark all
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={clearCompletedChecklist}
                        >
                          Clear done
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addChecklistItem}
                        >
                          <Plus className="size-4" />
                          Add
                        </Button>
                      </div>
                    </header>

                    <div className="space-y-3">
                      {currentNote.checklist.map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-col gap-2 rounded-lg border border-dashed px-3 py-2 sm:flex-row sm:items-center"
                        >
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(event) =>
                                updateChecklistItem(
                                  item.id,
                                  "checked",
                                  event.target.checked
                                )
                              }
                              className="size-4 rounded border-muted-foreground"
                            />
                          </label>
                          <Input
                            value={item.text}
                            onChange={(event) =>
                              updateChecklistItem(
                                item.id,
                                "text",
                                event.target.value
                              )
                            }
                            placeholder="Checklist item"
                            className={cn(
                              "flex-1 border-none px-0 focus-visible:ring-0",
                              item.checked &&
                                "text-muted-foreground line-through"
                            )}
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => deleteChecklistItem(item.id)}
                            className="ml-auto text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                      {currentNote.checklist.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No checklist items yet. Add one to keep track of
                          tasks.
                        </p>
                      )}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <header className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Tags
                      </h3>
                    </header>
                    <div className="flex flex-wrap gap-2">
                      {currentNote.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="flex items-center gap-1 bg-background"
                        >
                          #{tag}
                          <button onClick={() => removeTag(tag)}>
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                      {currentNote.tags.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No tags yet. Add one below to organize this note.
                        </p>
                      )}
                    </div>
                    <Input
                      placeholder="Add a tag and press Enter"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          const value = event.currentTarget.value.trim();
                          if (value) {
                            addTag(value);
                            event.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                  </section>

                  <section className="space-y-4">
                    <header className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Attachments
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={triggerAttachmentPicker}
                        >
                          <Paperclip className="size-4" />
                          Add files
                        </Button>
                        {currentNote.attachments.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              setCurrentNote((prev) =>
                                prev ? { ...prev, attachments: [] } : prev
                              )
                            }
                          >
                            <X className="size-4" />
                            Clear all
                          </Button>
                        )}
                      </div>
                    </header>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleAttachmentsSelected}
                    />
                    <div className="space-y-2">
                      {currentNote.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/30 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(attachment.size)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon-sm"
                              onClick={() => handleDownloadAttachment(attachment)}
                            >
                              <Download className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveAttachment(attachment.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {currentNote.attachments.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No attachments yet. Add images, documents, or audio clips to enrich your note.
                        </p>
                      )}
                    </div>
                  </section>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {sortedNotes.length === 0 ? (
                  <Card className="col-span-full overflow-hidden rounded-2xl border-dashed py-12 text-center animate-in fade-in">
                    <CardContent className="flex flex-col items-center gap-6">
                      <div className="relative h-40 w-60">
                        <Image
                          src="/note-empty.svg"
                          alt="Empty notebook illustration"
                          fill
                          className="object-contain"
                          priority
                        />
                      </div>
                      <div className="space-y-2">
                        {activeSection === "notes" && (
                          <>
                            <h2 className="text-lg font-semibold">
                              Nothing here yet
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              Start capturing your ideas by creating a new note.
                            </p>
                          </>
                        )}
                        {activeSection === "archive" && (
                          <>
                            <h2 className="text-lg font-semibold">
                              No archived notes
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              Archive notes to keep them here without deleting
                              them.
                            </p>
                          </>
                        )}
                        {activeSection === "bin" && (
                          <>
                            <h2 className="text-lg font-semibold">
                              Bin is empty
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              Deleted notes will appear here for recovery or
                              removal.
                            </p>
                          </>
                        )}
                      </div>
                      {activeSection === "notes" && (
                        <Button onClick={createNote} className="gap-2">
                          <Plus className="size-4" />
                          Create your first note
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  sortedNotes.map((note) => {
                    const noteCard = (
                      <Card
                        key={note.id}
                        className={cn(
                          "group relative border bg-card/80 transition animate-in fade-in slide-in-from-bottom-2",
                          activeSection === "notes" &&
                            "hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg cursor-pointer"
                        )}
                        onClick={
                          activeSection === "notes"
                            ? () => setCurrentNote(note)
                            : undefined
                        }
                      >
                        <CardHeader className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base font-semibold">
                              {note.title || "Untitled note"}
                            </CardTitle>
                            <div className="flex items-center gap-1">
                              {activeSection === "notes" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      togglePin(note.id);
                                    }}
                                    className={cn(
                                      "text-muted-foreground transition hover:text-primary",
                                      note.pinned && "text-primary"
                                    )}
                                  >
                                    <Pin className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      archiveNote(note.id);
                                    }}
                                  >
                                    <Archive className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      trashNote(note.id);
                                    }}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </>
                              )}
                              {activeSection === "archive" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      unarchiveNote(note.id);
                                    }}
                                    className="text-muted-foreground hover:text-primary"
                                  >
                                    <ArchiveRestore className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      trashNote(note.id);
                                    }}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </>
                              )}
                              {activeSection === "bin" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      restoreFromBin(note.id);
                                    }}
                                    className="text-muted-foreground hover:text-primary"
                                  >
                                    <Undo2 className="size-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      deleteForever(note.id);
                                    }}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <CardDescription className="flex items-center gap-2 text-xs">
                            <Clock className="size-3" />
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="line-clamp-3 text-sm text-muted-foreground">
                            {note.content || "No content yet"}
                          </p>
                          {note.checklist.length > 0 && (
                            <div className="rounded-md bg-muted px-3 py-2 text-xs">
                              {
                                note.checklist.filter((item) => item.checked)
                                  .length
                              }{" "}
                              of
                              {note.checklist.length} tasks complete
                            </div>
                          )}
                          {note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {note.tags.map((tag) => (
                                <Badge key={tag} variant="outline">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );

                    return noteCard;
                  })
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default NoteApp;
