import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { NotebookPayload } from "@/types/note";
import { generateId } from "@/components/note-app/util";
import {
  buildNotebookTree,
  buildNotebookOptions,
} from "@/components/note-app/util";
import { DEFAULT_ACCENT } from "@/components/note-app/constants";

type NotebooksState = {
  notebooks: NotebookPayload[];
  setNotebooks: React.Dispatch<React.SetStateAction<NotebookPayload[]>>;
  notes: Array<{ notebookId: string | null }>;
  setNotes: React.Dispatch<
    React.SetStateAction<Array<{ notebookId: string | null }>>
  >;
};

type ServerActions = {
  createNotebookOnServer: (payload: {
    name: string;
    parentId?: string | null;
    color?: string;
  }) => Promise<NotebookPayload>;
  deleteNotebookOnServer: (id: string) => Promise<{
    success: boolean;
    releasedNotes: number;
  }>;
};

export function useNotebooks(
  { notebooks, setNotebooks, notes, setNotes }: NotebooksState,
  isAuthenticated: boolean,
  userId: string | null,
  storageKey: string,
  serverActions: ServerActions
) {
  const { createNotebookOnServer, deleteNotebookOnServer } = serverActions;
  const [activeNotebookId, setActiveNotebookId] = useState<string>("all");
  const [newNotebookName, setNewNotebookName] = useState("");
  const [newNotebookParent, setNewNotebookParent] = useState<string | null>(
    null
  );
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);

  const notebookTree = useMemo(() => buildNotebookTree(notebooks), [notebooks]);

  const notebooksById = useMemo(() => {
    const map = new Map<string, NotebookPayload>();
    notebooks.forEach((notebook) => map.set(notebook.id, notebook));
    return map;
  }, [notebooks]);

  const notebookOptions = useMemo(
    () => buildNotebookOptions(notebookTree),
    [notebookTree]
  );

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
      toast.success("Notebook created");
    } catch (error) {
      console.error("Failed to create notebook", error);
      toast.error("Failed to create notebook. Please try again.");
    } finally {
      resetForm();
    }
  }, [
    newNotebookName,
    newNotebookParent,
    isAuthenticated,
    createNotebookOnServer,
    setNotebooks,
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
        toast.success("Notebook deleted");
      } catch (error) {
        console.error("Failed to delete notebook", error);
        toast.error("Failed to delete notebook. Please try again.");
      }
    },
    [
      activeNotebookId,
      deleteNotebookOnServer,
      isAuthenticated,
      setNotebooks,
      setNotes,
    ]
  );

  // Persist active notebook for guest users
  useEffect(() => {
    if (isAuthenticated) return;
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage?.getItem(
        `${storageKey}-active-notebook`
      );
      if (!stored) return;
      const nextId = stored.trim().length > 0 ? stored : "all";
      setActiveNotebookId((prev) => (prev === nextId ? prev : nextId));
    } catch (error) {
      console.error("Failed to read active notebook", error);
    }
  }, [isAuthenticated, storageKey]);

  useEffect(() => {
    if (isAuthenticated) return;
    if (typeof window === "undefined") return;
    try {
      window.localStorage?.setItem(
        `${storageKey}-active-notebook`,
        activeNotebookId
      );
    } catch (error) {
      console.error("Failed to persist active notebook", error);
    }
  }, [activeNotebookId, isAuthenticated, storageKey]);

  useEffect(() => {
    if (isAuthenticated) return;
    if (activeNotebookId === "all") return;
    const exists = notebooks.some(
      (notebook) => notebook.id === activeNotebookId
    );
    if (!exists) {
      setActiveNotebookId("all");
    }
  }, [activeNotebookId, notebooks, isAuthenticated]);

  return {
    notebooks,
    notebookTree,
    notebooksById,
    notebookOptions,
    activeNotebookId,
    newNotebookName,
    setNewNotebookName,
    newNotebookParent,
    setNewNotebookParent,
    isCreatingNotebook,
    handleCreateNotebook,
    handleSelectNotebookFilter,
    handleDeleteNotebook,
  };
}
