import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { serializeNote, serializeRevision } from "../../utils"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { sanitizeId } from "@/lib/validation"

interface Params {
  id: string
}

type ParamsPromise = Promise<Params>

export async function GET(_request: Request, { params }: { params: ParamsPromise }) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = rateLimit(`revisions-get-${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
    }

    const note = await prisma.note.findUnique({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!note || note.userId !== userId) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    const revisions = await prisma.noteRevision.findMany({
      where: { noteId: note.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return NextResponse.json(revisions.map(serializeRevision), {
      headers: getRateLimitHeaders(rateLimitResult),
    })
  } catch (error) {
    console.error("Error fetching revisions:", error)
    return NextResponse.json(
      { error: "Failed to fetch revisions" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: { params: ParamsPromise }) {
  try {
    const { userId } = await auth()
    const { id } = await params

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Rate limiting
    const rateLimitResult = rateLimit(`revisions-post-${userId}`)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        },
      )
    }

    const note = await prisma.note.findUnique({ where: { id } })

    if (!note || note.userId !== userId) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    let payload: unknown

    try {
      payload = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      )
    }

    if (typeof payload !== "object" || payload === null) {
      return NextResponse.json(
        { error: "Invalid payload format" },
        { status: 400 }
      )
    }

    const p = payload as Record<string, unknown>

    if (!p.revisionId || typeof p.revisionId !== "string") {
      return NextResponse.json(
        { error: "Revision ID is required" },
        { status: 400 }
      )
    }

    let revisionId: string
    try {
      revisionId = sanitizeId(p.revisionId)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid revision ID" },
        { status: 400 }
      )
    }

    const revision = await prisma.noteRevision.findUnique({
      where: { id: revisionId },
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

    return NextResponse.json(serializeNote(updated), {
      headers: getRateLimitHeaders(rateLimitResult),
    })
  } catch (error) {
    console.error("Error restoring revision:", error)
    return NextResponse.json(
      { error: "Failed to restore revision" },
      { status: 500 }
    )
  }
}
