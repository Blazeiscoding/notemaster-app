"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SaveFilterFormProps {
  name: string;
  description: string;
  error: string | null;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function SaveFilterForm({
  name,
  description,
  error,
  onNameChange,
  onDescriptionChange,
}: SaveFilterFormProps) {
  return (
    <div className="space-y-2">
      <Input
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="Filter name"
        aria-label="Smart filter name"
      />
      <Textarea
        value={description}
        onChange={(event) => onDescriptionChange(event.target.value)}
        placeholder="Description (optional)"
        aria-label="Smart filter description"
        className="min-h-[96px]"
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

