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

const NotebookList: React.FC<NotebookListProps> = ({
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Folder className="size-4" />
        Notebooks
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={newNotebookName}
            onChange={(event) => onNotebookNameChange(event.target.value)}
            placeholder="New notebook"
            className="flex-1"
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
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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

      <div className="space-y-2">
        <Button
          variant={activeNotebookId === "all" ? "default" : "outline"}
          size="sm"
          className="w-full justify-between"
          onClick={() => onSelectNotebookFilter("all")}
        >
          All notebooks
          <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {totalNotesCount}
          </span>
        </Button>
        <div
          className={cn(
            "max-h-64 space-y-1 overflow-y-auto rounded-lg border border-dashed p-3 transition-colors",
            isRootDragOver && "border-(--interactive-accent)"
          )}
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
        >
          {notebookTree.length === 0 ? (
            <p className="text-sm text-muted-foreground">
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
    </div>
  );
};

export default NotebookList;
