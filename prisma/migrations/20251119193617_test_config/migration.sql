-- CreateIndex
CREATE INDEX "Note_userId_trashed_archived_idx" ON "Note"("userId", "trashed", "archived");

-- CreateIndex
CREATE INDEX "Note_userId_notebookId_trashed_idx" ON "Note"("userId", "notebookId", "trashed");

-- CreateIndex
CREATE INDEX "Note_userId_updatedAt_idx" ON "Note"("userId", "updatedAt" DESC);
