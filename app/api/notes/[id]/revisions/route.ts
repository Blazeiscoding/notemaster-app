import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { serializeNote, serializeRevision } from "../../utils"

interface Params {
  id: string
}

type ParamsPromise = Promise<Params>

export async function GET(_request: Request, { params }: { params: ParamsPromise }) {
  const { userId } = await auth()
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const note = await prisma.note.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })

  if (!note || note.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const revisions = await prisma.noteRevision.findMany({
    where: { noteId: note.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  })

  return NextResponse.json(revisions.map(serializeRevision))
}

export async function POST(request: Request, { params }: { params: ParamsPromise }) {
  const { userId } = await auth()
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const note = await prisma.note.findUnique({ where: { id } })

  if (!note || note.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let payload: { revisionId?: string }

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (typeof payload.revisionId !== "string") {
    return NextResponse.json({ error: "Revision id is required" }, { status: 400 })
  }

  const revision = await prisma.noteRevision.findUnique({
    where: { id: payload.revisionId },
  })

  if (!revision || revision.noteId !== note.id) {
    return NextResponse.json({ error: "Revision not found" }, { status: 404 })
  }

  const updated = await prisma.note.update({
    where: { id: note.id },
    data: {
      title: revision.title,
      content: revision.content,
      tags: revision.tags,
      checklist: revision.checklist as Prisma.InputJsonValue,
      attachments: revision.attachments as Prisma.InputJsonValue,
      pinned: revision.pinned,
      archived: revision.archived,
      trashed: revision.trashed,
      dueAt: revision.dueAt,
    },
  })

  return NextResponse.json(serializeNote(updated))
}
