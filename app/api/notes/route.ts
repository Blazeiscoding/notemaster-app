import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { NotePayload } from "@/types/note"
import {
  noteSelect,
  noteSummarySelect,
  serializeNote,
  serializeNoteSummary,
} from "./utils"
import {
  encryptAttachments,
  encryptChecklist,
  encryptString,
  encryptStringArray,
} from "@/lib/encryption"
import {
  withAuth,
  withAuthAndJson,
  successResponse,
  errorResponse,
} from "@/lib/api-middleware"
import { emitNoteEvent } from "@/lib/note-events"


export const GET = withAuth(
  async ({ userId, rateLimitHeaders, requestId, request }) => {
    // Parse pagination parameters from URL
    const url = new URL(request.url)
    const cursor = url.searchParams.get("cursor")
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : undefined
    const includeFull = url.searchParams.get("include") === "full"

    if (includeFull) {
      const notes = await prisma.note.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: limit ? limit + 1 : undefined,
        select: noteSelect,
        ...(cursor && {
          cursor: { id: cursor },
          skip: 1,
        }),
      })

      if (!limit) {
        return successResponse(
          notes.map(serializeNote),
          200,
          rateLimitHeaders,
          requestId
        )
      }

      const hasMore = notes.length > limit
      const data = hasMore ? notes.slice(0, limit) : notes
      const nextCursor = hasMore ? data[data.length - 1]?.id : null

      return successResponse(
        {
          notes: data.map(serializeNote),
          nextCursor,
          hasMore,
        },
        200,
        rateLimitHeaders,
        requestId
      )
    }

    // If no limit specified, return all notes (backwards compatible)
    if (!limit) {
      const notes = await prisma.note.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: noteSummarySelect,
      })
      return successResponse(
        notes.map(serializeNoteSummary),
        200,
        rateLimitHeaders,
        requestId
      )
    }

    // Paginated query with cursor-based pagination
    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1, // Fetch one extra to check if there are more
      select: noteSummarySelect,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
    })

    const hasMore = notes.length > limit
    const data = hasMore ? notes.slice(0, limit) : notes
    const nextCursor = hasMore ? data[data.length - 1]?.id : null

    return successResponse(
      {
        notes: data.map(serializeNoteSummary),
        nextCursor,
        hasMore,
      },
      200,
      rateLimitHeaders,
      requestId
    )
  },
  { rateLimitSuffix: "notes-get" }
)

export const POST = withAuthAndJson(
  async ({ userId, body, rateLimitHeaders, requestId, logger }) => {
    const payload = body as Partial<NotePayload>

    // Input validation
    if (!payload.id || typeof payload.id !== "string") {
      logger.warn("Note creation failed: missing ID");
      return errorResponse("Note ID is required", 400, rateLimitHeaders, requestId)
    }

    const noteData: Prisma.NoteUncheckedCreateInput = {
      id: payload.id,
      userId,
      title: encryptString(payload.title ?? ""),
      content: encryptString(payload.content ?? ""),
      tags: encryptStringArray(payload.tags ?? []),
      checklist: encryptChecklist(payload.checklist ?? []) as Prisma.InputJsonValue,
      attachments: encryptAttachments(
        payload.attachments ?? []
      ) as Prisma.InputJsonValue,
      type: payload.type ?? "note",
      pinned: payload.pinned ?? false,
      archived: payload.archived ?? false,
      trashed: payload.trashed ?? false,
      dueAt: payload.dueAt ? new Date(payload.dueAt) : null,
      createdAt: payload.createdAt ? new Date(payload.createdAt) : undefined,
      updatedAt: payload.updatedAt ? new Date(payload.updatedAt) : undefined,
    }

    const created = await prisma.note.create({
      data: noteData,
      select: noteSelect,
    })

    logger.info("Note created", { noteId: created.id });
    
    // Emit real-time event for other connected clients
    emitNoteEvent(userId, "note:created", created.id, serializeNote(created));
    
    return successResponse(serializeNote(created), 201, rateLimitHeaders, requestId)
  },
  { rateLimitSuffix: "notes-post" }
)
