import type { Prisma } from "@prisma/client"
import type { NotePayload, NoteRevisionPayload } from "@/types/note"
import {
  decryptAttachments,
  decryptChecklist,
  decryptString,
  decryptStringArray,
} from "@/lib/encryption"

/**
 * Shared Prisma select fields for note queries.
 * Defined once here to avoid duplication across route files.
 */
export const noteSelect = {
  id: true,
  userId: true,
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
} as const satisfies Prisma.NoteSelect

type SerializableNote = {
  id: string
  userId: string
  title: string
  content: string
  tags: string[]
  checklist: Prisma.JsonValue
  type: string
  pinned: boolean
  archived: boolean
  trashed: boolean
  createdAt: Date
  updatedAt: Date
  attachments: Prisma.JsonValue
  dueAt: Date | null
}

type SerializableRevision = {
  id: string
  noteId: string
  title: string
  content: string
  tags: string[]
  checklist: Prisma.JsonValue
  attachments: Prisma.JsonValue
  pinned: boolean
  archived: boolean
  trashed: boolean
  createdAt: Date
  dueAt: Date | null
}

export const serializeNote = (note: SerializableNote): NotePayload => ({
  id: note.id,
  userId: note.userId,
  title: decryptString(note.title),
  content: decryptString(note.content),
  tags: decryptStringArray(note.tags),
  checklist: decryptChecklist(note.checklist),
  attachments: decryptAttachments(note.attachments),
  type: note.type as NotePayload["type"],
  pinned: note.pinned,
  archived: note.archived,
  trashed: note.trashed,
  dueAt: note.dueAt ? note.dueAt.toISOString() : null,
  createdAt: note.createdAt.toISOString(),
  updatedAt: note.updatedAt.toISOString(),
})

export const serializeRevision = (
  revision: SerializableRevision
): NoteRevisionPayload => ({
  id: revision.id,
  noteId: revision.noteId,
  title: decryptString(revision.title),
  content: decryptString(revision.content),
  tags: decryptStringArray(revision.tags),
  checklist: decryptChecklist(revision.checklist),
  attachments: decryptAttachments(revision.attachments ?? []),
  pinned: revision.pinned,
  archived: revision.archived,
  trashed: revision.trashed,
  dueAt: revision.dueAt ? revision.dueAt.toISOString() : null,
  createdAt: revision.createdAt.toISOString(),
})
