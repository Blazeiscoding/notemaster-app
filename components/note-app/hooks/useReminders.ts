import { useEffect, useRef, useCallback, useState } from "react";
import type { NotePayload } from "@/types/note";

const CHECK_INTERVAL = 60 * 1000; // Check every minute
const NOTIFICATION_THRESHOLD = 5 * 60 * 1000; // Show notification 5 minutes before due time

type NotificationState = {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  checkReminders: (notes: NotePayload[]) => void;
};

// Store of notification IDs that have already been shown to avoid duplicates
const shownNotifications = new Set<string>();

export function useReminders(): NotificationState {
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    return Notification.permission;
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notesRef = useRef<NotePayload[]>([]);

  // Initialize permission state
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("denied");
      return "denied";
    }

    if (Notification.permission === "granted") {
      setPermission("granted");
      return "granted";
    }

    if (Notification.permission === "denied") {
      setPermission("denied");
      return "denied";
    }

    try {
      const newPermission = await Notification.requestPermission();
      setPermission(newPermission);
      return newPermission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setPermission("denied");
      return "denied";
    }
  }, []);

  const checkReminders = useCallback((notes: NotePayload[]) => {
    notesRef.current = notes;

    // Check current permission status
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }
    
    const currentPermission = Notification.permission;
    if (currentPermission !== "granted") {
      return;
    }

    const now = new Date().getTime();

    notes.forEach((note) => {
      if (!note.dueAt || note.archived || note.trashed) {
        return;
      }

      const dueTime = new Date(note.dueAt).getTime();
      const timeUntilDue = dueTime - now;
      const notificationId = `reminder-${note.id}`;

      // Skip if we've already shown this notification
      if (shownNotifications.has(notificationId)) {
        // Remove from set if the reminder is past (more than 1 hour ago)
        if (timeUntilDue < -60 * 60 * 1000) {
          shownNotifications.delete(notificationId);
        }
        return;
      }

      // Show notification if:
      // 1. The reminder is due (within the threshold) and hasn't passed yet
      // 2. Or the reminder just passed (within last minute)
      if (
        timeUntilDue >= -60 * 1000 && // Not more than 1 minute past
        timeUntilDue <= NOTIFICATION_THRESHOLD // Within threshold before or just past
      ) {
        try {
          const title = note.title || "Untitled Note";
          const dueDate = new Date(note.dueAt);
          const isOverdue = timeUntilDue < 0;
          const body = isOverdue
            ? `This reminder is overdue!`
            : `Reminder: ${dueDate.toLocaleString(undefined, {
                dateStyle: "short",
                timeStyle: "short",
              })}`;

          const notification = new Notification(title, {
            body,
            icon: "/favicon-32x32.png",
            badge: "/favicon-16x16.png",
            tag: notificationId, // Prevents duplicate notifications
            requireInteraction: isOverdue, // Keep overdue notifications visible
          });

          // Mark as shown
          shownNotifications.add(notificationId);

          // Clean up old notifications from the set periodically
          setTimeout(() => {
            if (timeUntilDue < -60 * 60 * 1000) {
              shownNotifications.delete(notificationId);
            }
          }, 60 * 60 * 1000); // Clean up after 1 hour

          // Handle notification click
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (error) {
          console.error("Error showing notification:", error);
        }
      }
    });
  }, []);

  // Set up periodic checking
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    // Check immediately
    if (notesRef.current.length > 0) {
      checkReminders(notesRef.current);
    }

    // Set up interval
    intervalRef.current = setInterval(() => {
      if (notesRef.current.length > 0) {
        checkReminders(notesRef.current);
      }
    }, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkReminders]);

  return {
    permission,
    requestPermission,
    checkReminders,
  };
}

