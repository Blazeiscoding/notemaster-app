import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeNote, noteSelect } from "../utils";
import {
  encryptAttachments,
  encryptChecklist,
  encryptString,
  encryptStringArray,
  isDecryptionFailure,
} from "@/lib/encryption";
import type { NotePayload } from "@/types/note";
import {
  withAuthJsonAndParams,
  withAuthAndParams,
  successResponse,
  errorResponse,
} from "@/lib/api-middleware";
import { emitNoteEvent } from "@/lib/note-events";
import { sanitizeId, validateNotePayload } from "@/lib/validation";

type ParamsPromise = Promise<{ id: string }>;

export const GET = withAuthAndParams<ParamsPromise>(
  async ({ userId, rateLimitHeaders, requestId, logger }, { id }) => {
    try {
      sanitizeId(id);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Invalid note ID",
        400,
        rateLimitHeaders,
        requestId
      );
    }

    const note = await prisma.note.findUnique({
      where: { id },
      select: noteSelect,
    });

    if (!note || note.userId !== userId) {
      logger.warn("Note detail fetch failed: note not found", { noteId: id });
      return errorResponse("Note not found", 404, rateLimitHeaders, requestId);
    }

    return successResponse(serializeNote(note), 200, rateLimitHeaders, requestId);
  },
  { rateLimitSuffix: "notes-detail-get" }
);

export const PATCH = withAuthJsonAndParams<ParamsPromise>(
  async ({ userId, body, rateLimitHeaders, requestId, logger }, { id }) => {
    try {
      sanitizeId(id);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Invalid note ID",
        400,
        rateLimitHeaders,
        requestId
      );
    }
    const existing = await prisma.note.findUnique({
      where: { id },
      select: noteSelect,
    });

    if (!existing || existing.userId !== userId) {
      logger.warn("Note update failed: note not found", { noteId: id });
      return errorResponse("Note not found", 404, rateLimitHeaders, requestId);
    }

    let payload: Partial<NotePayload> & Pick<NotePayload, "id">;
    try {
      payload = validateNotePayload({ ...(body as object), id }, { partial: true });
    } catch (error) {
      logger.warn("Note update failed: invalid payload", {
        noteId: id,
        error: error instanceof Error ? error.message : "Invalid payload",
      });
      return errorResponse(
        error instanceof Error ? error.message : "Invalid payload",
        400,
        rateLimitHeaders,
        requestId
      );
    }

    // If a field failed to decrypt on read, the client is holding the
    // placeholder rather than the real text. Writing it back would destroy
    // ciphertext that is still recoverable once the correct encryption key is
    // restored, so refuse the whole update instead.
    if (
      isDecryptionFailure(payload.title) ||
      isDecryptionFailure(payload.content)
    ) {
      logger.error("Note update refused: payload contains undecryptable content", null, {
        noteId: id,
      });
      return errorResponse(
        "This note could not be decrypted and cannot be overwritten. Check NOTES_ENCRYPTION_KEY.",
        409,
        rateLimitHeaders,
        requestId
      );
    }

    const data: Prisma.NoteUpdateInput = {};

    if (typeof payload.title === "string") {
      data.title = encryptString(payload.title);
    }

    if (typeof payload.content === "string") {
      data.content = encryptString(payload.content);
    }

    if (Array.isArray(payload.tags)) {
      data.tags = encryptStringArray(payload.tags);
    }

    if (Array.isArray(payload.checklist)) {
      data.checklist = encryptChecklist(
        payload.checklist
      ) as Prisma.InputJsonValue;
    }

    if (Array.isArray(payload.attachments)) {
      data.attachments = encryptAttachments(
        payload.attachments
      ) as Prisma.InputJsonValue;
    }

    if (typeof payload.type === "string") {
      data.type = payload.type;
    }

    if (typeof payload.pinned === "boolean") {
      data.pinned = payload.pinned;
    }

    if (typeof payload.archived === "boolean") {
      data.archived = payload.archived;
    }

    if (typeof payload.trashed === "boolean") {
      data.trashed = payload.trashed;
    }

    if (payload.dueAt !== undefined) {
      data.dueAt = payload.dueAt ? new Date(payload.dueAt) : null;
    }

    if (Object.keys(data).length === 0) {
      return successResponse(serializeNote(existing), 200, rateLimitHeaders, requestId);
    }

    const shouldCreateRevision = [
      "title",
      "content",
      "tags",
      "checklist",
      "attachments",
    ].some((field) => Object.prototype.hasOwnProperty.call(data, field));

    if (!shouldCreateRevision) {
      const updated = await prisma.note.update({
        where: { id },
        data,
      });

      logger.info("Note updated", { noteId: id });
      emitNoteEvent(userId, "note:updated", id, serializeNote(updated));
      return successResponse(serializeNote(updated), 200, rateLimitHeaders, requestId);
    }

    // Create revision before updating - wrapped in transaction for atomicity
    const revisionData: Prisma.NoteRevisionUncheckedCreateInput = {
      noteId: existing.id,
      title: existing.title,
      content: existing.content,
      tags: existing.tags,
      checklist: existing.checklist as Prisma.InputJsonValue,
      attachments: existing.attachments as Prisma.InputJsonValue,
      pinned: existing.pinned,
      archived: existing.archived,
      trashed: existing.trashed,
      dueAt: existing.dueAt ?? undefined,
    };

    // Use transaction to ensure atomicity: if note update fails, revision creation is rolled back
    try {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.noteRevision.create({
          data: revisionData,
        });

        return await tx.note.update({
          where: { id },
          data,
        });
      });

      logger.info("Note updated", { noteId: id });
      
      // Emit real-time event for other connected clients
      emitNoteEvent(userId, "note:updated", id, serializeNote(updated));
      
      return successResponse(serializeNote(updated), 200, rateLimitHeaders, requestId);
    } catch (error) {
      logger.error("Note update failed: transaction error", error, { noteId: id });
      throw error;
    }
  },
  { rateLimitSuffix: "notes-patch" }
);

export const DELETE = withAuthAndParams<ParamsPromise>(
  async ({ userId, rateLimitHeaders, requestId, logger }, { id }) => {
    try {
      sanitizeId(id);
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Invalid note ID",
        400,
        rateLimitHeaders,
        requestId
      );
    }

    const existing = await prisma.note.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!existing || existing.userId !== userId) {
      logger.warn("Note deletion failed: note not found", { noteId: id });
      return errorResponse("Note not found", 404, rateLimitHeaders, requestId);
    }

    await prisma.note.delete({ where: { id } });

    logger.info("Note deleted", { noteId: id });
    
    // Emit real-time event for other connected clients
    emitNoteEvent(userId, "note:deleted", id);
    
    return successResponse({ deleted: true }, 200, rateLimitHeaders, requestId);
  },
  { rateLimitSuffix: "notes-delete" }
);
