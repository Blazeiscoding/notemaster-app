/**
 * Input validation and sanitization utilities
 */

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
  
  return input
    .filter((item): item is string => typeof item === "string")
    .map((item) => {
      const trimmed = item.trim();
      if (trimmed.length > maxItemLength) {
        throw new Error(
          `Array item exceeds maximum length of ${maxItemLength} characters`
        );
      }
      return trimmed;
    })
    .filter((item) => item.length > 0);
}

export function sanitizeId(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Invalid input type: expected string");
  }
  
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > 100) {
    throw new Error("Invalid ID format");
  }
  
  // Basic UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(trimmed)) {
    throw new Error("Invalid ID format");
  }
  
  return trimmed;
}

export function sanitizeOptionalId(input: unknown): string | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }
  return sanitizeId(input);
}

export function sanitizeColor(input: unknown): string {
  if (typeof input !== "string") {
    throw new Error("Invalid input type: expected string");
  }
  
  const trimmed = input.trim();
  // Basic hex color validation
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexColorRegex.test(trimmed)) {
    throw new Error("Invalid color format");
  }
  
  return trimmed;
}

export function sanitizeDate(input: unknown): Date | null {
  if (input === null || input === undefined || input === "") {
    return null;
  }
  
  if (typeof input === "string") {
    const date = new Date(input);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date format");
    }
    return date;
  }
  
  throw new Error("Invalid input type: expected string or null");
}

export function validateNotePayload(payload: unknown): {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  notebookId?: string | null;
  type?: string;
  pinned?: boolean;
  archived?: boolean;
  trashed?: boolean;
  dueAt?: string | null;
} {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid payload: expected object");
  }
  
  const p = payload as Record<string, unknown>;
  
  const validated: {
    id: string;
    title?: string;
    content?: string;
    tags?: string[];
    notebookId?: string | null;
    type?: string;
    pinned?: boolean;
    archived?: boolean;
    trashed?: boolean;
    dueAt?: string | null;
  } = {
    id: sanitizeId(p.id),
  };
  
  if (p.title !== undefined) {
    validated.title = sanitizeString(p.title, 1000);
  }
  
  if (p.content !== undefined) {
    validated.content = sanitizeString(p.content, 100000);
  }
  
  if (p.tags !== undefined) {
    validated.tags = sanitizeStringArray(p.tags, 50, 50);
  }
  
  if (p.notebookId !== undefined) {
    validated.notebookId = sanitizeOptionalId(p.notebookId);
  }
  
  if (p.type !== undefined && typeof p.type === "string") {
    validated.type = p.type;
  }
  
  if (p.pinned !== undefined) {
    validated.pinned = Boolean(p.pinned);
  }
  
  if (p.archived !== undefined) {
    validated.archived = Boolean(p.archived);
  }
  
  if (p.trashed !== undefined) {
    validated.trashed = Boolean(p.trashed);
  }
  
  if (p.dueAt !== undefined) {
    validated.dueAt = p.dueAt === null ? null : String(p.dueAt);
  }
  
  return validated;
}

export function validateNotebookPayload(payload: unknown): {
  name: string;
  color?: string;
  parentId?: string | null;
} {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid payload: expected object");
  }
  
  const p = payload as Record<string, unknown>;
  
  const name = sanitizeString(p.name as unknown, 200);
  if (name.length === 0) {
    throw new Error("Notebook name is required");
  }
  
  const validated: {
    name: string;
    color?: string;
    parentId?: string | null;
  } = { name };
  
  if (p.color !== undefined) {
    validated.color = sanitizeColor(p.color);
  }
  
  if (p.parentId !== undefined) {
    validated.parentId = sanitizeOptionalId(p.parentId);
  }
  
  return validated;
}

