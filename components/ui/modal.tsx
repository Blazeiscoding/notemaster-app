"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
  as?: "div" | "form";
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
  footer,
  as: Component = "div",
  onSubmit,
}: ModalProps) {
  if (!open) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const content = (
    <div
      className={cn(
        "w-full space-y-4 rounded-2xl border bg-card/95 backdrop-blur-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200",
        maxWidthClasses[maxWidth]
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div>{children}</div>
      {footer && <div className="flex justify-end gap-2">{footer}</div>}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
    >
      {Component === "form" && onSubmit ? (
        <form onSubmit={onSubmit} className="w-full">
          {content}
        </form>
      ) : (
        <div className="w-full">{content}</div>
      )}
    </div>
  );
}

