"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import type { NotePayload, ChecklistItem as ChecklistItemPayload } from "@/types/note";
import {
  Archive,
  Check,
  Clock,
  Download,
  Menu,
  Moon,
  Pin,
  Plus,
  Search,
  Share,
  Sun,
  Tag,
  Trash2,
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

type ChecklistItem = { id: number; text: string; checked: boolean };
type Note = {
  id: number;
  title: string;
  content: string;
  tags: string[];
  checklist: ChecklistItem[];
  type: "note";
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
  archived?: boolean;
  trashed?: boolean;
};

const NoteApp = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
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

  const { user } = useUser();
  const userFirstName = (user as { firstName?: string } | null)?.firstName;
  const storageKey = `notemaster-notes-${user?.id ?? "guest"}`;

  // Load notes from storage on mount and when user changes
  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // (moved) save notes effect is defined below

  const loadNotes = async () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          setNotes(JSON.parse(raw));
        }
      }
    } catch {
      console.log("No existing notes found, starting fresh");
    } finally {
      setIsLoading(false);
    }
  };

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

  // Save notes to storage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(storageKey, JSON.stringify(notes));
        }
      } catch (err) {
        console.error("Failed to save notes:", err);
      }
    }
  }, [notes, isLoading, storageKey]);

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

  const createNote = () => {
    const newNote: Note = {
      id: Date.now(),
      title: "",
      content: "",
      tags: [],
      checklist: [],
      type: "note",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: false,
      archived: false,
      trashed: false,
    };
    setCurrentNote(newNote);
    setShowSidebar(false);
  };

  const saveCurrentNote = () => {
    if (
      currentNote &&
      (currentNote.title ||
        currentNote.content ||
        currentNote.checklist.length > 0)
    ) {
      const updatedNote = {
        ...currentNote,
        updatedAt: new Date().toISOString(),
      };
      const existingIndex = notes.findIndex((n) => n.id === currentNote.id);

      if (existingIndex >= 0) {
        const newNotes = [...notes];
        newNotes[existingIndex] = updatedNote;
        setNotes(newNotes);
      } else {
        setNotes([updatedNote, ...notes]);
      }
      setCurrentNote(null);
    }
  };

  // Hard delete is no longer used; keep for potential future admin actions

  const addChecklistItem = () => {
    if (currentNote) {
      setCurrentNote({
        ...currentNote,
        checklist: [
          ...currentNote.checklist,
          { id: Date.now(), text: "", checked: false },
        ],
      });
    }
  };

  const markAllChecklist = (checked: boolean) => {
    if (currentNote) {
      setCurrentNote({
        ...currentNote,
        checklist: currentNote.checklist.map((item) => ({ ...item, checked })),
      });
    }
  };

  const clearCompletedChecklist = () => {
    if (currentNote) {
      setCurrentNote({
        ...currentNote,
        checklist: currentNote.checklist.filter((i) => !i.checked),
      });
    }
  };

  const updateChecklistItem = (
    itemId: number,
    field: "text" | "checked",
    value: string | boolean
  ) => {
    if (currentNote) {
      setCurrentNote({
        ...currentNote,
        checklist: currentNote.checklist.map((item) =>
          item.id === itemId ? { ...item, [field]: value as never } : item
        ),
      });
    }
  };

  const deleteChecklistItem = (itemId: number) => {
    if (currentNote) {
      setCurrentNote({
        ...currentNote,
        checklist: currentNote.checklist.filter((item) => item.id !== itemId),
      });
    }
  };

  const addTag = (tag: string) => {
    if (currentNote && tag && !currentNote.tags.includes(tag)) {
      setCurrentNote({
        ...currentNote,
        tags: [...currentNote.tags, tag],
      });
    }
  };

  const removeTag = (tag: string) => {
    if (currentNote) {
      setCurrentNote({
        ...currentNote,
        tags: currentNote.tags.filter((t) => t !== tag),
      });
    }
  };

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = filterTag === "all" || note.tags.includes(filterTag);
    return matchesSearch && matchesTag && !note.trashed && !note.archived;
  });

  const allTags = [...new Set(notes.flatMap((note) => note.tags))];

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
    if (sortBy === "created")
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const togglePin = (id: number) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, pinned: !n.pinned, updatedAt: new Date().toISOString() }
          : n
      )
    );
  };

  const archiveNote = (id: number) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, archived: true, updatedAt: new Date().toISOString() }
          : n
      )
    );
  };

  const trashNote = (id: number) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, trashed: true, updatedAt: new Date().toISOString() }
          : n
      )
    );
    if (currentNote?.id === id) setCurrentNote(null);
  };

  // Restore UI not implemented in this view; function omitted to keep bundle lean

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
          const map = new Map<number, Note>(notes.map((n) => [n.id, n]));
          for (const n of data) map.set(n.id, n);
          setNotes(Array.from(map.values()));
        }
      } catch (e) {
        console.error("Failed to import notes", e);
      }
    };
    reader.readAsText(file);
  };

  // Legacy manual install helper removed; using native install prompt instead

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
              <h1 className="text-2xl font-semibold tracking-tight">NoteMaster</h1>
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
              {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
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
              <UserButton appearance={{ elements: { userButtonAvatarBox: "size-8" } }} />
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
                  button in Safari, then choose <strong>Add to Home Screen</strong>.
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
          <aside
            className={cn(
              "space-y-6 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 lg:static lg:block",
              showSidebar ? "block translate-y-0 opacity-100" : "hidden -translate-y-2 opacity-0 lg:block lg:opacity-100 lg:translate-y-0"
            )}
          >
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

            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={exportNotes} className="w-full justify-between">
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
                  <div className="space-y-2">
                    <Input
                      value={currentNote.title}
                      onChange={(event) =>
                        setCurrentNote({ ...currentNote, title: event.target.value })
                      }
                      placeholder="Title"
                      className="border-none px-0 text-xl font-semibold focus-visible:ring-0"
                    />
                    <CardDescription>
                      Edited {new Date(currentNote.updatedAt).toLocaleString()}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setCurrentNote(null)}>
                      <X className="size-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveCurrentNote}>
                      <Check className="size-4" />
                      Save
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Textarea
                    value={currentNote.content}
                    onChange={(event) =>
                      setCurrentNote({ ...currentNote, content: event.target.value })
                    }
                    placeholder="Capture your thoughts..."
                    className="min-h-[240px] resize-y border-none bg-transparent px-0 text-base focus-visible:ring-0"
                  />

                  <section className="space-y-4">
                    <header className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Checklist
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => markAllChecklist(true)}>
                          Mark all
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => markAllChecklist(false)}>
                          Unmark all
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearCompletedChecklist}>
                          Clear done
                        </Button>
                        <Button variant="outline" size="sm" onClick={addChecklistItem}>
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
                                updateChecklistItem(item.id, "checked", event.target.checked)
                              }
                              className="size-4 rounded border-muted-foreground"
                            />
                          </label>
                          <Input
                            value={item.text}
                            onChange={(event) =>
                              updateChecklistItem(item.id, "text", event.target.value)
                            }
                            placeholder="Checklist item"
                            className={cn(
                              "flex-1 border-none px-0 focus-visible:ring-0",
                              item.checked && "text-muted-foreground line-through"
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
                          No checklist items yet. Add one to keep track of tasks.
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
                        <h2 className="text-lg font-semibold">Nothing here yet</h2>
                        <p className="text-sm text-muted-foreground">
                          Start capturing your ideas by creating a new note.
                        </p>
                      </div>
                      <Button onClick={createNote} className="gap-2">
                        <Plus className="size-4" />
                        Create your first note
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  sortedNotes
                    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
                    .map((note) => (
                      <Card
                        key={note.id}
                        className="group relative border bg-card/80 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg animate-in fade-in slide-in-from-bottom-2"
                        onClick={() => setCurrentNote(note)}
                      >
                        <CardHeader className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base font-semibold">
                              {note.title || "Untitled note"}
                            </CardTitle>
                            <div className="flex items-center gap-1">
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
                              {note.checklist.filter((item) => item.checked).length} of
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
                    ))
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
