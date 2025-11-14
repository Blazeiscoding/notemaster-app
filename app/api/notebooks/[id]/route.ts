import { prisma } from "@/lib/prisma"
import { serializeNotebook } from "../utils"
import {
  sanitizeString,
  sanitizeColor,
  sanitizeOptionalId,
} from "@/lib/validation"
import {
  withAuthJsonAndParams,
  withAuthAndParams,
  successResponse,
  errorResponse,
} from "@/lib/api-middleware"

type ParamsPromise = Promise<{ id: string }>

export const PATCH = withAuthJsonAndParams<ParamsPromise>(
  async ({ userId, body, rateLimitHeaders }, { id }) => {
    const existing = await prisma.notebook.findUnique({ where: { id } })

    if (!existing || existing.userId !== userId) {
      return errorResponse("Notebook not found", 404, rateLimitHeaders)
    }

    if (typeof body !== "object" || body === null) {
      return errorResponse("Invalid payload format", 400, rateLimitHeaders)
    }

    const p = body as Record<string, unknown>

    const updates: {
      name?: string
      color?: string
      parent?: { connect: { id: string } } | { disconnect: true }
    } = {}

    if (p.name !== undefined) {
      try {
        updates.name = sanitizeString(p.name, 200)
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Invalid name",
          400,
          rateLimitHeaders
        )
      }
    }

    if (p.color !== undefined) {
      try {
        updates.color = sanitizeColor(p.color)
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Invalid color",
          400,
          rateLimitHeaders
        )
      }
    }

    if (Object.prototype.hasOwnProperty.call(body, "parentId")) {
      try {
        const parentId = sanitizeOptionalId(p.parentId)

        if (!parentId) {
          updates.parent = { disconnect: true }
        } else {
          if (parentId === id) {
            return errorResponse(
              "Notebook cannot reference itself",
              400,
              rateLimitHeaders
            )
          }

          const parent = await prisma.notebook.findUnique({
            where: { id: parentId },
            select: { id: true, userId: true },
          })

          if (!parent || parent.userId !== userId) {
            return errorResponse(
              "Parent notebook not found",
              404,
              rateLimitHeaders
            )
          }

          updates.parent = { connect: { id: parent.id } }
        }
      } catch (error) {
        return errorResponse(
          error instanceof Error ? error.message : "Invalid parent ID",
          400,
          rateLimitHeaders
        )
      }
    }

    if (Object.keys(updates).length === 0) {
      return successResponse(serializeNotebook(existing), 200, rateLimitHeaders)
    }

    const updated = await prisma.notebook.update({
      where: { id },
      data: {
        name: updates.name,
        color: updates.color,
        parent: updates.parent,
      },
    })

    return successResponse(serializeNotebook(updated), 200, rateLimitHeaders)
  },
  { rateLimitSuffix: "notebooks-patch" }
)

export const DELETE = withAuthAndParams<ParamsPromise>(
  async ({ userId, rateLimitHeaders }, { id }) => {
    const existing = await prisma.notebook.findUnique({ where: { id } })

    if (!existing || existing.userId !== userId) {
      return errorResponse("Notebook not found", 404, rateLimitHeaders)
    }

    const reassigned = await prisma.note.updateMany({
      where: { notebookId: existing.id },
      data: { notebookId: null },
    })

    await prisma.notebook.delete({ where: { id } })

    return successResponse(
      { success: true, releasedNotes: reassigned.count },
      200,
      rateLimitHeaders
    )
  },
  { rateLimitSuffix: "notebooks-delete" }
)
