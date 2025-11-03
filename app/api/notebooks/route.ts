import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { serializeNotebook } from "./utils"

export async function GET() {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const notebooks = await prisma.notebook.findMany({
    where: { userId },
    orderBy: [{ parentId: "asc" }, { name: "asc" }],
  })

  return NextResponse.json(notebooks.map(serializeNotebook))
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let payload: {
    name?: string
    color?: string
    parentId?: string | null
  }

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const name = typeof payload.name === "string" && payload.name.trim()
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  let parentId: string | null = null

  if (typeof payload.parentId === "string" && payload.parentId.trim()) {
    const parent = await prisma.notebook.findUnique({
      where: { id: payload.parentId },
      select: { id: true, userId: true },
    })

    if (!parent || parent.userId !== userId) {
      return NextResponse.json({ error: "Parent notebook not found" }, { status: 400 })
    }

    parentId = parent.id
  }

  const created = await prisma.notebook.create({
    data: {
      name,
      userId,
      parentId,
      color: typeof payload.color === "string" && payload.color.trim() ? payload.color : undefined,
    },
  })

  return NextResponse.json(serializeNotebook(created), { status: 201 })
}
