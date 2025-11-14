/**
 * API Route Middleware
 * Provides reusable middleware for authentication and rate limiting
 * Works with proxy.ts (Clerk middleware) for auth
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

/**
 * Context passed to route handlers
 */
export interface ApiContext {
  userId: string;
  request: NextRequest | Request;
  rateLimitHeaders: Record<string, string>;
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
    try {
      // Get authenticated user (via proxy.ts Clerk middleware)
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // Determine HTTP method for rate limiting
      const method = request instanceof NextRequest 
        ? request.method 
        : (request as Request).method;
      
      const rateLimitSuffix = options.rateLimitSuffix || method.toLowerCase();
      const rateLimitIdentifier = `${rateLimitSuffix}-${userId}`;

      // Apply rate limiting
      const rateLimitResult = rateLimit(rateLimitIdentifier);
      
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: getRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

      // Create context and call handler
      const context: ApiContext = {
        userId,
        request,
        rateLimitHeaders,
      };

      return await handler(context);
    } catch (error) {
      console.error("API route error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
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
    try {
      // Get authenticated user (via proxy.ts Clerk middleware)
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // Determine HTTP method for rate limiting
      const method = request instanceof NextRequest 
        ? request.method 
        : (request as Request).method;
      
      const rateLimitSuffix = options.rateLimitSuffix || method.toLowerCase();
      const rateLimitIdentifier = `${rateLimitSuffix}-${userId}`;

      // Apply rate limiting
      const rateLimitResult = rateLimit(rateLimitIdentifier);
      
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: getRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

      // Parse JSON body
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid request format" },
          { status: 400 }
        );
      }

      // Create context and call handler
      const context: ApiContext & { body: unknown } = {
        userId,
        request,
        rateLimitHeaders,
        body,
      };

      return await handler(context);
    } catch (error) {
      console.error("API route error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
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
    try {
      // Get authenticated user (via proxy.ts Clerk middleware)
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // Determine HTTP method for rate limiting
      const method = request instanceof NextRequest 
        ? request.method 
        : (request as Request).method;
      
      const rateLimitSuffix = options.rateLimitSuffix || method.toLowerCase();
      const rateLimitIdentifier = `${rateLimitSuffix}-${userId}`;

      // Apply rate limiting
      const rateLimitResult = rateLimit(rateLimitIdentifier);
      
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: getRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
      const resolvedParams = await params;

      // Create context and call handler
      const context: ApiContext = {
        userId,
        request,
        rateLimitHeaders,
      };

      return await handler(context, resolvedParams);
    } catch (error) {
      console.error("API route error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
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
    try {
      // Get authenticated user (via proxy.ts Clerk middleware)
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      // Determine HTTP method for rate limiting
      const method = request instanceof NextRequest 
        ? request.method 
        : (request as Request).method;
      
      const rateLimitSuffix = options.rateLimitSuffix || method.toLowerCase();
      const rateLimitIdentifier = `${rateLimitSuffix}-${userId}`;

      // Apply rate limiting
      const rateLimitResult = rateLimit(rateLimitIdentifier);
      
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: getRateLimitHeaders(rateLimitResult),
          }
        );
      }

      const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
      const resolvedParams = await params;

      // Parse JSON body
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid request format" },
          { status: 400 }
        );
      }

      // Create context and call handler
      const context: ApiContext & { body: unknown } = {
        userId,
        request,
        rateLimitHeaders,
        body,
      };

      return await handler(context, resolvedParams);
    } catch (error) {
      console.error("API route error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Helper to create error responses with rate limit headers
 */
export function errorResponse(
  message: string,
  status: number,
  rateLimitHeaders: Record<string, string>
): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: rateLimitHeaders,
    }
  );
}

/**
 * Helper to create success responses with rate limit headers
 */
export function successResponse<T>(
  data: T,
  status: number = 200,
  rateLimitHeaders: Record<string, string>
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: rateLimitHeaders,
  });
}

