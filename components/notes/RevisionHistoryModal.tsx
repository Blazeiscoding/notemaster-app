"use client";

import { History, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { stripHtml } from "@/lib/note-html";
import type { NoteRevisionPayload } from "@/types/note";

type RevisionHistoryModalProps = {
  open: boolean;
  isLoading: boolean;
  revisions: NoteRevisionPayload[];
  onClose: () => void;
  onRestore: (revisionId: string) => void;
};

export function RevisionHistoryModal({
  open,
  isLoading,
  revisions,
  onClose,
  onRestore,
}: RevisionHistoryModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Revision History"
      description="Restore an earlier version of this note."
      maxWidth="xl"
    >
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex min-h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : revisions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            <History className="mx-auto mb-3 size-6" />
            No saved revisions yet.
          </div>
        ) : (
          revisions.map((revision) => {
            const preview = stripHtml(revision.content).slice(0, 180);
            return (
              <div
                key={revision.id}
                className="rounded-xl border bg-card/60 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">
                      {new Date(revision.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm text-foreground">
                      {revision.title || "Untitled Note"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {preview || "No content preview"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRestore(revision.id)}
                    className="shrink-0"
                  >
                    <RotateCcw className="size-4" />
                    Restore
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
