"use client";

import React from "react";
import {
  CalendarClock,
  Check,
  Clock,
  Folder,
  History,
  Loader2,
  X,
  Download,
  FileDown,
  Printer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import Checklist from "./Checklist";
import TagsInput from "./TagsInput";
import AttachmentsList from "./AttachmentsList";
import { exportNoteToMarkdown, exportNoteToPDF, printNote } from "@/lib/export-utils";
import type {
  Attachment,
  NotePayload,
  NotebookPayload,
} from "@/types/note";

type NotebookOption = {
  id: string;
  label: string;
};

type NoteEditorProps = {
  note: NotePayload;
  isSaving: boolean;
  canViewHistory: boolean;
  historyTitle: string;
  notebooksById: Map<string, NotebookPayload>;
  notebookOptions: NotebookOption[];
  dueDateValue: string;
  onClose: () => void;
  onOpenHistory: () => void;
  onSave: () => void;
  onNotebookChange: (notebookId: string | null) => void;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onClearDueDate: () => void;
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

const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  isSaving,
  canViewHistory,
  historyTitle,
  notebooksById,
  notebookOptions,
  dueDateValue,
  onClose,
  onOpenHistory,
  onSave,
  onNotebookChange,
  onTitleChange,
  onContentChange,
  onDueDateChange,
  onClearDueDate,
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
  const notebookName = note.notebookId
    ? notebooksById.get(note.notebookId)?.name ?? "Notebook"
    : "Inbox";

  const handleExportMarkdown = () => {
    const markdown = exportNoteToMarkdown(note);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${note.title || "note"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    await exportNoteToPDF(note);
  };

  const handlePrint = () => {
    printNote(note);
  };

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
              Edited {new Date(note.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground/80">
              <Folder className="size-3.5" />
              {notebookName}
            </span>
            {note.dueAt && (
              <span className="inline-flex items-center gap-1.5 text-primary font-medium">
                <CalendarClock className="size-3.5" />
                Due {new Date(note.dueAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            )}
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
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Notebook
            </label>
            <Select
              value={note.notebookId ?? ""}
              onChange={(event) =>
                onNotebookChange(event.target.value ? event.target.value : null)
              }
              className="w-full bg-background/50"
            >
              <option value="">Inbox</option>
              {notebookOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Reminder
            </label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={dueDateValue}
                onChange={(event) => onDueDateChange(event.target.value)}
                className="flex-1 rounded-md border bg-background/50 px-3 py-2 text-sm shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {note.dueAt && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={onClearDueDate}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <RichTextEditor
            content={note.content}
            onChange={onContentChange}
            placeholder="Start typing..."
            className="min-h-[500px]"
          />
          <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground/60 font-medium">
            <span>
              {note.content.trim()
                ? `${note.content.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length} words`
                : "0 words"}
            </span>
            <span>{note.content.replace(/<[^>]*>/g, '').length} characters</span>
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
};

export default NoteEditor;
