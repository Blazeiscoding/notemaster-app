import { getPgPool } from "@/lib/pg-pool";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;

/** Expired rows are pruned on roughly this fraction of database-backed calls. */
const PRUNE_PROBABILITY = 0.01;
/** Cap on the in-memory fallback map, so it cannot grow without bound. */
const MEMORY_STORE_MAX_KEYS = 10_000;

let ensureTablePromise: Promise<void> | null = null;

async function ensureRateLimitTable() {
  const pool = getPgPool();
  if (!pool) return;

  if (!ensureTablePromise) {
    ensureTablePromise = pool
      .query(`
        CREATE TABLE IF NOT EXISTS app_rate_limits (
          identifier TEXT PRIMARY KEY,
          count INTEGER NOT NULL,
          reset_at TIMESTAMPTZ NOT NULL
        );
        CREATE INDEX IF NOT EXISTS app_rate_limits_reset_at_idx
          ON app_rate_limits (reset_at);
      `)
      .then(() => undefined)
      .catch((error) => {
        ensureTablePromise = null;
        throw error;
      });
  }

  await ensureTablePromise;
}

/**
 * Drop rows whose window has already elapsed.
 *
 * Every distinct identifier (one per user per route) left a permanent row
 * behind, so the table grew without bound. Pruning opportunistically keeps it
 * proportional to active users without needing a scheduled job.
 */
function pruneExpiredRows() {
  const pool = getPgPool();
  if (!pool) return;

  void pool
    .query("DELETE FROM app_rate_limits WHERE reset_at < NOW() - INTERVAL '1 hour'")
    .catch((error) => {
      console.error("Failed to prune expired rate limit rows", error);
    });
}

function pruneMemoryStore() {
  if (rateLimitStore.size <= MEMORY_STORE_MAX_KEYS) return;

  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}

function memoryRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetAt) {
    pruneMemoryStore();
    const newEntry = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW,
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      success: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetAt: newEntry.resetAt,
    };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count += 1;
  return {
    success: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetAt: entry.resetAt,
  };
}

async function databaseRateLimit(identifier: string): Promise<RateLimitResult> {
  const pool = getPgPool();
  if (!pool) {
    return memoryRateLimit(identifier);
  }

  await ensureRateLimitTable();

  if (Math.random() < PRUNE_PROBABILITY) {
    pruneExpiredRows();
  }

  const result = await pool.query<{
    count: number;
    reset_at_ms: string;
  }>(
    `
      INSERT INTO app_rate_limits (identifier, count, reset_at)
      VALUES ($1, 1, NOW() + INTERVAL '60 seconds')
      ON CONFLICT (identifier) DO UPDATE SET
        count = CASE
          WHEN app_rate_limits.reset_at <= NOW() THEN 1
          WHEN app_rate_limits.count < $2 THEN app_rate_limits.count + 1
          ELSE app_rate_limits.count
        END,
        reset_at = CASE
          WHEN app_rate_limits.reset_at <= NOW() THEN NOW() + INTERVAL '60 seconds'
          ELSE app_rate_limits.reset_at
        END
      RETURNING count, FLOOR(EXTRACT(EPOCH FROM reset_at) * 1000)::bigint AS reset_at_ms
    `,
    [identifier, RATE_LIMIT_MAX_REQUESTS]
  );

  const row = result.rows[0];
  const resetAt = Number(row?.reset_at_ms ?? Date.now() + RATE_LIMIT_WINDOW);
  const count = Number(row?.count ?? RATE_LIMIT_MAX_REQUESTS);

  return {
    success: count <= RATE_LIMIT_MAX_REQUESTS,
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - count),
    resetAt,
  };
}

export async function rateLimit(identifier: string): Promise<RateLimitResult> {
  try {
    return await databaseRateLimit(identifier);
  } catch (error) {
    console.error("Database-backed rate limit unavailable, falling back to memory", error);
    return memoryRateLimit(identifier);
  }
}

export function getRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
