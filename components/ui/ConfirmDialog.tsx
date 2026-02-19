"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
};

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      maxWidth="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            variant={variant === "danger" ? "destructive" : "default"}
            onClick={onConfirm}
            className={
              variant === "danger"
                ? "bg-destructive text-white hover:bg-destructive/90"
                : ""
            }
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {variant === "danger" && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>
      )}
    </Modal>
  );
}
