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
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = rateLimit(`notes-get-${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
    }

    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(notes.map(serializeNote), {
      headers: getRateLimitHeaders(rateLimitResult),
    })
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = rateLimit(`notes-post-${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
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

    // Input validation
    if (!payload.id || typeof payload.id !== "string") {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      )
    }

    let notebookId: string | null = null

    if (typeof payload.notebookId === "string" && payload.notebookId.trim()) {
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

        notebookId = notebook.id
      } catch (error) {
        console.error("Error validating notebook:", error)
        return NextResponse.json(
          { error: "Failed to validate notebook" },
          { status: 500 }
        )
      }
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

    return NextResponse.json(serializeNote(created), {
      status: 201,
      headers: getRateLimitHeaders(rateLimitResult),
    })
  } catch (error) {
    console.error("Error creating note:", error)
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    )
  }
}
