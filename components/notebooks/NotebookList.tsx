"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FolderPlus } from "lucide-react";
import NotebookNode from "@/components/notebooks/NotebookNode";
import type { NotebookPayload, NotebookTreeNode } from "@/types/note";
import { cn } from "@/lib/utils";

type NotebookListProps = {
  notebooks: NotebookPayload[];
  notebookTree: NotebookTreeNode[];
  activeNotebookId: string;
  newNotebookName: string;
  newNotebookParent: string | null;
  isCreatingNotebook: boolean;
  totalNotesCount: number;
  onNotebookNameChange: (value: string) => void;
  onNotebookParentChange: (value: string | null) => void;
  onCreateNotebook: () => void;
  onQuickAddNotebook: (parentId: string | null, name: string) => Promise<boolean> | boolean;
  onRenameNotebook: (id: string, name: string) => Promise<boolean> | boolean;
  onMoveNotebook: (
    id: string,
    targetParentId: string | null,
    targetIndex: number
  ) => Promise<boolean> | boolean;
  onSelectNotebookFilter: (id: string) => void;
  onDeleteNotebook: (id: string) => void;
};

const NOTEBOOK_DRAG_DATA = "application/x-notebook-id";

const NotebookList: React.FC<NotebookListProps> = React.memo(({
  notebooks,
  notebookTree,
  activeNotebookId,
  newNotebookName,
  newNotebookParent,
  isCreatingNotebook,
  totalNotesCount,
  onNotebookNameChange,
  onNotebookParentChange,
  onCreateNotebook,
  onQuickAddNotebook,
  onRenameNotebook,
  onMoveNotebook,
  onSelectNotebookFilter,
  onDeleteNotebook,
}) => {
  const [isRootDragOver, setIsRootDragOver] = React.useState(false);

  const handleRootDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsRootDragOver(true);
    event.dataTransfer.dropEffect = "move";
  };

  const handleRootDragLeave = () => {
    setIsRootDragOver(false);
  };

  const handleRootDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsRootDragOver(false);
    const sourceId = event.dataTransfer.getData(NOTEBOOK_DRAG_DATA);
    if (!sourceId) return;
    onMoveNotebook(sourceId, null, notebookTree.length);
  };

  return (
    <section className="rounded-3xl border border-white/15 bg-white/5 p-5 text-center shadow-[0_15px_45px_-30px_rgba(15,23,42,0.65)] backdrop-blur">
      <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-muted-foreground">
        <span className="text-[0.65rem] uppercase tracking-[0.45em] text-muted-foreground/70">
          Library
        </span>
        <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Folder className="size-4" />
          Notebook stack
        </div>
        <p className="text-xs text-muted-foreground/80">
          {totalNotesCount} notes archived
        </p>
      </div>

      <div className="mx-auto mt-4 flex max-w-sm flex-col gap-3">
        <div className="flex items-center gap-2">
          <Input
            value={newNotebookName}
            onChange={(event) => onNotebookNameChange(event.target.value)}
            placeholder="New notebook"
            className="text-center"
            disabled={isCreatingNotebook}
          />
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onCreateNotebook}
            disabled={isCreatingNotebook || !newNotebookName.trim()}
          >
            <FolderPlus className="size-4" />
          </Button>
        </div>
        {notebooks.length > 0 && (
          <select
            value={newNotebookParent ?? ""}
            onChange={(event) =>
              onNotebookParentChange(event.target.value || null)
            }
            className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-center text-muted-foreground focus:ring-1 focus:ring-white/30"
          >
            <option value="">Parent notebook</option>
            {notebooks.map((notebook) => (
              <option key={notebook.id} value={notebook.id}>
                {notebook.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <Button
          variant={activeNotebookId === "all" ? "default" : "outline"}
          size="sm"
          className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl"
          onClick={() => onSelectNotebookFilter("all")}
        >
          All notebooks
          <span className="rounded-full bg-background/70 px-2 py-0.5 text-xs text-muted-foreground">
            {totalNotesCount}
          </span>
        </Button>
        <div
          className={cn(
            "mx-auto max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-dashed border-white/20 bg-white/5 p-4 text-left shadow-inner shadow-black/10 transition-colors",
            isRootDragOver && "border-(--interactive-accent)"
          )}
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
        >
          {notebookTree.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              Drag notebooks here or create a new one to get started.
            </p>
          ) : (
            notebookTree.map((node, index) => (
              <NotebookNode
                key={node.id}
                node={node}
                index={index}
                dragDataType={NOTEBOOK_DRAG_DATA}
                activeId={activeNotebookId}
                onSelect={onSelectNotebookFilter}
                onDelete={onDeleteNotebook}
                onAddChild={onQuickAddNotebook}
                onRename={onRenameNotebook}
                onMove={onMoveNotebook}
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
});

NotebookList.displayName = "NotebookList";

export default NotebookList;
