import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { serializeNotebook } from "../utils"

interface Params {
  id: string
}

type ParamsPromise = Promise<Params>

export async function PATCH(request: Request, { params }: { params: ParamsPromise }) {
  const { userId } = await auth()
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await prisma.notebook.findUnique({ where: { id } })

  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let payload: { name?: string; color?: string; parentId?: string | null }

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const updates: {
    name?: string
    color?: string
    parent?: { connect: { id: string } } | { disconnect: true }
  } = {}

  if (typeof payload.name === "string" && payload.name.trim()) {
    updates.name = payload.name.trim()
  }

  if (typeof payload.color === "string" && payload.color.trim()) {
    updates.color = payload.color.trim()
  }

  if (Object.prototype.hasOwnProperty.call(payload, "parentId")) {
    if (!payload.parentId) {
      updates.parent = { disconnect: true }
    } else {
      if (payload.parentId === id) {
        return NextResponse.json({ error: "Notebook cannot reference itself" }, { status: 400 })
      }

      const parent = await prisma.notebook.findUnique({
        where: { id: payload.parentId },
        select: { id: true, userId: true },
      })

      if (!parent || parent.userId !== userId) {
        return NextResponse.json({ error: "Parent notebook not found" }, { status: 400 })
      }

      updates.parent = { connect: { id: parent.id } }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(serializeNotebook(existing))
  }

  const updated = await prisma.notebook.update({
    where: { id },
    data: {
      name: updates.name,
      color: updates.color,
      parent: updates.parent,
    },
  })

  return NextResponse.json(serializeNotebook(updated))
}

export async function DELETE(_request: Request, { params }: { params: ParamsPromise }) {
  const { userId } = await auth()
  const { id } = await params

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await prisma.notebook.findUnique({ where: { id } })

  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const reassigned = await prisma.note.updateMany({
    where: { notebookId: existing.id },
    data: { notebookId: null },
  })

  await prisma.notebook.delete({ where: { id } })

  return NextResponse.json({ success: true, releasedNotes: reassigned.count })
}
