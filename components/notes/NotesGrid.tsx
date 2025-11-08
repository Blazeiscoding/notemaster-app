"use client";

import React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import NoteCard from "./NoteCard";
import type { NotePayload } from "@/types/note";

type SectionKey = "notes" | "archive" | "bin";

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

const emptyStateCopy: Record<SectionKey, { title: string; description: string }> = {
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
  if (notes.length === 0) {
    const copy = emptyStateCopy[activeSection];
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="col-span-full overflow-hidden rounded-2xl border-dashed py-12 text-center animate-in fade-in">
          <CardContent className="flex flex-col items-center gap-6">
            <div className="relative h-40 w-60">
              <Image
                src="/note-empty.svg"
                alt="Empty notebook illustration"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{copy.title}</h2>
              <p className="text-sm text-muted-foreground">{copy.description}</p>
            </div>
            {activeSection === "notes" && (
              <Button onClick={onCreateNote} className="gap-2">
                <Plus className="size-4" />
                Create your first note
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {notes.map((note) => (
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
        />
      ))}
    </div>
  );
};

export default NotesGrid;
