"use client";
import React from "react";
import { Download, Trash2, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/types/note";

type AttachmentsListProps = {
  attachments: Attachment[];
  onTriggerPicker: () => void;
  onDownload: (attachment: Attachment) => void;
  onRemove: (attachmentId: string) => void;
  onClearAll: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const AttachmentsList: React.FC<AttachmentsListProps> = ({
  attachments,
  onTriggerPicker,
  onDownload,
  onRemove,
  onClearAll,
  fileInputRef,
  onFilesSelected,
}) => {
  const formatBytes = (size: number) => {
    if (!size) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const exponent = Math.min(
      Math.floor(Math.log(size) / Math.log(1024)),
      units.length - 1,
    );
    const value = size / Math.pow(1024, exponent);
    const precision = value >= 10 || exponent === 0 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[exponent]}`;
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Attachments
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onTriggerPicker}>
            <Paperclip className="size-4" />
            Add files
          </Button>
          {attachments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={onClearAll}
            >
              <X className="size-4" />
              Clear all
            </Button>
          )}
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFilesSelected}
      />

      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/30 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{attachment.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(attachment.size)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => onDownload(attachment)}
              >
                <Download className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(attachment.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {attachments.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No attachments yet. Add images, documents, or audio clips to enrich your note.
          </p>
        )}
      </div>
    </section>
  );
};

export default AttachmentsList;
