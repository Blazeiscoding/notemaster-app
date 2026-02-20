import type { NotePayload } from "@/types/note";

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
