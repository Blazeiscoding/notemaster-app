import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { serializeNotebook } from "./utils";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { validateNotebookPayload } from "@/lib/validation";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = rateLimit(`notebooks-get-${userId}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const notebooks = await prisma.notebook.findMany({
      where: { userId },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(notebooks.map(serializeNotebook), {
      headers: getRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
    console.error("Error fetching notebooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch notebooks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = rateLimit(`notebooks-post-${userId}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    let payload: unknown;

    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    // Input validation
    let validatedPayload;
    try {
      validatedPayload = validateNotebookPayload(payload);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid input" },
        { status: 400 }
      );
    }

    let parentId: string | null = validatedPayload.parentId ?? null;

    if (parentId) {
      try {
        const parent = await prisma.notebook.findUnique({
          where: { id: parentId },
          select: { id: true, userId: true },
        });

        if (!parent || parent.userId !== userId) {
          return NextResponse.json(
            { error: "Parent notebook not found" },
            { status: 404 }
          );
        }

        parentId = parent.id;
      } catch (error) {
        console.error("Error validating parent notebook:", error);
        return NextResponse.json(
          { error: "Failed to validate parent notebook" },
          { status: 500 }
        );
      }
    }

    const created = await prisma.notebook.create({
      data: {
        name: validatedPayload.name,
        userId,
        parentId,
        color: validatedPayload.color,
      },
    });

    return NextResponse.json(serializeNotebook(created), {
      status: 201,
      headers: getRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
    console.error("Error creating notebook:", error);
    return NextResponse.json(
      { error: "Failed to create notebook" },
      { status: 500 }
    );
  }
}
