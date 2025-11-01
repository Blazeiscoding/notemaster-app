import type { Note } from "@prisma/client"
import type { NotePayload } from "@/types/note"

export const serializeNote = (note: Note): NotePayload => ({
  id: note.id,
  userId: note.userId,
  title: note.title,
  content: note.content,
  tags: note.tags,
  checklist: (note.checklist ?? []) as NotePayload["checklist"],
  type: note.type as NotePayload["type"],
  pinned: note.pinned,
  archived: note.archived,
  trashed: note.trashed,
  createdAt: note.createdAt.toISOString(),
  updatedAt: note.updatedAt.toISOString(),
})
