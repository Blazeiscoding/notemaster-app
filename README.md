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
- Serwist (`@serwist/next`) for the service worker / PWA integration

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
- `typecheck` - run `tsc --noEmit`
- `test` - run the Vitest suite once
- `test:watch` - run Vitest in watch mode
- `test:coverage` - run the suite with a coverage report
- `check` - typecheck + lint + test (what CI runs)
- `prisma:generate` - generate Prisma client
- `prisma:migrate` - run Prisma migrations in dev mode

## Testing

Unit tests live in `tests/` and run on Node with Vitest — no database or browser
required. They cover the security-sensitive and easily-broken pure logic:

- `tests/sanitize-html.test.ts` - the HTML allowlist that note content passes through
- `tests/validation.test.ts` - API payload validation
- `tests/encryption.test.ts` - AES-256-GCM round-trips and tamper detection
- `tests/note-import.test.ts` - import parsing, previews and summary derivation
- `tests/note-html.test.ts` - HTML-to-text conversion and draft change detection

```bash
bun run test
```

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

- Rate limiting (`lib/rate-limit.ts`) is backed by the `app_rate_limits` table, so
  limits are shared across instances. It falls back to a per-instance in-memory
  counter if the database is unreachable. Expired rows are pruned opportunistically.
- SSE event broadcasting (`lib/note-events.ts`) uses Postgres `LISTEN`/`NOTIFY`,
  so real-time updates cross instances without a separate pub/sub service.
  Postgres caps NOTIFY payloads at 8000 bytes; larger notes are published as a
  payload-free event and the client re-fetches the note by id.
- Postgres connections are shared through `lib/pg-pool.ts`. The `LISTEN` client
  uses a separate single-connection pool, since it is never returned to the pool.
- Encryption backfill script exists at `scripts/backfill-encryption.ts` for migrating previously plaintext notes.
- Note content is encrypted at rest, so full-text search cannot run in SQL.
  Client-side search matches title, the 240-character preview, and tags.

## Service Worker / PWA

The worker source is `app/sw.ts`; `serwist.config.mjs` drives the build.

Because this project builds with Turbopack, the worker is **not** produced by a
Next.js plugin — it is built by a separate `serwist build` step that `npm run
build` runs after `next build`. Registration happens through `<SerwistProvider>`
in `app/layout.tsx`.

- `npm run build:sw` rebuilds `public/sw.js` on its own (requires a prior
  `next build`, since it precaches from `.next/static`).
- `public/sw.js` is a build artifact and is gitignored.
- The worker is disabled in development.
- Editing caching strategy means editing `app/sw.ts`, then rebuilding.

## Security Notes

- All rich text passes through the allowlist sanitizer in `lib/sanitize-html.ts`
  before it is stored or re-rendered (print/export). Tags and attributes outside
  the allowlist, every `on*` handler, and non-http(s)/non-image-data URLs are
  dropped. Add a test to `tests/sanitize-html.test.ts` when changing it.
- API responses are sent `Cache-Control: private, no-store`; the service worker
  never caches `/api/*`.
- `NOTES_ENCRYPTION_KEY` should be at least 32 characters of random data.
  Changing it makes existing notes undecryptable.
