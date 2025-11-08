"use client";
import React from "react";
import { Share } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type InstallPromptAlertProps = {
  onDismiss: () => void;
};

const InstallPromptAlert: React.FC<InstallPromptAlertProps> = ({ onDismiss }) => {
  return (
    <Alert className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <AlertTitle>Install NoteMaster on your device</AlertTitle>
        <AlertDescription>
          <p>
            On iPhone or iPad, tap the
            <span className="inline-flex items-center gap-1 font-medium">
              <Share className="size-4" /> Share
            </span>
            button in Safari, then choose <strong>Add to Home Screen</strong>.
          </p>
        </AlertDescription>
      </div>
      <Button variant="outline" size="sm" onClick={onDismiss}>
        Got it
      </Button>
    </Alert>
  );
};

export default InstallPromptAlert;
