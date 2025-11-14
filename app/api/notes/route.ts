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

export const GET = withAuth(
  async ({ userId, rateLimitHeaders }) => {
    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    })

    return successResponse(notes.map(serializeNote), 200, rateLimitHeaders)
  },
  { rateLimitSuffix: "notes-get" }
)

export const POST = withAuthAndJson(
  async ({ userId, body, rateLimitHeaders }) => {
    const payload = body as Partial<NotePayload>

    // Input validation
    if (!payload.id || typeof payload.id !== "string") {
      return errorResponse("Note ID is required", 400, rateLimitHeaders)
    }

    let notebookId: string | null = null

    if (typeof payload.notebookId === "string" && payload.notebookId.trim()) {
      const notebook = await prisma.notebook.findUnique({
        where: { id: payload.notebookId },
        select: { id: true, userId: true },
      })

      if (!notebook || notebook.userId !== userId) {
        return errorResponse("Notebook not found", 404, rateLimitHeaders)
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
    })

    return successResponse(serializeNote(created), 201, rateLimitHeaders)
  },
  { rateLimitSuffix: "notes-post" }
)
