"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
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

  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const swipeActiveRef = useRef(false);
  const didSwipeRef = useRef(false);

  const resetGesture = useCallback(() => {
    setIsDragging(false);
    setSwipeDirection(null);
    swipeActiveRef.current = false;
    pointerIdRef.current = null;
    setTranslateX(0);
  }, []);

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

  const handleSwipeAction = useCallback(
    (direction: "left" | "right") => {
      if (direction === "right") {
        if (isNotesSection) {
          onPin(note.id);
        } else if (isArchiveSection) {
          onUnarchive(note.id);
        } else {
          onRestoreFromBin(note.id);
        }
      } else {
        if (isNotesSection) {
          onArchive(note.id);
        } else if (isArchiveSection) {
          onTrash(note.id);
        } else {
          onDeleteForever(note.id);
        }
      }
    },
    [
      isArchiveSection,
      isNotesSection,
      note.id,
      onArchive,
      onDeleteForever,
      onPin,
      onRestoreFromBin,
      onTrash,
      onUnarchive,
    ],
  );

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") {
      return;
    }

    startXRef.current = event.clientX;
    startYRef.current = event.clientY;
    pointerIdRef.current = event.pointerId;
    swipeActiveRef.current = false;
    didSwipeRef.current = false;
    setTranslateX(0);
    setIsDragging(true);
    setSwipeDirection(null);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || pointerIdRef.current !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - startXRef.current;
      const deltaY = event.clientY - startYRef.current;

      if (!swipeActiveRef.current) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        if (absY > absX && absY > 10) {
          resetGesture();
          return;
        }

        if (absX > 10 && absX > absY) {
          swipeActiveRef.current = true;
        } else {
          return;
        }
      }

      event.preventDefault();
      const clamped = Math.max(Math.min(deltaX, 140), -140);
      setTranslateX(clamped);
      setSwipeDirection(clamped > 0 ? "right" : clamped < 0 ? "left" : null);
    },
    [isDragging, resetGesture],
  );

  const handlePointerEnd = useCallback(() => {
    if (!isDragging) return;

    const finalDirection = swipeDirection;
    const finalTranslate = translateX;
    const wasActive = swipeActiveRef.current;

    resetGesture();

    if (wasActive && finalDirection && Math.abs(finalTranslate) > 80) {
      didSwipeRef.current = true;
      handleSwipeAction(finalDirection);
    } else {
      didSwipeRef.current = false;
    }
  }, [handleSwipeAction, isDragging, resetGesture, swipeDirection, translateX]);

  const handleCardClick = useCallback(() => {
    if (!isNotesSection) return;

    if (didSwipeRef.current) {
      didSwipeRef.current = false;
      return;
    }

    onOpen(note);
  }, [isNotesSection, note, onOpen]);

  const LeftIcon = swipeActions.left.Icon;
  const RightIcon = swipeActions.right.Icon;

  const dueDateMetadata = useMemo(() => {
    if (!note.dueAt) return null;

    const dueDate = new Date(note.dueAt);
    if (Number.isNaN(dueDate.getTime())) return null;

    const now = new Date();
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    const shortDate = dueDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });

    if (diffMs < 0) {
      return {
        label: `Overdue • ${shortDate}`,
        className: "bg-rose-500/15 text-rose-600",
      } as const;
    }

    if (diffDays <= 2) {
      return {
        label: `Due soon • ${shortDate}`,
        className: "bg-amber-500/15 text-amber-700",
      } as const;
    }

    return {
      label: `Due ${shortDate}`,
      className: "bg-sky-500/10 text-sky-600",
    } as const;
  }, [note.dueAt]);

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4">
        <div
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold opacity-0 transition-opacity duration-150",
            swipeActions.right.className,
            translateX > 12 ? "opacity-100" : "opacity-0",
          )}
        >
          <RightIcon className="size-4" />
          <span>{swipeActions.right.label}</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold opacity-0 transition-opacity duration-150",
            swipeActions.left.className,
            translateX < -12 ? "opacity-100" : "opacity-0",
          )}
        >
          <LeftIcon className="size-4" />
          <span>{swipeActions.left.label}</span>
        </div>
      </div>

      <Card
        className={cn(
          "group relative border bg-card/80 transition animate-in fade-in slide-in-from-bottom-2",
          isNotesSection &&
            "hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg cursor-pointer",
          isDragging && "cursor-grabbing",
        )}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging
            ? "none"
            : "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={isNotesSection ? handleCardClick : undefined}
      >
        <CardHeader className="space-y-2">
          {(note.pinned || dueDateMetadata) && (
            <div className="flex flex-wrap gap-2">
              {note.pinned && (
                <Badge className="flex items-center gap-1 bg-violet-500/15 text-violet-600">
                  <Pin className="size-3" />
                  <span>Pinned</span>
                </Badge>
              )}
              {dueDateMetadata && (
                <Badge className={cn("flex items-center gap-1", dueDateMetadata.className)}>
                  <CalendarDays className="size-3" />
                  <span>{dueDateMetadata.label}</span>
                </Badge>
              )}
            </div>
          )}
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
    </div>
  );
};

export default NoteCard;
