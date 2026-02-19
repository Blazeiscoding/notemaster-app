import type { NotePayload, NotebookPayload, NotebookTreeNode } from "@/types/note";

export const NOTEBOOK_ROOT_ORDER_KEY = "__root__";

/**
 * Build a new NotePayload with sensible defaults.
 * Pass `overrides` to customise title, content, tags, etc.
 */
export const buildNewNote = (
  userId: string | null,
  overrides?: Partial<Omit<NotePayload, "id" | "type">>
): NotePayload => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    userId,
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
    ...overrides,
  };
};

export type NotebookOrderMap = Record<string, string[]>;

export const buildNotebookTree = (
  items: NotebookPayload[],
  orderMap: NotebookOrderMap = {}
): NotebookTreeNode[] => {
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

  const withChildrenSorted = roots.map((root) => ({
    ...root,
    children: sortChildren(root.children, root.id),
  }));

  return sortNodes(withChildrenSorted, NOTEBOOK_ROOT_ORDER_KEY);

  function sortChildren(
    children: NotebookTreeNode[],
    parentId: string
  ): NotebookTreeNode[] {
    return sortNodes(
      children.map((child) => ({
        ...child,
        children: sortChildren(child.children, child.id),
      })),
      parentId
    );
  }

  function sortNodes(
    nodes: NotebookTreeNode[],
    parentKey: string
  ): NotebookTreeNode[] {
    const order = orderMap[parentKey] ?? [];
    return nodes.sort((a, b) => {
      const indexA = order.indexOf(a.id);
      const indexB = order.indexOf(b.id);
      if (indexA === -1 && indexB === -1) {
        return a.name.localeCompare(b.name);
      }
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      if (indexA === indexB) {
        return a.name.localeCompare(b.name);
      }
      return indexA - indexB;
    });
  }
};

export const generateId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

export const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const buildNotebookOptions = (tree: NotebookTreeNode[]) => {
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

  walk(tree);
  return options;
};



export const parseInputToIso = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const hexToRgb = (value: string) => {
  const hex = value.trim().replace(/^#/, "");
  if (hex.length !== 3 && hex.length !== 6) return null;
  const normalized = hex.length === 3
    ? hex
        .split("")
        .map((char) => char + char)
        .join("")
    : hex;

  const int = Number.parseInt(normalized, 16);
  if (Number.isNaN(int)) return null;

  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return { r, g, b };
};

const channelToLinear = (channel: number) => {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
};

export const pickAccessibleTextColor = (hexColor: string) => {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return "#FFFFFF";

  const r = channelToLinear(rgb.r);
  const g = channelToLinear(rgb.g);
  const b = channelToLinear(rgb.b);

  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "#111827" : "#FFFFFF";
};

export const hexToRgba = (value: string, alpha: number) => {
  const rgb = hexToRgb(value);
  const clampedAlpha = Math.min(Math.max(alpha, 0), 1);
  if (!rgb) {
    return `rgba(0, 0, 0, ${clampedAlpha})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clampedAlpha})`;
};
