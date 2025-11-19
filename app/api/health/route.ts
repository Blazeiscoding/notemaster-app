import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRequestId } from "@/lib/logger";
import type { ApiResponse } from "@/lib/api-middleware";

/**
 * Health check endpoint
 * Returns the health status of the application and database
 * Useful for monitoring and load balancer health checks
 */
export async function GET() {
  const requestId = generateRequestId();
  
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;

    const response: ApiResponse<{ status: string; services: { database: string } }> = {
      success: true,
      data: {
        status: "healthy",
        services: {
          database: "connected",
        },
      },
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { 
      status: 200,
      headers: { "X-Request-Id": requestId },
    });
  } catch (error) {
    const response: ApiResponse<{ status: string; services: { database: string } }> = {
      success: false,
      data: {
        status: "unhealthy",
        services: {
          database: "disconnected",
        },
      },
      error: process.env.NODE_ENV === "development" 
        ? error instanceof Error ? error.message : "Unknown error"
        : "Database connection failed",
      meta: {
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { 
      status: 503,
      headers: { "X-Request-Id": requestId },
    });
  }
}

