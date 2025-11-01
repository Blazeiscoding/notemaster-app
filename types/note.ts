export type ChecklistItem = {
  id: string
  text: string
  checked: boolean
}

export type NotePayload = {
  id: string
  userId: string
  title: string
  content: string
  tags: string[]
  checklist: ChecklistItem[]
  type: "note"
  pinned: boolean
  archived: boolean
  trashed: boolean
  createdAt: string
  updatedAt: string
}
