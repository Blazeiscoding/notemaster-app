import type { NotePayload } from "@/types/note";

// Event types for real-time updates
export type NoteEventType = "note:created" | "note:updated" | "note:deleted";

export interface NoteEvent {
  type: NoteEventType;
  noteId: string;
  data?: Partial<NotePayload>;
  timestamp: number;
}

export interface HeartbeatEvent {
  type: "heartbeat";
  timestamp: number;
}

export type SSEEvent = NoteEvent | HeartbeatEvent;

// In-memory store for server-side event broadcasting
// In production, use Redis pub/sub for multi-instance support
type EventListener = (event: SSEEvent) => void;
const listeners = new Map<string, Set<EventListener>>();

/**
 * Subscribe to events for a specific user
 */
export function subscribeToEvents(userId: string, listener: EventListener): () => void {
  if (!listeners.has(userId)) {
    listeners.set(userId, new Set());
  }
  listeners.get(userId)!.add(listener);
  
  // Return unsubscribe function
  return () => {
    listeners.get(userId)?.delete(listener);
    if (listeners.get(userId)?.size === 0) {
      listeners.delete(userId);
    }
  };
}

function broadcastEvent(userId: string, event: SSEEvent): void {
  const userListeners = listeners.get(userId);
  if (userListeners) {
    userListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Failed to broadcast event:", error);
      }
    });
  }
}

/**
 * Emit a note event
 */
export function emitNoteEvent(
  userId: string,
  type: NoteEventType,
  noteId: string,
  data?: Partial<NotePayload>
): void {
  broadcastEvent(userId, {
    type,
    noteId,
    data,
    timestamp: Date.now(),
  });
}


