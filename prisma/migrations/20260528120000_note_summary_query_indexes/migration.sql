DROP INDEX IF EXISTS "Note_userId_updatedAt_idx";
DROP INDEX IF EXISTS "Note_userId_trashed_archived_idx";

CREATE INDEX IF NOT EXISTS "Note_userId_updatedAt_id_idx" ON "Note"("userId", "updatedAt" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "Note_userId_trashed_archived_updatedAt_idx" ON "Note"("userId", "trashed", "archived", "updatedAt" DESC);
