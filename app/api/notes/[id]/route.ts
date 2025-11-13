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
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"

type ParamsPromise = Promise<{ id: string }>

export async function PATCH(request: NextRequest, { params }: { params: ParamsPromise }) {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = rateLimit(`notes-patch-${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
    }

    const existing = await prisma.note.findUnique({ where: { id } })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    let payload: Partial<NotePayload>

    try {
      payload = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      )
    }

    const data: Prisma.NoteUpdateInput = {}

    if (typeof payload.notebookId === "string") {
      if (payload.notebookId === "") {
        data.notebook = { disconnect: true }
      } else {
        try {
          const notebook = await prisma.notebook.findUnique({
            where: { id: payload.notebookId },
            select: { id: true, userId: true },
          })

          if (!notebook || notebook.userId !== userId) {
            return NextResponse.json(
              { error: "Notebook not found" },
              { status: 404 }
            )
          }

          data.notebook = { connect: { id: notebook.id } }
        } catch (error) {
          console.error("Error validating notebook:", error)
          return NextResponse.json(
            { error: "Failed to validate notebook" },
            { status: 500 }
          )
        }
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
      return NextResponse.json(serializeNote(existing), {
        headers: getRateLimitHeaders(rateLimitResult),
      })
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

    return NextResponse.json(serializeNote(updated), {
      headers: getRateLimitHeaders(rateLimitResult),
    })
  } catch (error) {
    console.error("Error updating note:", error)
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: ParamsPromise }) {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = rateLimit(`notes-delete-${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
    }

    const existing = await prisma.note.findUnique({ where: { id } })

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    await prisma.note.delete({ where: { id } })

    return NextResponse.json({ success: true }, {
      headers: getRateLimitHeaders(rateLimitResult),
    })
  } catch (error) {
    console.error("Error deleting note:", error)
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    )
  }
}
