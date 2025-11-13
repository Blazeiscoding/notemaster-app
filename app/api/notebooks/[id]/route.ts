import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { serializeNotebook } from "../utils";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import {
  sanitizeString,
  sanitizeColor,
  sanitizeOptionalId,
} from "@/lib/validation";

interface Params {
  id: string;
}

type ParamsPromise = Promise<Params>;

export async function PATCH(
  request: Request,
  { params }: { params: ParamsPromise }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = rateLimit(`notebooks-patch-${userId}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const existing = await prisma.notebook.findUnique({ where: { id } });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: "Notebook not found" },
        { status: 404 }
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

    if (typeof payload !== "object" || payload === null) {
      return NextResponse.json(
        { error: "Invalid payload format" },
        { status: 400 }
      );
    }

    const p = payload as Record<string, unknown>;

    const updates: {
      name?: string;
      color?: string;
      parent?: { connect: { id: string } } | { disconnect: true };
    } = {};

    if (p.name !== undefined) {
      try {
        updates.name = sanitizeString(p.name, 200);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Invalid name" },
          { status: 400 }
        );
      }
    }

    if (p.color !== undefined) {
      try {
        updates.color = sanitizeColor(p.color);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Invalid color" },
          { status: 400 }
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, "parentId")) {
      try {
        const parentId = sanitizeOptionalId(p.parentId);

        if (!parentId) {
          updates.parent = { disconnect: true };
        } else {
          if (parentId === id) {
            return NextResponse.json(
              { error: "Notebook cannot reference itself" },
              { status: 400 }
            );
          }

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

          updates.parent = { connect: { id: parent.id } };
        }
      } catch (error) {
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : "Invalid parent ID",
          },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(serializeNotebook(existing), {
        headers: getRateLimitHeaders(rateLimitResult),
      });
    }

    const updated = await prisma.notebook.update({
      where: { id },
      data: {
        name: updates.name,
        color: updates.color,
        parent: updates.parent,
      },
    });

    return NextResponse.json(serializeNotebook(updated), {
      headers: getRateLimitHeaders(rateLimitResult),
    });
  } catch (error) {
    console.error("Error updating notebook:", error);
    return NextResponse.json(
      { error: "Failed to update notebook" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: ParamsPromise }
) {
  try {
    const { userId } = await auth();
    const { id } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitResult = rateLimit(`notebooks-delete-${userId}`);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const existing = await prisma.notebook.findUnique({ where: { id } });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { error: "Notebook not found" },
        { status: 404 }
      );
    }

    const reassigned = await prisma.note.updateMany({
      where: { notebookId: existing.id },
      data: { notebookId: null },
    });

    await prisma.notebook.delete({ where: { id } });

    return NextResponse.json(
      { success: true, releasedNotes: reassigned.count },
      {
        headers: getRateLimitHeaders(rateLimitResult),
      }
    );
  } catch (error) {
    console.error("Error deleting notebook:", error);
    return NextResponse.json(
      { error: "Failed to delete notebook" },
      { status: 500 }
    );
  }
}
