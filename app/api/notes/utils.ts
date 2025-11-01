import type { Note } from "@prisma/client"
import type { NotePayload } from "@/types/note"
import { decryptChecklist, decryptString, decryptStringArray } from "@/lib/encryption"

export const serializeNote = (note: Note): NotePayload => ({
  id: note.id,
  userId: note.userId,
  title: decryptString(note.title),
  content: decryptString(note.content),
  tags: decryptStringArray(note.tags),
  checklist: decryptChecklist(note.checklist),
  type: note.type as NotePayload["type"],
  pinned: note.pinned,
  archived: note.archived,
  trashed: note.trashed,
  createdAt: note.createdAt.toISOString(),
  updatedAt: note.updatedAt.toISOString(),
})
