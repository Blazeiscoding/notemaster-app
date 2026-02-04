"use client";

import React, { useCallback, useMemo } from "react";
import Image from "next/image";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { NotePayload, SectionKey } from "@/types/note";
import { useSwipe } from "./hooks/useSwipe";

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
  /** Index in the grid for priority loading optimization */
  index?: number;
};

const NoteCard: React.FC<NoteCardProps> = React.memo(
  ({
    note,
    activeSection,
    onOpen,
    onPin,
    onArchive,
    onTrash,
    onUnarchive,
    onRestoreFromBin,
    onDeleteForever,
    index = 0,
  }) => {
    // Prioritize loading for first 6 cards (2 rows of 3)
    const isPriorityImage = index < 6;
    const isNotesSection = activeSection === "notes";
    const isArchiveSection = activeSection === "archive";
    const isBinSection = activeSection === "bin";

    const handleSwipeLeft = useCallback(() => {
      if (isNotesSection) {
        onArchive(note.id);
      } else if (isArchiveSection) {
        onTrash(note.id);
      } else {
        onDeleteForever(note.id);
      }
    }, [
      isNotesSection,
      isArchiveSection,
      note.id,
      onArchive,
      onTrash,
      onDeleteForever,
    ]);

    const handleSwipeRight = useCallback(() => {
      if (isNotesSection) {
        onPin(note.id);
      } else if (isArchiveSection) {
        onUnarchive(note.id);
      } else {
        onRestoreFromBin(note.id);
      }
    }, [
      isNotesSection,
      isArchiveSection,
      note.id,
      onPin,
      onUnarchive,
      onRestoreFromBin,
    ]);

    const {
      translateX,
      isDragging,
      handlers,
      didSwipeRef,
    } = useSwipe({
      onSwipeLeft: handleSwipeLeft,
      onSwipeRight: handleSwipeRight,
    });

    const handleCardClick = useCallback(() => {
      if (!isNotesSection) return;

      if (didSwipeRef.current) {
        didSwipeRef.current = false;
        return;
      }

      onOpen(note);
    }, [isNotesSection, note, onOpen, didSwipeRef]);

    // Memoized click handlers to prevent recreation on each render
    const handlePinClick = useCallback((event: React.MouseEvent) => {
      event.stopPropagation();
      onPin(note.id);
    }, [note.id, onPin]);

    const handleArchiveClick = useCallback((event: React.MouseEvent) => {
      event.stopPropagation();
      onArchive(note.id);
    }, [note.id, onArchive]);

    const handleTrashClick = useCallback((event: React.MouseEvent) => {
      event.stopPropagation();
      onTrash(note.id);
    }, [note.id, onTrash]);

    const handleUnarchiveClick = useCallback((event: React.MouseEvent) => {
      event.stopPropagation();
      onUnarchive(note.id);
    }, [note.id, onUnarchive]);

    const handleRestoreClick = useCallback((event: React.MouseEvent) => {
      event.stopPropagation();
      onRestoreFromBin(note.id);
    }, [note.id, onRestoreFromBin]);

    const handleDeleteForeverClick = useCallback((event: React.MouseEvent) => {
      event.stopPropagation();
      onDeleteForever(note.id);
    }, [note.id, onDeleteForever]);

    const swipeActions = useMemo(() => {
      if (isNotesSection) {
        return {
          left: {
            label: "Archive",
            Icon: Archive,
            className: "bg-blue-500/15 text-blue-600",
          },
          right: {
            label: note.pinned ? "Unpin" : "Pin",
            Icon: Pin,
            className: "bg-violet-500/15 text-violet-600",
          },
        } as const;
      }

      if (isArchiveSection) {
        return {
          left: {
            label: "Move to bin",
            Icon: Trash2,
            className: "bg-amber-500/15 text-amber-600",
          },
          right: {
            label: "Restore",
            Icon: ArchiveRestore,
            className: "bg-emerald-500/15 text-emerald-600",
          },
        } as const;
      }

      return {
        left: {
          label: "Delete forever",
          Icon: Trash2,
          className: "bg-rose-500/15 text-rose-600",
        },
        right: {
          label: "Restore",
          Icon: Undo2,
          className: "bg-emerald-500/15 text-emerald-600",
        },
      } as const;
    }, [isNotesSection, isArchiveSection, note.pinned]);

    const LeftIcon = swipeActions.left.Icon;
    const RightIcon = swipeActions.right.Icon;

    const formattedDate = useMemo(() => {
      return new Date(note.updatedAt).toLocaleDateString();
    }, [note.updatedAt]);

    const strippedContent = useMemo(() => {
      return note.content?.replace(/<[^>]*>/g, "") || "No content yet";
    }, [note.content]);


    const firstImage = useMemo(() => {
      return note.attachments.find((att) => att.type.startsWith("image/"));
    }, [note.attachments]);

    return (
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold opacity-0 transition-opacity duration-150",
              swipeActions.right.className,
              translateX > 12 ? "opacity-100" : "opacity-0"
            )}
          >
            <RightIcon className="size-4" />
            <span>{swipeActions.right.label}</span>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold opacity-0 transition-opacity duration-150",
              swipeActions.left.className,
              translateX < -12 ? "opacity-100" : "opacity-0"
            )}
          >
            <LeftIcon className="size-4" />
            <span>{swipeActions.left.label}</span>
          </div>
        </div>

        <Card
          className={cn(
            "group relative border border-(--glass-border) bg-(--glass-bg) backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 overflow-hidden",
            isNotesSection &&
              "hover:-translate-y-1 hover:shadow-(--glass-shadow) hover:border-primary/30 cursor-pointer",
            isDragging && "cursor-grabbing scale-[0.98]"
          )}
          style={{
            transform: `translateX(${translateX}px)${isDragging ? " scale(0.98)" : ""}`,
            transition: isDragging
              ? "none"
              : "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms ease, border-color 200ms ease",
          }}
          onPointerDown={handlers.onPointerDown}
          onPointerMove={handlers.onPointerMove}
          onPointerUp={handlers.onPointerUp}
          onPointerCancel={handlers.onPointerCancel}
          onClick={isNotesSection ? handleCardClick : undefined}
        >

          <CardHeader className="space-y-3 pb-3">
            {note.pinned && (
              <div className="flex flex-wrap gap-2">
                <Badge className="flex items-center gap-1.5 bg-(--interactive-accent-soft) text-(--interactive-accent) border border-(--interactive-accent)/30 shadow-sm">
                  <Pin className="size-3" />
                  <span className="font-medium">Pinned</span>
                </Badge>
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base font-semibold leading-snug line-clamp-2 flex-1">
                {note.title || "Untitled note"}
              </CardTitle>
              <>
                <div className="flex items-center gap-1">
                  {isNotesSection && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handlePinClick}
                            className={cn(
                              "text-muted-foreground transition hover:text-(--interactive-accent)",
                              note.pinned && "text-(--interactive-accent)"
                            )}
                          >
                            <Pin className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{note.pinned ? "Unpin note" : "Pin note"}</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleArchiveClick}
                          >
                            <Archive className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Archive note</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleTrashClick}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Move to bin</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  {isArchiveSection && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleUnarchiveClick}
                            className="text-muted-foreground hover:text-(--interactive-accent)"
                          >
                            <ArchiveRestore className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Restore note</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleTrashClick}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Move to bin</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  {isBinSection && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleRestoreClick}
                            className="text-muted-foreground hover:text-(--interactive-accent)"
                          >
                            <Undo2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Restore note</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleDeleteForeverClick}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete forever</p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
              </>
            </div>
            <CardDescription className="flex items-center gap-2 text-xs">
              <Clock className="size-3" />
              {formattedDate}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <p className="line-clamp-3 text-sm text-muted-foreground leading-relaxed">
              {strippedContent}
            </p>
            {firstImage && (
              <div className="relative mt-3 aspect-video w-full overflow-hidden rounded-md bg-muted/30 border border-border/40">
                <Image
                  src={firstImage.data}
                  alt={firstImage.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={isPriorityImage}
                  loading={isPriorityImage ? undefined : "lazy"}
                />
              </div>
            )}
            {note.checklist.length > 0 && (
              <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs font-medium border border-border/50">
                <span className="text-foreground">
                  {note.checklist.filter((item) => item.checked).length}
                </span>
                <span className="text-muted-foreground"> of </span>
                <span className="text-foreground">{note.checklist.length}</span>
                <span className="text-muted-foreground"> tasks complete</span>
              </div>
            )}
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {note.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="border-(--interactive-accent)/30 text-(--interactive-accent) hover:bg-(--interactive-accent-soft) hover:border-(--interactive-accent)/50 transition-all duration-150 text-xs font-medium"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);

NoteCard.displayName = "NoteCard";

export default NoteCard;
