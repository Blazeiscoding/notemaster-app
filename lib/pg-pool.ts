import { Pool } from "pg";

/**
 * Shared Postgres connection pool.
 *
 * Prisma, the rate limiter and the note-event publisher each used to construct
 * their own `Pool`, so a single serverless instance opened three independent
 * sets of connections to the same database. They share one pool here instead.
 *
 * Cached on `globalThis` so dev-server hot reloads reuse the existing pool
 * rather than leaking a new one on every module re-evaluation.
 */
const globalForPg = globalThis as unknown as {
  pgPool?: Pool | null;
  pgListenPool?: Pool | null;
};

function createPool(max: number): Pool | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  return new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

/** The general-purpose pool, for queries that return their connection. */
export function getPgPool(): Pool | null {
  if (globalForPg.pgPool === undefined) {
    globalForPg.pgPool = createPool(10);
  }
  return globalForPg.pgPool;
}

/**
 * A separate single-connection pool for the LISTEN client.
 *
 * A `LISTEN` connection is checked out for the process lifetime and never
 * returned, so it must not come from the shared pool — it would permanently
 * consume one of its slots.
 */
export function getPgListenPool(): Pool | null {
  if (globalForPg.pgListenPool === undefined) {
    globalForPg.pgListenPool = createPool(1);
  }
  return globalForPg.pgListenPool;
}
