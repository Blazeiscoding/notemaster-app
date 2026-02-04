"use client";

import React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
import NoteCard from "./NoteCard";
import { useVirtualizedGrid } from "./useVirtualizedGrid";
import type { NotePayload, SectionKey } from "@/types/note";

type NotesGridProps = {
  notes: NotePayload[];
  activeSection: SectionKey;
  onCreateNote: () => void;
  onOpenNote: (note: NotePayload) => void;
  onPin: (id: string) => void;
  onArchive: (id: string) => void;
  onTrash: (id: string) => void;
  onUnarchive: (id: string) => void;
  onRestoreFromBin: (id: string) => void;
  onDeleteForever: (id: string) => void;
};

const emptyStateCopy: Record<
  SectionKey,
  { title: string; description: string }
> = {
  notes: {
    title: "Nothing here yet",
    description: "Start capturing your ideas by creating a new note.",
  },
  archive: {
    title: "No archived notes",
    description: "Archive notes to keep them here without deleting them.",
  },
  bin: {
    title: "Bin is empty",
    description: "Deleted notes will appear here for recovery or removal.",
  },
};

// Note: Not using React.memo here because TanStack Virtual's useVirtualizer
// is incompatible with React Compiler memoization. Virtual scrolling already
// provides performance benefits for large lists.
const NotesGrid: React.FC<NotesGridProps> = ({
  notes,
  activeSection,
  onCreateNote,
  onOpenNote,
  onPin,
  onArchive,
  onTrash,
  onUnarchive,
  onRestoreFromBin,
  onDeleteForever,
}) => {
  const { parentRef, columnsCount, shouldVirtualize, rows, rowVirtualizer } =
    useVirtualizedGrid(notes);

  if (notes.length === 0) {
    const copy = emptyStateCopy[activeSection];
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="col-span-full overflow-hidden rounded-2xl border-dashed border-2 border-muted bg-muted/10 py-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardContent className="flex flex-col items-center gap-6">
            <div className="relative h-40 w-60 opacity-60">
              <Image
                src="/note-empty.svg"
                alt="Empty notebook illustration"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-xl font-semibold text-foreground">{copy.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {copy.description}
              </p>
            </div>
            {activeSection === "notes" && (
              <Button 
                onClick={onCreateNote} 
                variant="accent"
                size="lg"
                className="gap-2 shadow-lg shadow-(--interactive-accent)/20 mt-2"
              >
                <Plus className="size-5" />
                Create your first note
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use virtual scrolling for large lists
  if (shouldVirtualize) {
    const virtualItems = rowVirtualizer.getVirtualItems();
    const totalSize = rowVirtualizer.getTotalSize();

    return (
      <TooltipProvider delayDuration={300}>
        <div
          ref={parentRef}
          className="h-[600px] overflow-auto"
          style={{ contain: "strict" }}
        >
          <div
            style={{
              height: `${totalSize}px`,
              width: "100%",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
              }}
            >
              {virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index];
                if (!row) return null;

                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mb-4"
                  >
                    {row.map((note, colIndex) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        activeSection={activeSection}
                        onOpen={onOpenNote}
                        onPin={onPin}
                        onArchive={onArchive}
                        onTrash={onTrash}
                        onUnarchive={onUnarchive}
                        onRestoreFromBin={onRestoreFromBin}
                        onDeleteForever={onDeleteForever}
                        index={virtualRow.index * columnsCount + colIndex}
                      />
                    ))}
                    {/* Fill remaining columns in the last row */}
                    {row.length < columnsCount &&
                      Array.from({ length: columnsCount - row.length }).map(
                        (_, i) => <div key={`spacer-${i}`} />
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </TooltipProvider>
    );
  }

  // Regular grid for smaller lists
  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {notes.map((note, index) => (
          <NoteCard
            key={note.id}
            note={note}
            activeSection={activeSection}
            onOpen={onOpenNote}
            onPin={onPin}
            onArchive={onArchive}
            onTrash={onTrash}
            onUnarchive={onUnarchive}
            onRestoreFromBin={onRestoreFromBin}
            onDeleteForever={onDeleteForever}
            index={index}
          />
        ))}
      </div>
    </TooltipProvider>
  );
};

NotesGrid.displayName = "NotesGrid";

export default NotesGrid;
