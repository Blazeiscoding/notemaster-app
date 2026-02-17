"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { SSEEvent, NoteEvent, NotebookEvent } from "@/lib/note-events";

export type SSEConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export type SSEEventHandler = {
  onNoteCreated?: (noteId: string, data?: NoteEvent["data"]) => void;
  onNoteUpdated?: (noteId: string, data?: NoteEvent["data"]) => void;
  onNoteDeleted?: (noteId: string) => void;
  onNotebookCreated?: (notebookId: string, data?: NotebookEvent["data"]) => void;
  onNotebookUpdated?: (notebookId: string, data?: NotebookEvent["data"]) => void;
  onNotebookDeleted?: (notebookId: string) => void;
  onHeartbeat?: (timestamp: number) => void;
  onError?: (error: Error) => void;
};

export type UseSSEOptions = {
  enabled?: boolean;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
};

const DEFAULT_RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useSSE(
  handlers: SSEEventHandler,
  options: UseSSEOptions = {}
) {
  const {
    enabled = true,
    reconnectDelay = DEFAULT_RECONNECT_DELAY,
    maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS,
  } = options;

  const [status, setStatus] = useState<SSEConnectionStatus>("disconnected");
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handlersRef = useRef(handlers);
  const connectRef = useRef<(() => void) | null>(null);

  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Track page visibility to pause SSE when tab is hidden
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Effective enabled state: only connect if enabled AND tab is visible
  const effectiveEnabled = useMemo(
    () => enabled && isTabVisible,
    [enabled, isTabVisible]
  );

  // Process incoming event
  const handleEvent = useCallback((event: SSEEvent) => {
    const h = handlersRef.current;

    switch (event.type) {
      case "heartbeat":
        setLastHeartbeat(event.timestamp);
        h.onHeartbeat?.(event.timestamp);
        break;
      case "note:created":
        h.onNoteCreated?.(event.noteId, event.data);
        break;
      case "note:updated":
        h.onNoteUpdated?.(event.noteId, event.data);
        break;
      case "note:deleted":
        h.onNoteDeleted?.(event.noteId);
        break;
      case "notebook:created":
        h.onNotebookCreated?.(event.notebookId, event.data);
        break;
      case "notebook:updated":
        h.onNotebookUpdated?.(event.notebookId, event.data);
        break;
      case "notebook:deleted":
        h.onNotebookDeleted?.(event.notebookId);
        break;
    }
  }, []);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (eventSourceRef.current) return;

    setStatus("connecting");

    const eventSource = new EventSource("/api/notes/events");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStatus("connected");
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;
        handleEvent(data);
      } catch (error) {
        console.error("Failed to parse SSE event:", error);
      }
    };

    eventSource.onerror = () => {
      setStatus("error");
      eventSource.close();
      eventSourceRef.current = null;

      // Attempt reconnection with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
        reconnectAttemptsRef.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current?.();
        }, delay);
      } else {
        setStatus("disconnected");
        handlersRef.current.onError?.(new Error("Max reconnection attempts reached"));
      }
    };
  }, [handleEvent, maxReconnectAttempts, reconnectDelay]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus("disconnected");
    reconnectAttemptsRef.current = 0;
  }, []);

  // Manual reconnection
  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  // Connect/disconnect based on effective enabled state (respects tab visibility)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (effectiveEnabled) {
        connect();
      } else {
        disconnect();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [effectiveEnabled, connect, disconnect]);

  return {
    status,
    lastHeartbeat,
    isTabVisible,
    connect,
    disconnect,
    reconnect,
  };
}
