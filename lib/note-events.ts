import { Pool, type PoolClient } from "pg";
import type { NotePayload } from "@/types/note";

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

type EventListener = (event: SSEEvent) => void;
type BroadcastPayload = {
  userId: string;
  event: SSEEvent;
};

const listeners = new Map<string, Set<EventListener>>();
const channelName = "notemaster_note_events";
const connectionString = process.env.DATABASE_URL;
const pgPool = connectionString
  ? new Pool({
      connectionString,
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null;

let listenerClientPromise: Promise<PoolClient | null> | null = null;

function broadcastLocal(userId: string, event: SSEEvent): void {
  const userListeners = listeners.get(userId);
  if (!userListeners) return;

  userListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error("Failed to broadcast event:", error);
    }
  });
}

async function ensurePgListener(): Promise<PoolClient | null> {
  if (!pgPool) return null;
  if (!listenerClientPromise) {
    listenerClientPromise = (async () => {
      const client = await pgPool.connect();
      await client.query(`LISTEN ${channelName}`);
      client.on("notification", (message) => {
        if (!message.payload) return;
        try {
          const payload = JSON.parse(message.payload) as BroadcastPayload;
          broadcastLocal(payload.userId, payload.event);
        } catch (error) {
          console.error("Failed to parse note event notification:", error);
        }
      });
      client.on("error", (error) => {
        console.error("Postgres listener error:", error);
        listenerClientPromise = null;
      });
      return client;
    })().catch((error) => {
      console.error("Failed to initialize Postgres note-event listener:", error);
      listenerClientPromise = null;
      return null;
    });
  }

  return listenerClientPromise;
}

export function subscribeToEvents(userId: string, listener: EventListener): () => void {
  if (!listeners.has(userId)) {
    listeners.set(userId, new Set());
  }
  listeners.get(userId)?.add(listener);
  void ensurePgListener();

  return () => {
    listeners.get(userId)?.delete(listener);
    if (listeners.get(userId)?.size === 0) {
      listeners.delete(userId);
    }
  };
}

export function emitNoteEvent(
  userId: string,
  type: NoteEventType,
  noteId: string,
  data?: Partial<NotePayload>
): void {
  const event: SSEEvent = {
    type,
    noteId,
    data,
    timestamp: Date.now(),
  };

  broadcastLocal(userId, event);

  if (pgPool) {
    const payload = JSON.stringify({ userId, event } satisfies BroadcastPayload).replace(/'/g, "''");
    void pgPool
      .query(`SELECT pg_notify('${channelName}', '${payload}')`)
      .catch((error) => {
        console.error("Failed to publish note event notification:", error);
      });
  }
}
