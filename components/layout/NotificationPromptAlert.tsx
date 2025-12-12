"use client";
import React from "react";
import { Bell } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type NotificationPromptAlertProps = {
  onEnable: () => void;
  onDismiss: () => void;
};

const NotificationPromptAlert: React.FC<NotificationPromptAlertProps> = ({
  onEnable,
  onDismiss,
}) => {
  return (
    <Alert className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <AlertTitle>Enable reminder notifications</AlertTitle>
        <AlertDescription>
          <p>
            Get notified when your reminders are due. Click{" "}
            <span className="inline-flex items-center gap-1 font-medium">
              <Bell className="size-4" /> Enable
            </span>{" "}
            to allow notifications.
          </p>
        </AlertDescription>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onDismiss}>
          Not now
        </Button>
        <Button variant="default" size="sm" onClick={onEnable}>
          <Bell className="mr-2 size-4" />
          Enable
        </Button>
      </div>
    </Alert>
  );
};

export default NotificationPromptAlert;

