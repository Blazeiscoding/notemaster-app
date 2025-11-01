import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { serializeNote } from "../utils"
import { encryptChecklist, encryptString, encryptStringArray } from "@/lib/encryption"
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
