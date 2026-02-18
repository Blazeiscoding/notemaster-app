import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { NotePayload } from "@/types/note"
import { serializeNote } from "./utils"
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

// Common select fields for note queries - optimized to only fetch needed fields
const noteSelect = {
  id: true,
  userId: true,
  notebookId: true,
  title: true,
  content: true,
  tags: true,
  checklist: true,
  attachments: true,
  type: true,
  pinned: true,
  archived: true,
  trashed: true,
  dueAt: true,
  createdAt: true,
  updatedAt: true,
} as const

export const GET = withAuth(
  async ({ userId, rateLimitHeaders, requestId, request }) => {
    // Parse pagination parameters from URL
    const url = new URL(request.url)
    const cursor = url.searchParams.get("cursor")
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : undefined

    // If no limit specified, return all notes (backwards compatible)
    if (!limit) {
      const notes = await prisma.note.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: noteSelect,
      })
      return successResponse(notes.map(serializeNote), 200, rateLimitHeaders, requestId)
    }

    // Paginated query with cursor-based pagination
    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: limit + 1, // Fetch one extra to check if there are more
      select: noteSelect,
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
        notes: data.map(serializeNote),
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

    let notebookId: string | null = null

    if (typeof payload.notebookId === "string" && payload.notebookId.trim()) {
      const notebook = await prisma.notebook.findUnique({
        where: { id: payload.notebookId },
        select: { id: true, userId: true },
      })

      if (!notebook || notebook.userId !== userId) {
        logger.warn("Note creation failed: notebook not found", { notebookId: payload.notebookId });
        return errorResponse("Notebook not found", 404, rateLimitHeaders, requestId)
      }

      notebookId = notebook.id
    }

    const noteData: Prisma.NoteUncheckedCreateInput = {
      id: payload.id,
      userId,
      notebookId,
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
