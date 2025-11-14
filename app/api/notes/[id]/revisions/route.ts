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

type ParamsPromise = Promise<{ id: string }>

export const GET = withAuthAndParams<ParamsPromise>(
  async ({ userId, rateLimitHeaders }, { id }) => {
    const note = await prisma.note.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!note || note.userId !== userId) {
      return errorResponse("Note not found", 404, rateLimitHeaders)
    }

    const revisions = await prisma.noteRevision.findMany({
      where: { noteId: note.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return successResponse(
      revisions.map(serializeRevision),
      200,
      rateLimitHeaders
    )
  },
  { rateLimitSuffix: "revisions-get" }
)

export const POST = withAuthJsonAndParams<ParamsPromise>(
  async ({ userId, body, rateLimitHeaders }, { id }) => {
    const note = await prisma.note.findUnique({ where: { id } })

    if (!note || note.userId !== userId) {
      return errorResponse("Note not found", 404, rateLimitHeaders)
    }

    if (typeof body !== "object" || body === null) {
      return errorResponse("Invalid payload format", 400, rateLimitHeaders)
    }

    const p = body as Record<string, unknown>

    if (!p.revisionId || typeof p.revisionId !== "string") {
      return errorResponse("Revision ID is required", 400, rateLimitHeaders)
    }

    let revisionId: string
    try {
      revisionId = sanitizeId(p.revisionId)
    } catch (error) {
      return errorResponse(
        error instanceof Error ? error.message : "Invalid revision ID",
        400,
        rateLimitHeaders
      )
    }

    const revision = await prisma.noteRevision.findUnique({
      where: { id: revisionId },
    })

    if (!revision || revision.noteId !== note.id) {
      return errorResponse("Revision not found", 404, rateLimitHeaders)
    }

    const updated = await prisma.note.update({
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

    return successResponse(serializeNote(updated), 200, rateLimitHeaders)
  },
  { rateLimitSuffix: "revisions-post" }
)
