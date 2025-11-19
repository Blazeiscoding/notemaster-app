import { prisma } from "@/lib/prisma"
import { serializeNotebook } from "./utils"
import { validateNotebookPayload } from "@/lib/validation"
import {
  withAuth,
  withAuthAndJson,
  successResponse,
  errorResponse,
} from "@/lib/api-middleware"

export const GET = withAuth(
  async ({ userId, rateLimitHeaders, requestId }) => {
    const notebooks = await prisma.notebook.findMany({
      where: { userId },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    })

    return successResponse(
      notebooks.map(serializeNotebook),
      200,
      rateLimitHeaders,
      requestId
    )
  },
  { rateLimitSuffix: "notebooks-get" }
)

export const POST = withAuthAndJson(
  async ({ userId, body, rateLimitHeaders, requestId, logger }) => {
    // Input validation
    let validatedPayload
    try {
      validatedPayload = validateNotebookPayload(body)
    } catch (error) {
      logger.warn("Notebook creation failed: validation error", { error: error instanceof Error ? error.message : "Invalid input" });
      return errorResponse(
        error instanceof Error ? error.message : "Invalid input",
        400,
        rateLimitHeaders,
        requestId
      )
    }

    let parentId: string | null = validatedPayload.parentId ?? null

    if (parentId) {
      const parent = await prisma.notebook.findUnique({
        where: { id: parentId },
        select: { id: true, userId: true },
      })

      if (!parent || parent.userId !== userId) {
        logger.warn("Notebook creation failed: parent not found", { parentId });
        return errorResponse(
          "Parent notebook not found",
          404,
          rateLimitHeaders,
          requestId
        )
      }

      parentId = parent.id
    }

    const created = await prisma.notebook.create({
      data: {
        name: validatedPayload.name,
        userId,
        parentId,
        color: validatedPayload.color,
      },
    })

    logger.info("Notebook created", { notebookId: created.id });
    return successResponse(serializeNotebook(created), 201, rateLimitHeaders, requestId)
  },
  { rateLimitSuffix: "notebooks-post" }
)
