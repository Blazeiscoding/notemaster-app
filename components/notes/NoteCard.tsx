"use client";

import React from "react";
import {
  Archive,
  ArchiveRestore,
  Clock,
  Pin,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { NotePayload } from "@/types/note";

type SectionKey = "notes" | "archive" | "bin";

type NoteCardProps = {
  note: NotePayload;
  activeSection: SectionKey;
  onOpen: (note: NotePayload) => void;
  onPin: (id: string) => void;
  onArchive: (id: string) => void;
  onTrash: (id: string) => void;
  onUnarchive: (id: string) => void;
  onRestoreFromBin: (id: string) => void;
  onDeleteForever: (id: string) => void;
};

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  activeSection,
  onOpen,
  onPin,
  onArchive,
  onTrash,
  onUnarchive,
  onRestoreFromBin,
  onDeleteForever,
}) => {
  const isNotesSection = activeSection === "notes";
  const isArchiveSection = activeSection === "archive";
  const isBinSection = activeSection === "bin";

  return (
    <Card
      className={cn(
        "group relative border bg-card/80 transition animate-in fade-in slide-in-from-bottom-2",
        isNotesSection &&
          "hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg cursor-pointer",
      )}
      onClick={isNotesSection ? () => onOpen(note) : undefined}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold">
            {note.title || "Untitled note"}
          </CardTitle>
          <div className="flex items-center gap-1">
            {isNotesSection && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPin(note.id);
                  }}
                  className={cn(
                    "text-muted-foreground transition hover:text-primary",
                    note.pinned && "text-primary",
                  )}
                >
                  <Pin className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onArchive(note.id);
                  }}
                >
                  <Archive className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onTrash(note.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
            {isArchiveSection && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onUnarchive(note.id);
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  <ArchiveRestore className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onTrash(note.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
            {isBinSection && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRestoreFromBin(note.id);
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Undo2 className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteForever(note.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <CardDescription className="flex items-center gap-2 text-xs">
          <Clock className="size-3" />
          {new Date(note.updatedAt).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {note.content || "No content yet"}
        </p>
        {note.checklist.length > 0 && (
          <div className="rounded-md bg-muted px-3 py-2 text-xs">
            {note.checklist.filter((item) => item.checked).length} of
            {note.checklist.length} tasks complete
          </div>
        )}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NoteCard;
