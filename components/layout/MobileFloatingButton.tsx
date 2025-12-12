"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface MobileFloatingButtonProps {
  onCreateNote: () => void;
}

export function MobileFloatingButton({
  onCreateNote,
}: MobileFloatingButtonProps) {
  return (
    <div className="pointer-events-none sm:hidden">
      <Button
        aria-label="Create a new note"
        variant="accent"
        size="lg"
        className="pointer-events-auto fixed right-4 z-50 h-14 rounded-full px-6 font-semibold shadow-xl shadow-(--interactive-accent)/25 transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-(--accent-primary)"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 16px) + 7.5rem)" }}
        onClick={onCreateNote}
      >
        <Plus className="mr-2 h-5 w-5" />
        New note
      </Button>
    </div>
  );
}

