"use client";

import React, { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Check,
  Clock,
  History,
  Loader2,
  X,
  Download,
  FileDown,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Dynamic import: TipTap + lowlight are heavy — only load when editor is open
const RichTextEditor = dynamic(
  () => import("@/components/ui/RichTextEditor"),
  { ssr: false, loading: () => <div className="min-h-[300px] animate-pulse rounded-lg bg-muted" /> }
);
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import Checklist from "./Checklist";
import TagsInput from "./TagsInput";
import AttachmentsList from "./AttachmentsList";
import { exportNoteToMarkdown, printNote } from "@/lib/export-utils";
import type {
  Attachment,
  NotePayload,
} from "@/types/note";

type NoteEditorProps = {
  note: NotePayload;
  isSaving: boolean;
  canViewHistory: boolean;
  historyTitle: string;
  onClose: () => void;
  onOpenHistory: () => void;
  onSave: () => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onAddChecklistItem: () => void;
  onMarkAllChecklist: (checked: boolean) => void;
  onClearCompletedChecklist: () => void;
  onUpdateChecklistItem: (
    itemId: string,
    field: "text" | "checked",
    value: string | boolean,
  ) => void;
  onDeleteChecklistItem: (itemId: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onTriggerAttachmentPicker: () => void;
  onDownloadAttachment: (attachment: Attachment) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onClearAttachments: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const NoteEditor: React.FC<NoteEditorProps> = React.memo(({
  note,
  isSaving,
  canViewHistory,
  historyTitle,
  onClose,
  onOpenHistory,
  onSave,
  onTitleChange,
  onContentChange,
  onAddChecklistItem,
  onMarkAllChecklist,
  onClearCompletedChecklist,
  onUpdateChecklistItem,
  onDeleteChecklistItem,
  onAddTag,
  onRemoveTag,
  onTriggerAttachmentPicker,
  onDownloadAttachment,
  onRemoveAttachment,
  onClearAttachments,
  fileInputRef,
  onFilesSelected,
}) => {
  // Memoize formatted date — toLocaleString with options is non-trivial
  const formattedUpdatedAt = useMemo(
    () => new Date(note.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    [note.updatedAt]
  );

  const handleExportMarkdown = useCallback(() => {
    const markdown = exportNoteToMarkdown(note);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${note.title || "note"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [note]);

  const handleExportPDF = useCallback(async () => {
    // Dynamic import to avoid loading jspdf (~250KB) until needed
    const { exportNoteToPDF } = await import("@/lib/export-utils");
    await exportNoteToPDF(note);
  }, [note]);

  const handlePrint = useCallback(() => {
    printNote(note);
  }, [note]);

  // Memoize word and character counts to avoid expensive regex operations on every render
  const { wordCount, charCount } = useMemo(() => {
    const strippedContent = note.content.replace(/<[^>]*>/g, '');
    const trimmed = strippedContent.trim();
    return {
      wordCount: trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0,
      charCount: strippedContent.length,
    };
  }, [note.content]);

  return (
    <Card className="border-none bg-background/50 backdrop-blur-sm shadow-none sm:border sm:border-[var(--glass-border)] sm:bg-[var(--glass-bg)] sm:shadow-[var(--glass-shadow)] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between pb-6">
        <div className="flex-1 space-y-4">
          <Input
            value={note.title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Untitled Note"
            className="border-none px-0 text-3xl font-bold tracking-tight focus-visible:ring-0 placeholder:text-muted-foreground/40 bg-transparent h-auto py-2"
          />
          <CardDescription className="flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground/80">
              <Clock className="size-3.5" />
              Edited {formattedUpdatedAt}
            </span>
          </CardDescription>
        </div>
        <div className="flex w-full flex-col items-end gap-3 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenHistory}
              disabled={!canViewHistory}
              title={historyTitle}
              className="text-muted-foreground hover:text-foreground"
            >
              <History className="size-4" />
              <span className="sr-only sm:not-sr-only sm:ml-2">History</span>
            </Button>
            <div className="flex items-center gap-1 border-l pl-2 ml-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleExportMarkdown}
                title="Export as Markdown"
                className="text-muted-foreground hover:text-foreground"
              >
                <FileDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleExportPDF}
                title="Export as PDF"
                className="text-muted-foreground hover:text-foreground"
              >
                <Download className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handlePrint}
                title="Print"
                className="text-muted-foreground hover:text-foreground"
              >
                <Printer className="size-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="size-4" />
              Close
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              variant="accent"
              className="min-w-[100px] shadow-md shadow-[var(--interactive-accent)]/20"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {isSaving ? "Saving" : "Save"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-2">
          <RichTextEditor
            content={note.content}
            onChange={onContentChange}
            placeholder="Start typing..."
            className="min-h-[500px]"
          />
          <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground/60 font-medium">
            <span>
              {wordCount} words
            </span>
            <span>{charCount} characters</span>
          </div>
        </div>

        <div className="space-y-6 pt-6 border-t border-border/50">
          <Checklist
            items={note.checklist}
            onAddItem={onAddChecklistItem}
            onMarkAll={onMarkAllChecklist}
            onClearCompleted={onClearCompletedChecklist}
            onUpdateItem={onUpdateChecklistItem}
            onDeleteItem={onDeleteChecklistItem}
          />

          <TagsInput tags={note.tags} onAddTag={onAddTag} onRemoveTag={onRemoveTag} />

          <AttachmentsList
            attachments={note.attachments}
            onTriggerPicker={onTriggerAttachmentPicker}
            onDownload={onDownloadAttachment}
            onRemove={onRemoveAttachment}
            onClearAll={onClearAttachments}
            fileInputRef={fileInputRef}
            onFilesSelected={onFilesSelected}
          />
        </div>
      </CardContent>
    </Card>
  );
});

NoteEditor.displayName = "NoteEditor";

export default NoteEditor;
