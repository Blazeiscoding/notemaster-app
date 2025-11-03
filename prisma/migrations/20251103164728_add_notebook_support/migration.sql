/*
  Warnings:

  - Added the required column `attachments` to the `Note` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "attachments" JSONB NOT NULL,
ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "notebookId" TEXT;

-- CreateTable
CREATE TABLE "Notebook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#2563EB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteRevision" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "notebookId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "checklist" JSONB NOT NULL,
    "attachments" JSONB NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "trashed" BOOLEAN NOT NULL DEFAULT false,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notebook_userId_idx" ON "Notebook"("userId");

-- CreateIndex
CREATE INDEX "Notebook_parentId_idx" ON "Notebook"("parentId");

-- CreateIndex
CREATE INDEX "NoteRevision_noteId_idx" ON "NoteRevision"("noteId");

-- CreateIndex
CREATE INDEX "NoteRevision_createdAt_idx" ON "NoteRevision"("createdAt");

-- CreateIndex
CREATE INDEX "Note_notebookId_idx" ON "Note"("notebookId");

-- CreateIndex
CREATE INDEX "Note_dueAt_idx" ON "Note"("dueAt");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notebook" ADD CONSTRAINT "Notebook_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Notebook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteRevision" ADD CONSTRAINT "NoteRevision_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
