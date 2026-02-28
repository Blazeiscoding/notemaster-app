/**
 * API Route Middleware
 * Provides reusable middleware for authentication and rate limiting
 * Works with proxy.ts (Clerk middleware) for auth
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { generateRequestId, createLogger } from "@/lib/logger";

/**
 * Context passed to route handlers
 */
export interface ApiContext {
  userId: string;
  request: NextRequest | Request;
  rateLimitHeaders: Record<string, string>;
  requestId: string;
  logger: ReturnType<typeof createLogger>;
}

/**
 * Options for withAuth middleware
 */
export interface AuthOptions {
  /**
   * Custom rate limit identifier suffix
   * Defaults to the HTTP method name
   */
  rateLimitSuffix?: string;
}

// ---------------------------------------------------------------------------
// Shared middleware core
// ---------------------------------------------------------------------------

/**
 * Core middleware that handles auth, rate limiting, request IDs, and errors.
 * All public middleware helpers delegate to this function.
 */
async function middlewareCore<TResult>(
  request: NextRequest | Request,
  options: AuthOptions,
  run: (context: ApiContext) => Promise<TResult>
): Promise<TResult | NextResponse> {
  const requestId = generateRequestId();
  const method =
    request instanceof NextRequest
      ? request.method
      : (request as Request).method;
  const url =
    request instanceof NextRequest
      ? request.url
      : (request as Request).url;
  const route = new URL(url).pathname;

  try {
    // Get authenticated user (via proxy.ts Clerk middleware)
    const { userId } = await auth();

    if (!userId) {
      const logger = createLogger({ requestId, route, method });
      logger.warn("Authentication required", { route });
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401, headers: { "X-Request-Id": requestId } }
      );
    }

    const rateLimitSuffix = options.rateLimitSuffix || method.toLowerCase();
    const rateLimitIdentifier = `${rateLimitSuffix}-${userId}`;

    // Apply rate limiting
    const rateLimitResult = rateLimit(rateLimitIdentifier);

    if (!rateLimitResult.success) {
      const logger = createLogger({ requestId, route, method, userId });
      logger.warn("Rate limit exceeded", { rateLimitIdentifier });
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { ...getRateLimitHeaders(rateLimitResult), "X-Request-Id": requestId },
        }
      );
    }

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
    const logger = createLogger({ requestId, route, method, userId });

    const context: ApiContext = {
      userId,
      request,
      rateLimitHeaders,
      requestId,
      logger,
    };

    return await run(context);
  } catch (error) {
    const logger = createLogger({ requestId, route, method });
    logger.error("API route error", error, { route, method });
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "production"
            ? "Internal server error"
            : error instanceof Error
              ? error.message
              : "Internal server error",
      },
      { status: 500, headers: { "X-Request-Id": requestId } }
    );
  }
}

/**
 * Parse JSON body from request, returning an error response on failure.
 */
async function parseJsonBody(
  request: NextRequest | Request,
  logger: ReturnType<typeof createLogger>,
  requestId: string,
  route: string
): Promise<{ body: unknown } | NextResponse> {
  try {
    return { body: await request.json() };
  } catch {
    logger.warn("Invalid JSON body", { route });
    return NextResponse.json(
      { success: false, error: "Invalid request format" },
      { status: 400, headers: { "X-Request-Id": requestId } }
    );
  }
}

// ---------------------------------------------------------------------------
// Public middleware helpers
// ---------------------------------------------------------------------------

/**
 * Wraps an API route handler with authentication and rate limiting
 *
 * @example
 * export const GET = withAuth(async ({ userId, rateLimitHeaders }) => {
 *   return NextResponse.json({ data: "..." }, { headers: rateLimitHeaders });
 * });
 */
export function withAuth(
  handler: (context: ApiContext) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return (request: NextRequest | Request) =>
    middlewareCore(request, options, handler);
}

/**
 * Wraps an API route handler with authentication, rate limiting, and JSON parsing
 *
 * @example
 * export const POST = withAuthAndJson(async ({ userId, body }) => {
 *   return NextResponse.json({ success: true });
 * });
 */
export function withAuthAndJson(
  handler: (context: ApiContext & { body: unknown }) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return (request: NextRequest | Request) =>
    middlewareCore(request, options, async (ctx) => {
      const route = new URL(request.url).pathname;
      const result = await parseJsonBody(request, ctx.logger, ctx.requestId, route);
      if (result instanceof NextResponse) return result;
      return handler({ ...ctx, body: result.body });
    });
}

/**
 * Wraps an API route handler with authentication, rate limiting, and params support
 *
 * @example
 * export const PATCH = withAuthAndParams(async (ctx, { id }) => { ... });
 */
export function withAuthAndParams<TParams extends Promise<Record<string, string>>>(
  handler: (context: ApiContext, params: Awaited<TParams>) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return (request: NextRequest | Request, { params }: { params: TParams }) =>
    middlewareCore(request, options, async (ctx) => {
      const resolvedParams = await params;
      return handler(ctx, resolvedParams);
    });
}

/**
 * Wraps an API route handler with authentication, rate limiting, JSON parsing, and params
 *
 * @example
 * export const PATCH = withAuthJsonAndParams(async ({ body }, { id }) => { ... });
 */
export function withAuthJsonAndParams<TParams extends Promise<Record<string, string>>>(
  handler: (
    context: ApiContext & { body: unknown },
    params: Awaited<TParams>
  ) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return (request: NextRequest | Request, { params }: { params: TParams }) =>
    middlewareCore(request, options, async (ctx) => {
      const route = new URL(request.url).pathname;
      const result = await parseJsonBody(request, ctx.logger, ctx.requestId, route);
      if (result instanceof NextResponse) return result;
      const resolvedParams = await params;
      return handler({ ...ctx, body: result.body }, resolvedParams);
    });
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * Standardized API response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    requestId?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

/**
 * Helper to create error responses with standardized format
 */
export function errorResponse(
  message: string,
  status: number,
  rateLimitHeaders: Record<string, string>,
  requestId?: string
): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: message,
    meta: requestId ? { requestId, timestamp: new Date().toISOString() } : undefined,
  };

  return NextResponse.json(response, {
    status,
    headers: { ...rateLimitHeaders, ...(requestId && { "X-Request-Id": requestId }) },
  });
}

/**
 * Helper to create success responses with standardized format
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  rateLimitHeaders: Record<string, string>,
  requestId?: string,
  meta?: Record<string, unknown>
): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      ...(requestId && { requestId }),
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };

  return NextResponse.json(response, {
    status,
    headers: {
      ...rateLimitHeaders,
      ...(requestId && { "X-Request-Id": requestId }),
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
    },
  });
}
