import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { serializeNote } from "../utils"
import {
  encryptAttachments,
  encryptChecklist,
  encryptString,
  encryptStringArray,
} from "@/lib/encryption"
import type { NotePayload } from "@/types/note"

type ParamsPromise = Promise<{ id: string }>

export async function PATCH(request: NextRequest, { params }: { params: ParamsPromise }) {
  const { id } = await params
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await prisma.note.findUnique({ where: { id } })

  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let payload: Partial<NotePayload>

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const data: Prisma.NoteUpdateInput = {}

  if (typeof payload.notebookId === "string") {
    if (payload.notebookId === "") {
      data.notebook = { disconnect: true }
    } else {
      const notebook = await prisma.notebook.findUnique({
        where: { id: payload.notebookId },
        select: { id: true, userId: true },
      })

      if (!notebook || notebook.userId !== userId) {
        return NextResponse.json({ error: "Notebook not found" }, { status: 400 })
      }

      data.notebook = { connect: { id: notebook.id } }
    }
  }

  if (typeof payload.title === "string") {
    data.title = encryptString(payload.title)
  }

  if (typeof payload.content === "string") {
    data.content = encryptString(payload.content)
  }

  if (Array.isArray(payload.tags)) {
    data.tags = encryptStringArray(payload.tags)
  }

  if (Array.isArray(payload.checklist)) {
    data.checklist = encryptChecklist(payload.checklist) as Prisma.InputJsonValue
  }

  if (Array.isArray(payload.attachments)) {
    data.attachments = encryptAttachments(payload.attachments) as Prisma.InputJsonValue
  }

  if (typeof payload.type === "string") {
    data.type = payload.type
  }

  if (typeof payload.pinned === "boolean") {
    data.pinned = payload.pinned
  }

  if (typeof payload.archived === "boolean") {
    data.archived = payload.archived
  }

  if (typeof payload.trashed === "boolean") {
    data.trashed = payload.trashed
  }

  if (typeof payload.dueAt === "string") {
    data.dueAt = payload.dueAt ? new Date(payload.dueAt) : null
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(serializeNote(existing))
  }

  const revisionData: Prisma.NoteRevisionUncheckedCreateInput = {
    noteId: existing.id,
    notebookId: existing.notebookId,
    title: existing.title,
    content: existing.content,
    tags: existing.tags,
    checklist: existing.checklist as Prisma.InputJsonValue,
    attachments: existing.attachments as Prisma.InputJsonValue,
    pinned: existing.pinned,
    archived: existing.archived,
    trashed: existing.trashed,
    dueAt: existing.dueAt ?? undefined,
  }

  await prisma.noteRevision.create({
    data: revisionData,
  })

  const updated = await prisma.note.update({
    where: { id },
    data,
  })

  return NextResponse.json(serializeNote(updated))
}

export async function DELETE(_request: NextRequest, { params }: { params: ParamsPromise }) {
  const { id } = await params
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await prisma.note.findUnique({ where: { id } })

  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.note.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
