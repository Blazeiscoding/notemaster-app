-- Remove notebook-related indexes/columns/tables after notebook feature decommission

-- Drop notebook-related indexes if they still exist.
DROP INDEX IF EXISTS "Note_userId_notebookId_trashed_idx";
DROP INDEX IF EXISTS "Note_notebookId_idx";

-- Remove notebook references from notes and revisions.
ALTER TABLE "Note" DROP COLUMN IF EXISTS "notebookId";
ALTER TABLE "NoteRevision" DROP COLUMN IF EXISTS "notebookId";

-- Drop notebook table.
DROP TABLE IF EXISTS "Notebook";
