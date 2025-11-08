import type { NotebookPayload, NotebookTreeNode } from "@/types/note";

export const buildNotebookTree = (items: NotebookPayload[]): NotebookTreeNode[] => {
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

export const formatDateTimeForInput = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
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
