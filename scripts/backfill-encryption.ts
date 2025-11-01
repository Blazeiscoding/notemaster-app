import { Prisma } from "@prisma/client"

import { prisma } from "../lib/prisma"
import {
  decryptChecklist,
  decryptString,
  decryptStringArray,
  encryptChecklist,
  encryptString,
  encryptStringArray,
} from "../lib/encryption"

const BATCH_SIZE = 100

type SerializedChecklist = Prisma.JsonValue

const isPlainString = (stored: string) => decryptString(stored) === stored

const isPlainStringArray = (stored: string[]) =>
  stored.every((value, index) => decryptString(value) === stored[index])

const isPlainChecklist = (stored: SerializedChecklist) => {
  const decrypted = decryptChecklist(stored)

  if (!Array.isArray(stored)) {
    return decrypted.length === 0
  }

  return stored.every((item, index) => {
    if (!item || typeof item !== "object") {
      return true
    }

    const original = item as { text?: unknown }
    const decryptedItem = decrypted[index]

    if (!decryptedItem) {
      return true
    }

    const text = typeof original.text === "string" ? original.text : ""

    return decryptedItem.text === text
  })
}

async function backfillBatch(cursor?: { id: string }) {
  const notes = await prisma.note.findMany({
    take: BATCH_SIZE,
    ...(cursor ? { skip: 1, cursor } : {}),
    orderBy: { id: "asc" },
  })

  if (notes.length === 0) {
    return { count: 0, cursor: undefined as { id: string } | undefined }
  }

  let updatedCount = 0

  for (const note of notes) {
    const data: Prisma.NoteUpdateInput = {}

    if (note.title && isPlainString(note.title)) {
      data.title = encryptString(note.title)
    }

    if (note.content && isPlainString(note.content)) {
      data.content = encryptString(note.content)
    }

    if (Array.isArray(note.tags) && note.tags.length > 0 && isPlainStringArray(note.tags)) {
      data.tags = encryptStringArray(note.tags)
    }

    if (note.checklist && isPlainChecklist(note.checklist)) {
      const decrypted = decryptChecklist(note.checklist)
      data.checklist = encryptChecklist(decrypted) as Prisma.InputJsonValue
    }

    if (Object.keys(data).length > 0) {
      await prisma.note.update({ where: { id: note.id }, data })
      updatedCount += 1
    }
  }

  const nextCursor = notes.length === BATCH_SIZE ? { id: notes[notes.length - 1].id } : undefined

  return { count: updatedCount, cursor: nextCursor }
}

async function run() {
  let cursor: { id: string } | undefined
  let totalUpdated = 0

  for (;;) {
    const { count, cursor: nextCursor } = await backfillBatch(cursor)
    totalUpdated += count

    if (!nextCursor) {
      break
    }

    cursor = nextCursor
  }

  console.log(`Backfill complete. Updated ${totalUpdated} notes.`)
}

run()
  .catch((error) => {
    console.error("Backfill failed", error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
