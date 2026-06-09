export type ChecklistItem = {
  id: string
  text: string
  checked: boolean
}

export type Attachment = {
  id: string
  name: string
  type: string
  size: number
  data: string
}

export type NoteImageSummary = Pick<
  Attachment,
  "id" | "name" | "type" | "size" | "data"
>

export type NotePayload = {
  id: string
  userId: string | null
  title: string
  content: string
  tags: string[]
  checklist: ChecklistItem[]
  attachments: Attachment[]
  type: "note"
  pinned: boolean
  archived: boolean
  trashed: boolean
  dueAt: string | null
  createdAt: string
  updatedAt: string
}

export type NoteSummaryPayload = {
  id: string
  userId: string | null
  title: string
  preview: string
  tags: string[]
  checklistCompletedCount: number
  checklistTotalCount: number
  firstImage: NoteImageSummary | null
  type: "note"
  pinned: boolean
  archived: boolean
  trashed: boolean
  dueAt: string | null
  createdAt: string
  updatedAt: string
}

export type NoteRevisionPayload = {
  id: string
  noteId: string
  title: string
  content: string
  tags: string[]
  checklist: ChecklistItem[]
  attachments: Attachment[]
  pinned: boolean
  archived: boolean
  trashed: boolean
  dueAt: string | null
  createdAt: string
}

export type AccentPalette = {
  id: string
  name: string
  primary: string
  accent: string
  fontScale: number
  background: string
  texture?: string | null
}

export type SectionKey = "notes" | "archive" | "bin"

const NOTE_PREVIEW_LENGTH = 240

export const buildNotePreview = (content: string): string => {
  const text = content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!text) return "No content yet"
  return text.length > NOTE_PREVIEW_LENGTH
    ? `${text.slice(0, NOTE_PREVIEW_LENGTH).trimEnd()}...`
    : text
}

export const deriveNoteSummary = (note: NotePayload): NoteSummaryPayload => {
  const firstImage =
    note.attachments.find((attachment) => attachment.type.startsWith("image/")) ??
    null

  return {
    id: note.id,
    userId: note.userId,
    title: note.title,
    preview: buildNotePreview(note.content),
    tags: note.tags,
    checklistCompletedCount: note.checklist.filter((item) => item.checked)
      .length,
    checklistTotalCount: note.checklist.length,
    firstImage,
    type: note.type,
    pinned: note.pinned,
    archived: note.archived,
    trashed: note.trashed,
    dueAt: note.dueAt,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}
