/**
 * Structured logging utility
 * Provides consistent logging with context (userId, requestId, timestamp)
 * Supports integration with error tracking services (e.g., Sentry)
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogContext {
  userId?: string;
  requestId?: string;
  route?: string;
  method?: string;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Generate a unique request ID for tracking requests across the system
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format log entry as JSON for structured logging
 */
function formatLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function logInfo(message: string, context?: LogContext): void {
  const entry: LogEntry = {
    level: "info",
    message,
    timestamp: new Date().toISOString(),
    context,
  };
  
  console.log(formatLogEntry(entry));
}

function logWarn(message: string, context?: LogContext): void {
  const entry: LogEntry = {
    level: "warn",
    message,
    timestamp: new Date().toISOString(),
    context,
  };
  
  console.warn(formatLogEntry(entry));
}

function logError(
  message: string,
  error?: Error | unknown,
  context?: LogContext
): void {
  const entry: LogEntry = {
    level: "error",
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  if (error instanceof Error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else if (error) {
    entry.error = {
      name: "UnknownError",
      message: String(error),
    };
  }

  console.error(formatLogEntry(entry));

  if (process.env.NODE_ENV === "production" && process.env.SENTRY_DSN) {
    // Sentry integration would go here
  }
}

function logDebug(message: string, context?: LogContext): void {
  if (process.env.NODE_ENV === "development") {
    const entry: LogEntry = {
      level: "debug",
      message,
      timestamp: new Date().toISOString(),
      context,
    };
    console.debug(formatLogEntry(entry));
  }
}

/**
 * Create a logger with default context
 */
export function createLogger(defaultContext: LogContext) {
  return {
    info: (message: string, context?: LogContext) =>
      logInfo(message, { ...defaultContext, ...context }),
    warn: (message: string, context?: LogContext) =>
      logWarn(message, { ...defaultContext, ...context }),
    error: (message: string, error?: Error | unknown, context?: LogContext) =>
      logError(message, error, { ...defaultContext, ...context }),
    debug: (message: string, context?: LogContext) =>
      logDebug(message, { ...defaultContext, ...context }),
  };
}

