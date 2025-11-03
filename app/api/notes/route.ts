import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
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

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const notes = await prisma.note.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(notes.map(serializeNote))
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: Partial<NotePayload>

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!payload.id) {
    return NextResponse.json({ error: "Missing note id" }, { status: 400 })
  }

  let notebookId: string | null = null

  if (typeof payload.notebookId === "string" && payload.notebookId.trim()) {
    const notebook = await prisma.notebook.findUnique({
      where: { id: payload.notebookId },
      select: { id: true, userId: true },
    })

    if (!notebook || notebook.userId !== userId) {
      return NextResponse.json(
        { error: "Notebook not found" },
        { status: 400 }
      )
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
    attachments: encryptAttachments(payload.attachments ?? []) as Prisma.InputJsonValue,
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

  return NextResponse.json(serializeNote(created), { status: 201 })
}
