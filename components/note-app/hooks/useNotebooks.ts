/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { NotebookPayload } from "@/types/note";
import { generateId } from "@/components/note-app/util";
import {
  buildNotebookTree,
  buildNotebookOptions,
  NOTEBOOK_ROOT_ORDER_KEY,
  NotebookOrderMap,
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
    deleted: boolean;
    releasedNotes: number;
  }>;
  updateNotebookOnServer: (
    id: string,
    updates: Partial<Pick<NotebookPayload, "name" | "parentId" | "color">>
  ) => Promise<NotebookPayload>;
};

const cloneOrderMap = (input: NotebookOrderMap): NotebookOrderMap =>
  Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, [...value]])
  );

const parentKeyOf = (parentId: string | null) =>
  parentId ?? NOTEBOOK_ROOT_ORDER_KEY;

const loadOrderFromStorage = (key: string): NotebookOrderMap => {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage?.getItem(key);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([entryKey, ids]) => [
        entryKey,
        Array.isArray(ids)
          ? ids.filter((value): value is string => typeof value === "string")
          : [],
      ])
    );
  } catch (error) {
    console.error("Failed to read notebook order", error);
    return {};
  }
};

const normalizeOrderMap = (
  current: NotebookOrderMap,
  notebooks: NotebookPayload[]
): NotebookOrderMap => {
  const next: NotebookOrderMap = {};
  const validIds = new Set(notebooks.map((item) => item.id));

  Object.entries(current).forEach(([parentKey, ids]) => {
    const filtered = ids.filter((id) => validIds.has(id));
    if (filtered.length > 0) {
      next[parentKey] = filtered;
    }
  });

  notebooks.forEach((notebook) => {
    const key = parentKeyOf(notebook.parentId);
    if (!next[key]) {
      next[key] = [];
    }
    if (!next[key].includes(notebook.id)) {
      next[key].push(notebook.id);
    }
  });

  if (!next[NOTEBOOK_ROOT_ORDER_KEY]) {
    next[NOTEBOOK_ROOT_ORDER_KEY] = [];
  }

  return next;
};

const areOrderMapsEqual = (
  a: NotebookOrderMap,
  b: NotebookOrderMap
): boolean => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => {
    const arrA = a[key] ?? [];
    const arrB = b[key] ?? [];
    if (arrA.length !== arrB.length) return false;
    return arrA.every((value, index) => value === arrB[index]);
  });
};

const removeNotebookFromOrder = (map: NotebookOrderMap, id: string) => {
  Object.keys(map).forEach((parentKey) => {
    map[parentKey] = map[parentKey].filter((value) => value !== id);
    if (map[parentKey].length === 0) {
      delete map[parentKey];
    }
  });
};

const insertNotebookIntoOrder = (
  map: NotebookOrderMap,
  parentId: string | null,
  id: string,
  targetIndex: number
) => {
  const key = parentKeyOf(parentId);
  const list = map[key]?.filter((value) => value !== id) ?? [];
  const nextIndex = Math.min(Math.max(targetIndex, 0), list.length);
  list.splice(nextIndex, 0, id);
  map[key] = list;
};

const isDescendant = (
  lookup: Map<string, NotebookPayload>,
  potentialParentId: string | null,
  targetId: string
) => {
  let cursor = potentialParentId;
  while (cursor) {
    if (cursor === targetId) return true;
    cursor = lookup.get(cursor)?.parentId ?? null;
  }
  return false;
};

export function useNotebooks(
  { notebooks, setNotebooks, notes, setNotes }: NotebooksState,
  isAuthenticated: boolean,
  userId: string | null,
  storageKey: string,
  serverActions: ServerActions
) {
  const { createNotebookOnServer, deleteNotebookOnServer, updateNotebookOnServer } =
    serverActions;
  const [activeNotebookId, setActiveNotebookId] = useState<string>("all");
  const [newNotebookName, setNewNotebookName] = useState("");
  const [newNotebookParent, setNewNotebookParent] = useState<string | null>(
    null
  );
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);

  const orderStorageKey = `${storageKey}-notebook-order`;

  const [notebookOrder, setNotebookOrder] = useState<NotebookOrderMap>(() =>
    loadOrderFromStorage(orderStorageKey)
  );

  useEffect(() => {
    setNotebookOrder((prev) => {
      const normalized = normalizeOrderMap(prev, notebooks);
      return areOrderMapsEqual(prev, normalized) ? prev : normalized;
    });
  }, [notebooks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage?.setItem(
        orderStorageKey,
        JSON.stringify(notebookOrder)
      );
    } catch (error) {
      console.error("Failed to persist notebook order", error);
    }
  }, [notebookOrder, orderStorageKey]);

  useEffect(() => {
    setNotebookOrder(loadOrderFromStorage(orderStorageKey));
  }, [orderStorageKey]);

  const notebooksById = useMemo(() => {
    const map = new Map<string, NotebookPayload>();
    notebooks.forEach((notebook) => map.set(notebook.id, notebook));
    return map;
  }, [notebooks]);

  const notebookTree = useMemo(
    () => buildNotebookTree(notebooks, notebookOrder),
    [notebooks, notebookOrder]
  );

  const notebookOptions = useMemo(
    () => buildNotebookOptions(notebookTree),
    [notebookTree]
  );

  const handleSelectNotebookFilter = useCallback((notebookId: string) => {
    setActiveNotebookId(notebookId);
  }, []);

  const performNotebookCreate = useCallback(
    async (name: string, parentId: string | null) => {
      const trimmed = name.trim();
      if (!trimmed) {
        toast.error("Notebook name is required");
        return null;
      }

      setIsCreatingNotebook(true);
      try {
        let created: NotebookPayload;
        if (isAuthenticated) {
          created = await createNotebookOnServer({
            name: trimmed,
            parentId,
          });
        } else {
          const now = new Date().toISOString();
          created = {
            id: generateId(),
            userId: userId ?? "guest",
            name: trimmed,
            parentId,
            color: DEFAULT_ACCENT.primary,
            createdAt: now,
            updatedAt: now,
          };
        }
        setNotebooks((prev) => [created, ...prev]);
        setNotebookOrder((prev) => {
          const draft = cloneOrderMap(prev);
          insertNotebookIntoOrder(draft, parentId, created.id, 0);
          return draft;
        });
        toast.success("Notebook created");
        return created;
      } catch (error) {
        console.error("Failed to create notebook", error);
        toast.error("Failed to create notebook. Please try again.");
        return null;
      } finally {
        setIsCreatingNotebook(false);
      }
    },
    [
      createNotebookOnServer,
      isAuthenticated,
      setNotebooks,
      userId,
    ]
  );

  const handleCreateNotebook = useCallback(async () => {
    const created = await performNotebookCreate(
      newNotebookName,
      newNotebookParent
    );
    if (created) {
      setNewNotebookName("");
      setNewNotebookParent(null);
    }
  }, [newNotebookName, newNotebookParent, performNotebookCreate]);

  const handleCreateNotebookChild = useCallback(
    async (parentId: string | null, name: string) => {
      const created = await performNotebookCreate(name, parentId);
      return Boolean(created);
    },
    [performNotebookCreate]
  );

  const handleRenameNotebook = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        toast.error("Notebook name cannot be empty");
        return false;
      }
      try {
        if (isAuthenticated) {
          await updateNotebookOnServer(id, { name: trimmed });
        }
        setNotebooks((prev) =>
          prev.map((notebook) =>
            notebook.id === id
              ? {
                  ...notebook,
                  name: trimmed,
                  updatedAt: new Date().toISOString(),
                }
              : notebook
          )
        );
        toast.success("Notebook renamed");
        return true;
      } catch (error) {
        console.error("Failed to rename notebook", error);
        toast.error("Failed to rename notebook. Please try again.");
        return false;
      }
    },
    [isAuthenticated, setNotebooks, updateNotebookOnServer]
  );

  const handleMoveNotebook = useCallback(
    async (id: string, targetParentId: string | null, targetIndex: number) => {
      const targetParent = targetParentId ?? null;
      if (!notebooksById.has(id)) return false;
      if (id === targetParent) {
        toast.error("Cannot move a notebook into itself");
        return false;
      }
      if (isDescendant(notebooksById, targetParent, id)) {
        toast.error("Cannot move a notebook into its descendant");
        return false;
      }

      setNotebooks((prev) =>
        prev.map((notebook) =>
          notebook.id === id
            ? {
                ...notebook,
                parentId: targetParent,
                updatedAt: new Date().toISOString(),
              }
            : notebook
        )
      );

      setNotebookOrder((prev) => {
        const draft = cloneOrderMap(prev);
        removeNotebookFromOrder(draft, id);
        insertNotebookIntoOrder(draft, targetParent, id, targetIndex);
        return draft;
      });

      try {
        if (isAuthenticated) {
          await updateNotebookOnServer(id, { parentId: targetParent });
        }
        toast.success("Notebook moved");
        return true;
      } catch (error) {
        console.error("Failed to move notebook", error);
        toast.error("Failed to move notebook. Please try again.");
        return false;
      }
    },
    [isAuthenticated, notebooksById, setNotebooks, updateNotebookOnServer]
  );

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

        setNotebookOrder((prev) => {
          const draft = cloneOrderMap(prev);
          removeNotebookFromOrder(draft, id);
          return draft;
        });

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
    handleCreateNotebookChild,
    handleRenameNotebook,
    handleMoveNotebook,
    handleSelectNotebookFilter,
    handleDeleteNotebook,
  };
}
