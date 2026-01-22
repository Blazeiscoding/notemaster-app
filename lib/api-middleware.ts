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

/**
 * Wraps an API route handler with authentication and rate limiting
 * 
 * @example
 * export const GET = withAuth(async ({ userId, rateLimitHeaders }) => {
 *   // Your handler logic here
 *   return NextResponse.json({ data: "..." }, { headers: rateLimitHeaders });
 * });
 */
export function withAuth(
  handler: (context: ApiContext) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest | Request) => {
    const requestId = generateRequestId();
    const method = request instanceof NextRequest 
      ? request.method 
      : (request as Request).method;
    const url = request instanceof NextRequest 
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

      // Create context and call handler
      const context: ApiContext = {
        userId,
        request,
        rateLimitHeaders,
        requestId,
        logger,
      };

      return await handler(context);
    } catch (error) {
      const logger = createLogger({ requestId, route, method });
      logger.error("API route error", error, { route, method });
      return NextResponse.json(
        { 
          success: false, 
          error: process.env.NODE_ENV === "production" 
            ? "Internal server error" 
            : error instanceof Error ? error.message : "Internal server error"
        },
        { status: 500, headers: { "X-Request-Id": requestId } }
      );
    }
  };
}

/**
 * Wraps an API route handler with authentication, rate limiting, and JSON parsing
 * Useful for POST/PATCH/PUT routes that need request body
 * 
 * @example
 * export const POST = withAuthAndJson(async ({ userId, rateLimitHeaders, body }) => {
 *   // body is already parsed
 *   return NextResponse.json({ success: true }, { headers: rateLimitHeaders });
 * });
 */
export function withAuthAndJson(
  handler: (
    context: ApiContext & { body: unknown }
  ) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (request: NextRequest | Request) => {
    const requestId = generateRequestId();
    const method = request instanceof NextRequest 
      ? request.method 
      : (request as Request).method;
    const url = request instanceof NextRequest 
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

      // Parse JSON body
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        logger.warn("Invalid JSON body", { route });
        return NextResponse.json(
          { success: false, error: "Invalid request format" },
          { status: 400, headers: { "X-Request-Id": requestId } }
        );
      }

      // Create context and call handler
      const context: ApiContext & { body: unknown } = {
        userId,
        request,
        rateLimitHeaders,
        requestId,
        logger,
        body,
      };

      return await handler(context);
    } catch (error) {
      const logger = createLogger({ requestId, route, method });
      logger.error("API route error", error, { route, method });
      return NextResponse.json(
        { 
          success: false, 
          error: process.env.NODE_ENV === "production" 
            ? "Internal server error" 
            : error instanceof Error ? error.message : "Internal server error"
        },
        { status: 500, headers: { "X-Request-Id": requestId } }
      );
    }
  };
}

/**
 * Wraps an API route handler with authentication, rate limiting, and params support
 * Useful for routes with dynamic segments like [id]
 * 
 * @example
 * export const PATCH = withAuthAndParams(
 *   async ({ userId, rateLimitHeaders }, { id }) => {
 *     // Your handler logic here
 *   }
 * );
 */
export function withAuthAndParams<TParams extends Promise<Record<string, string>>>(
  handler: (
    context: ApiContext,
    params: Awaited<TParams>
  ) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (
    request: NextRequest | Request,
    { params }: { params: TParams }
  ) => {
    const requestId = generateRequestId();
    const method = request instanceof NextRequest 
      ? request.method 
      : (request as Request).method;
    const url = request instanceof NextRequest 
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
      const resolvedParams = await params;
      const logger = createLogger({ requestId, route, method, userId });

      // Create context and call handler
      const context: ApiContext = {
        userId,
        request,
        rateLimitHeaders,
        requestId,
        logger,
      };

      return await handler(context, resolvedParams);
    } catch (error) {
      const logger = createLogger({ requestId, route, method });
      logger.error("API route error", error, { route, method });
      return NextResponse.json(
        { 
          success: false, 
          error: process.env.NODE_ENV === "production" 
            ? "Internal server error" 
            : error instanceof Error ? error.message : "Internal server error"
        },
        { status: 500, headers: { "X-Request-Id": requestId } }
      );
    }
  };
}

/**
 * Wraps an API route handler with authentication, rate limiting, JSON parsing, and params
 * Useful for POST/PATCH/PUT routes with dynamic segments
 * 
 * @example
 * export const PATCH = withAuthJsonAndParams(
 *   async ({ userId, rateLimitHeaders, body }, { id }) => {
 *     // body and id are available
 *   }
 * );
 */
export function withAuthJsonAndParams<TParams extends Promise<Record<string, string>>>(
  handler: (
    context: ApiContext & { body: unknown },
    params: Awaited<TParams>
  ) => Promise<NextResponse>,
  options: AuthOptions = {}
) {
  return async (
    request: NextRequest | Request,
    { params }: { params: TParams }
  ) => {
    const requestId = generateRequestId();
    const method = request instanceof NextRequest 
      ? request.method 
      : (request as Request).method;
    const url = request instanceof NextRequest 
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
      const resolvedParams = await params;
      const logger = createLogger({ requestId, route, method, userId });

      // Parse JSON body
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        logger.warn("Invalid JSON body", { route });
        return NextResponse.json(
          { success: false, error: "Invalid request format" },
          { status: 400, headers: { "X-Request-Id": requestId } }
        );
      }

      // Create context and call handler
      const context: ApiContext & { body: unknown } = {
        userId,
        request,
        rateLimitHeaders,
        requestId,
        logger,
        body,
      };

      return await handler(context, resolvedParams);
    } catch (error) {
      const logger = createLogger({ requestId, route, method });
      logger.error("API route error", error, { route, method });
      return NextResponse.json(
        { 
          success: false, 
          error: process.env.NODE_ENV === "production" 
            ? "Internal server error" 
            : error instanceof Error ? error.message : "Internal server error"
        },
        { status: 500, headers: { "X-Request-Id": requestId } }
      );
    }
  };
}

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

