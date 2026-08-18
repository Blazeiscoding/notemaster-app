import { type PoolClient } from "pg";
import type { NotePayload } from "@/types/note";
import { getPgListenPool, getPgPool } from "@/lib/pg-pool";

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

/** Postgres caps NOTIFY payloads at 8000 bytes; leave room for JSON framing. */
const MAX_NOTIFY_PAYLOAD_BYTES = 7000;

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
  const listenPool = getPgListenPool();
  if (!listenPool) return null;

  if (!listenerClientPromise) {
    listenerClientPromise = (async () => {
      // Held for the process lifetime, hence its own dedicated pool.
      const client = await listenPool.connect();
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

  const pool = getPgPool();
  if (!pool) return;

  let payload = JSON.stringify({ userId, event } satisfies BroadcastPayload);

  // Postgres rejects NOTIFY payloads over 8000 bytes. A note carrying its full
  // body and attachment URLs blows past that, so the whole event used to be
  // dropped for exactly the notes most worth syncing. Fall back to a
  // data-less event; receivers re-fetch the note by id.
  if (Buffer.byteLength(payload, "utf8") > MAX_NOTIFY_PAYLOAD_BYTES) {
    payload = JSON.stringify({
      userId,
      event: { type, noteId, timestamp: event.timestamp },
    } satisfies BroadcastPayload);
  }

  // Parameterized so the payload is never concatenated into SQL text.
  void pool
    .query("SELECT pg_notify($1, $2)", [channelName, payload])
    .catch((error) => {
      console.error("Failed to publish note event notification:", error);
    });
}
