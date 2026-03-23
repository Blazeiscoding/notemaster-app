import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { serializeNote, serializeRevision } from "../../utils"
import { sanitizeId } from "@/lib/validation"
import {
  withAuthAndParams,
  withAuthJsonAndParams,
  successResponse,
  errorResponse,
} from "@/lib/api-middleware"
import { emitNoteEvent } from "@/lib/note-events"

type ParamsPromise = Promise<{ id: string }>

export const GET = withAuthAndParams<ParamsPromise>(
  async ({ userId, rateLimitHeaders, requestId, logger }, { id }) => {
    try {
      sanitizeId(id)
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Invalid note ID",
        400,
        rateLimitHeaders,
        requestId
      )
    }

    const note = await prisma.note.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!note || note.userId !== userId) {
      logger.warn("Revisions fetch failed: note not found", { noteId: id });
      return errorResponse("Note not found", 404, rateLimitHeaders, requestId)
    }

    const revisions = await prisma.noteRevision.findMany({
      where: { noteId: note.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    logger.info("Revisions fetched", { noteId: id, count: revisions.length });
    return successResponse(
      revisions.map(serializeRevision),
      200,
      rateLimitHeaders,
      requestId
    )
  },
  { rateLimitSuffix: "revisions-get" }
)

export const POST = withAuthJsonAndParams<ParamsPromise>(
  async ({ userId, body, rateLimitHeaders, requestId, logger }, { id }) => {
    try {
      sanitizeId(id)
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Invalid note ID",
        400,
        rateLimitHeaders,
        requestId
      )
    }

    const note = await prisma.note.findUnique({ where: { id } })

    if (!note || note.userId !== userId) {
      logger.warn("Revision restore failed: note not found", { noteId: id });
      return errorResponse("Note not found", 404, rateLimitHeaders, requestId)
    }

    if (typeof body !== "object" || body === null) {
      logger.warn("Revision restore failed: invalid payload", { noteId: id });
      return errorResponse("Invalid payload format", 400, rateLimitHeaders, requestId)
    }

    const p = body as Record<string, unknown>

    if (!p.revisionId || typeof p.revisionId !== "string") {
      logger.warn("Revision restore failed: missing revision ID", { noteId: id });
      return errorResponse("Revision ID is required", 400, rateLimitHeaders, requestId)
    }

    let revisionId: string
    try {
      revisionId = sanitizeId(p.revisionId)
    } catch (error) {
      logger.warn("Revision restore failed: invalid revision ID", { noteId: id, error: error instanceof Error ? error.message : "Invalid revision ID" });
      return errorResponse(
        error instanceof Error ? error.message : "Invalid revision ID",
        400,
        rateLimitHeaders,
        requestId
      )
    }

    const revision = await prisma.noteRevision.findUnique({
      where: { id: revisionId },
    })

    if (!revision || revision.noteId !== note.id) {
      logger.warn("Revision restore failed: revision not found", { noteId: id, revisionId });
      return errorResponse("Revision not found", 404, rateLimitHeaders, requestId)
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.noteRevision.create({
        data: {
          noteId: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          checklist: note.checklist as Prisma.InputJsonValue,
          attachments: note.attachments as Prisma.InputJsonValue,
          pinned: note.pinned,
          archived: note.archived,
          trashed: note.trashed,
          dueAt: note.dueAt ?? undefined,
        },
      })

      return tx.note.update({
        where: { id: note.id },
        data: {
          title: revision.title,
          content: revision.content,
          tags: revision.tags,
          checklist: revision.checklist as Prisma.InputJsonValue,
          attachments: revision.attachments as Prisma.InputJsonValue,
          pinned: revision.pinned,
          archived: revision.archived,
          trashed: revision.trashed,
          dueAt: revision.dueAt,
        },
      })
    })

    logger.info("Revision restored", { noteId: id, revisionId });
    emitNoteEvent(userId, "note:updated", id, serializeNote(updated))
    return successResponse(serializeNote(updated), 200, rateLimitHeaders, requestId)
  },
  { rateLimitSuffix: "revisions-post" }
)
