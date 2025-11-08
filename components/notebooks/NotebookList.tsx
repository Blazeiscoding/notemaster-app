"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder, FolderPlus, X } from "lucide-react";
import NotebookNode from "@/components/notebooks/NotebookNode";
import type { NotebookPayload, NotebookTreeNode } from "@/types/note";

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
  onSelectNotebookFilter: (id: string) => void;
  onDeleteNotebook: (id: string) => void;
  onCloseSidebar?: () => void;
};

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
  onSelectNotebookFilter,
  onDeleteNotebook,
  onCloseSidebar,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Folder className="size-4" />
          Notebooks
        </div>
        {onCloseSidebar && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCloseSidebar}
            className="lg:hidden text-muted-foreground"
          >
            <X className="size-4" />
          </Button>
        )}
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
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-dashed p-3">
          {notebookTree.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Create notebooks to organize notes by project or theme.
            </p>
          )}
          {notebookTree.map((node) => (
            <NotebookNode
              key={node.id}
              node={node}
              activeId={activeNotebookId}
              onSelect={onSelectNotebookFilter}
              onDelete={onDeleteNotebook}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotebookList;
