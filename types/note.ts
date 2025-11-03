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

export type NotePayload = {
  id: string
  userId: string | null
  notebookId: string | null
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

export type NotebookPayload = {
  id: string
  userId: string
  parentId: string | null
  name: string
  color: string
  createdAt: string
  updatedAt: string
}

export type NoteRevisionPayload = {
  id: string
  noteId: string
  notebookId: string | null
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

export type NotebookTreeNode = NotebookPayload & {
  children: NotebookTreeNode[]
}

export type AccentPalette = {
  id: string
  name: string
  primary: string
  accent: string
}
