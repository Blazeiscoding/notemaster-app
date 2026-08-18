import type { Attachment, ChecklistItem, NotePayload } from "@/types/note";
import { sanitizeHtml } from "@/lib/sanitize-html";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HTTP_URL_REGEX = /^https?:\/\//i;
const DATA_URL_REGEX = /^data:image\/[a-zA-Z0-9.+-]+;base64,/i;

type NoteValidationOptions = {
  requireId?: boolean;
  partial?: boolean;
};

export function sanitizeString(input: unknown, maxLength = 10000): string {
  if (typeof input !== "string") {
    throw new Error("Invalid input type: expected string");
  }

  const trimmed = input.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
  }

  return trimmed;
}

export function sanitizeStringArray(
  input: unknown,
  maxItems = 100,
  maxItemLength = 100
): string[] {
  if (!Array.isArray(input)) {
    throw new Error("Invalid input type: expected array");
  }

  if (input.length > maxItems) {
    throw new Error(`Array exceeds maximum length of ${maxItems} items`);
  }

  return input.map((item) => sanitizeString(item, maxItemLength)).filter(Boolean);
}

export function sanitizeId(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Invalid input type: expected string");
  }

  const trimmed = input.trim();
  if (!UUID_REGEX.test(trimmed)) {
    throw new Error("Invalid ID format");
  }

  return trimmed;
}

/**
 * Length-check rich text and strip it down to the allowlisted tags/attributes
 * in `lib/sanitize-html`. The result is safe to store and to re-render as HTML.
 */
export function sanitizeRichTextHtml(input: unknown, maxLength = 100000): string {
  return sanitizeHtml(sanitizeString(input, maxLength));
}

function sanitizeChecklist(input: unknown): ChecklistItem[] {
  if (!Array.isArray(input)) {
    throw new Error("Checklist must be an array");
  }

  if (input.length > 200) {
    throw new Error("Checklist exceeds maximum length of 200 items");
  }

  return input.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid checklist item");
    }

    const candidate = item as Record<string, unknown>;
    return {
      id: sanitizeId(candidate.id),
      text: sanitizeString(candidate.text ?? "", 500),
      checked: Boolean(candidate.checked),
    };
  });
}

function sanitizeAttachmentUrl(input: unknown): string {
  const value = sanitizeString(input, 2000);
  if (!HTTP_URL_REGEX.test(value) && !DATA_URL_REGEX.test(value)) {
    throw new Error("Attachment URL must be an http(s) or image data URL");
  }
  return value;
}

function sanitizeAttachments(input: unknown): Attachment[] {
  if (!Array.isArray(input)) {
    throw new Error("Attachments must be an array");
  }

  if (input.length > 20) {
    throw new Error("Attachments exceed maximum length of 20 items");
  }

  return input.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid attachment");
    }

    const candidate = item as Record<string, unknown>;
    const size = Number(candidate.size);
    if (!Number.isFinite(size) || size < 0 || size > 20 * 1024 * 1024) {
      throw new Error("Attachment size is invalid");
    }

    return {
      id: sanitizeId(candidate.id),
      name: sanitizeString(candidate.name ?? "", 255),
      type: sanitizeString(candidate.type ?? "", 100),
      size,
      data: sanitizeAttachmentUrl(candidate.data),
    };
  });
}

function sanitizeDueAt(input: unknown): string | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }

  if (typeof input !== "string") {
    throw new Error("dueAt must be a string or null");
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid due date");
  }

  return date.toISOString();
}

export function validateNotePayload(
  payload: unknown,
  options: NoteValidationOptions = {}
): Partial<NotePayload> & Pick<NotePayload, "id"> {
  const { requireId = true, partial = false } = options;

  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid payload: expected object");
  }

  const p = payload as Record<string, unknown>;
  const validated: Partial<NotePayload> & { id: string } = {
    id: requireId ? sanitizeId(p.id) : sanitizeId(p.id),
  };

  if (!partial || p.title !== undefined) {
    validated.title = sanitizeString(p.title ?? "", 1000);
  }

  if (!partial || p.content !== undefined) {
    validated.content = sanitizeRichTextHtml(p.content ?? "", 100000);
  }

  if (!partial || p.tags !== undefined) {
    validated.tags = sanitizeStringArray(p.tags ?? [], 50, 50);
  }

  if (!partial || p.checklist !== undefined) {
    validated.checklist = sanitizeChecklist(p.checklist ?? []);
  }

  if (!partial || p.attachments !== undefined) {
    validated.attachments = sanitizeAttachments(p.attachments ?? []);
  }

  if (!partial || p.type !== undefined) {
    const type = p.type ?? "note";
    if (type !== "note") {
      throw new Error("Unsupported note type");
    }
    validated.type = "note";
  }

  if (!partial || p.pinned !== undefined) {
    validated.pinned = Boolean(p.pinned);
  }

  if (!partial || p.archived !== undefined) {
    validated.archived = Boolean(p.archived);
  }

  if (!partial || p.trashed !== undefined) {
    validated.trashed = Boolean(p.trashed);
  }

  if (!partial || p.dueAt !== undefined) {
    validated.dueAt = sanitizeDueAt(p.dueAt);
  }

  if (!partial || p.createdAt !== undefined) {
    const createdAt = p.createdAt ? sanitizeDueAt(p.createdAt) : null;
    if (createdAt) {
      validated.createdAt = createdAt;
    }
  }

  if (!partial || p.updatedAt !== undefined) {
    const updatedAt = p.updatedAt ? sanitizeDueAt(p.updatedAt) : null;
    if (updatedAt) {
      validated.updatedAt = updatedAt;
    }
  }

  return validated;
}
