# NoteMaster

Modern notes app built with Next.js 16, React 19, Prisma 7, Clerk auth, and optional ImageKit uploads.

## What It Does

- Rich text notes (TipTap) with headings, lists, quotes, code blocks, and inline image insertion.
- Checklist + tag support per note.
- Pin, archive, trash, restore, and permanent delete flows.
- Grid view and calendar view.
- Guest mode (local-first via IndexedDB) and signed-in mode (PostgreSQL sync).
- Offline-aware UI with pending sync queue indicator.
- PWA install support and Web Share Target (`/api/share`) to create notes from shared content.
- Encryption helpers for note fields using `NOTES_ENCRYPTION_KEY` (AES-256-GCM).
- Real-time note updates for authenticated users over SSE (`/api/notes/events`).
- Note export actions from editor: Markdown, PDF, and print.

## Current Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Prisma 7 + `@prisma/adapter-pg` + PostgreSQL
- Clerk (`@clerk/nextjs`)
- ImageKit (optional attachment/image uploads)
- IndexedDB (`idb`) for local persistence
- `next-pwa` for PWA integration

## Project Structure

```text
app/
  api/
    auth/imagekit/route.ts
    health/route.ts
    notes/...
    share/route.ts
  share/page.tsx
  sign-in/[[...sign-in]]/page.tsx
  sign-up/[[...sign-up]]/page.tsx
components/
  layout/
  note-app/hooks/
  notes/
  sidebar/
  ui/
lib/
  api-client.ts
  api-middleware.ts
  encryption.ts
  indexeddb.ts
  note-events.ts
  prisma.ts
prisma/
  schema.prisma
scripts/
  backfill-encryption.ts
```

## Environment Variables

Create `.env` (or `.env.local`) with:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

DATABASE_URL=
NOTES_ENCRYPTION_KEY=

NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=
```

Notes:

- `DATABASE_URL` is required for authenticated server-backed notes.
- `NOTES_ENCRYPTION_KEY` is strongly recommended. If missing, note fields fall back to plaintext storage.
- ImageKit variables are required if you use attachment/image uploads.

## Getting Started

### 1. Install dependencies

Using Bun (recommended):

```bash
bun install
```

Using npm:

```bash
npm install
```

### 2. Generate Prisma client and run migrations

```bash
bun run prisma:generate
bun run prisma:migrate
```

### 3. Start dev server

```bash
bun run dev
```

Open `http://localhost:3000`.

## Available Scripts

- `dev` - start local dev server
- `build` - `prisma generate && next build`
- `start` - run production server
- `lint` - run ESLint
- `prisma:generate` - generate Prisma client
- `prisma:migrate` - run Prisma migrations in dev mode

## API Endpoints

- `GET /api/health` - app/database health check
- `GET /api/notes` - fetch notes (supports cursor + limit pagination)
- `POST /api/notes` - create note
- `PATCH /api/notes/:id` - update note
- `DELETE /api/notes/:id` - delete note
- `GET /api/notes/:id/revisions` - fetch note revisions
- `POST /api/notes/:id/revisions` - restore revision
- `GET /api/notes/events` - SSE stream for note events
- `GET /api/auth/imagekit` - ImageKit upload auth params
- `POST /api/share` - PWA share target handler

## Operational Notes

- Rate limiting is currently in-memory (`lib/rate-limit.ts`), suitable for single-instance deployments.
- SSE event broadcasting is currently in-memory (`lib/note-events.ts`), so multi-instance deployments need shared pub/sub (e.g. Redis) for cross-instance real-time updates.
- Encryption backfill script exists at `scripts/backfill-encryption.ts` for migrating previously plaintext notes.
