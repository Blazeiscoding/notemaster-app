import type { Notebook } from "@prisma/client"
import type { NotebookPayload } from "@/types/note"

export const serializeNotebook = (notebook: Notebook): NotebookPayload => ({
  id: notebook.id,
  userId: notebook.userId,
  parentId: notebook.parentId,
  name: notebook.name,
  color: notebook.color,
  createdAt: notebook.createdAt.toISOString(),
  updatedAt: notebook.updatedAt.toISOString(),
})
