"use client";
import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Trash2,
  Check,
  X,
  Menu,
  Sun,
  Moon,
  Tag,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";

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
  const [showMenu, setShowMenu] = useState(false);
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

  const { user } = useUser();
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
    setShowMenu(false);
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
    <div
      className={`min-h-screen ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Header */}
      <header
        className={`sticky top-0 z-50 ${
          darkMode ? "bg-gray-800" : "bg-white"
        } shadow-md`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-blue-600">NoteMaster</h1>
          </div>

          <div className="flex items-center gap-2">
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="sm" variant="outline">
                  Sign in
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }}
              />
            </SignedIn>
            {canInstall && (
              <button
                onClick={installApp}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm"
                title="Install App"
              >
                Install
              </button>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              {darkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <Button onClick={createNote} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Note</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className={`${showMenu ? "block" : "hidden"} lg:block`}>
            <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
              <CardHeader>
                <CardTitle className="text-lg">Search & Filter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </h3>
                  <div className="space-y-1">
                    <button
                      onClick={() => setFilterTag("all")}
                      className={`w-full text-left px-3 py-2 rounded ${
                        filterTag === "all"
                          ? "bg-blue-600 text-white"
                          : darkMode
                          ? "hover:bg-gray-700"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      All Notes ({notes.length})
                    </button>
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setFilterTag(tag)}
                        className={`w-full text-left px-3 py-2 rounded ${
                          filterTag === tag
                            ? "bg-blue-600 text-white"
                            : darkMode
                            ? "hover:bg-gray-700"
                            : "hover:bg-gray-100"
                        }`}
                      >
                        #{tag} (
                        {notes.filter((n) => n.tags.includes(tag)).length})
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Sort</h3>
                  <select
                    value={sortBy}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setSortBy(
                        e.target.value as "updated" | "created" | "title"
                      )
                    }
                    className={`w-full px-3 py-2 rounded border ${
                      darkMode ? "bg-gray-900 border-gray-700" : ""
                    }`}
                  >
                    <option value="updated">Last updated</option>
                    <option value="created">Date created</option>
                    <option value="title">Title</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportNotes}
                    className="flex-1"
                  >
                    Export
                  </Button>
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="application/json"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) importNotes(f);
                      }}
                    />
                    <span className="inline-flex w-full justify-center items-center px-3 py-2 rounded-md border cursor-pointer text-sm">
                      Import
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes List or Editor */}
          <div className="lg:col-span-2">
            {currentNote ? (
              // Editor View
              <Card className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start gap-4">
                    <Input
                      placeholder="Note title..."
                      value={currentNote.title}
                      onChange={(e) =>
                        setCurrentNote({
                          ...currentNote,
                          title: e.target.value,
                        })
                      }
                      className="text-xl font-bold border-none p-0 focus-visible:ring-0"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={saveCurrentNote}
                        size="sm"
                        className="gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </Button>
                      <Button
                        onClick={() => setCurrentNote(null)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Write your note here..."
                    value={currentNote.content}
                    onChange={(e) =>
                      setCurrentNote({
                        ...currentNote,
                        content: e.target.value,
                      })
                    }
                    className="min-h-[200px] resize-y"
                  />

                  {/* Checklist Section */}
                  <div>
                    <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
                      <h3 className="font-semibold">Checklist</h3>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => markAllChecklist(true)}
                          size="sm"
                          variant="outline"
                        >
                          Mark all
                        </Button>
                        <Button
                          onClick={() => markAllChecklist(false)}
                          size="sm"
                          variant="outline"
                        >
                          Unmark all
                        </Button>
                        <Button
                          onClick={clearCompletedChecklist}
                          size="sm"
                          variant="outline"
                        >
                          Clear done
                        </Button>
                        <Button
                          onClick={addChecklistItem}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {currentNote.checklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(e) =>
                              updateChecklistItem(
                                item.id,
                                "checked",
                                e.target.checked
                              )
                            }
                            className="w-5 h-5 rounded"
                          />
                          <Input
                            value={item.text}
                            onChange={(e) =>
                              updateChecklistItem(
                                item.id,
                                "text",
                                e.target.value
                              )
                            }
                            placeholder="Checklist item..."
                            className={
                              item.checked ? "line-through opacity-60" : ""
                            }
                          />
                          <button
                            onClick={() => deleteChecklistItem(item.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tags Section */}
                  <div>
                    <h3 className="font-semibold mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {currentNote.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center gap-1"
                        >
                          #{tag}
                          <button onClick={() => removeTag(tag)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <Input
                      placeholder="Add tag and press Enter..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const target = e.target as HTMLInputElement;
                          addTag(target.value.trim());
                          target.value = "";
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Notes List View
              <div className="space-y-4">
                {filteredNotes.length === 0 ? (
                  <Card
                    className={`${
                      darkMode ? "bg-gray-800 border-gray-700" : ""
                    } text-center py-12`}
                  >
                    <CardContent>
                      <p className="text-gray-500 mb-4">No notes found</p>
                      <Button onClick={createNote}>
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
                        className={`${
                          darkMode
                            ? "bg-gray-800 border-gray-700 hover:bg-gray-700"
                            : "hover:shadow-lg"
                        } cursor-pointer transition-all`}
                        onClick={() => setCurrentNote(note)}
                      >
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg mb-1">
                                {note.title || "Untitled Note"}
                              </CardTitle>
                              <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(note.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePin(note.id);
                                }}
                                className="px-2 py-1 rounded text-xs border"
                                title={note.pinned ? "Unpin" : "Pin"}
                              >
                                {note.pinned ? "Unpin" : "Pin"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveNote(note.id);
                                }}
                                className="px-2 py-1 rounded text-xs border"
                                title="Archive"
                              >
                                Archive
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  trashNote(note.id);
                                }}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                                title="Move to Trash"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                            {note.content || "No content"}
                          </p>

                          {note.checklist.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold mb-1">
                                Checklist:{" "}
                                {note.checklist.filter((i) => i.checked).length}
                                /{note.checklist.length} completed
                              </p>
                            </div>
                          )}

                          {note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {note.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteApp;
