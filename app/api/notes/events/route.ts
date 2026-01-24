import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { subscribeToEvents, type SSEEvent } from "@/lib/note-events";

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

/**
 * SSE endpoint for real-time note updates
 * GET /api/notes/events
 */
export async function GET(request: NextRequest) {
  // Authenticate the user
  const { userId } = await auth();
  
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      const sendEvent = (event: SSEEvent) => {
        try {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          // Connection might be closed
        }
      };
      
      // Send connection established message
      sendEvent({
        type: "heartbeat",
        timestamp: Date.now(),
      });
      
      // Subscribe to events for this user
      const unsubscribe = subscribeToEvents(userId, sendEvent);
      
      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        sendEvent({
          type: "heartbeat",
          timestamp: Date.now(),
        });
      }, HEARTBEAT_INTERVAL);
      
      // Handle connection close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  // Return SSE response with appropriate headers
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

// Disable static rendering for this route
export const dynamic = "force-dynamic";
