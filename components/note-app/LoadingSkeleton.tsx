"use client";

import NoteCardSkeleton from "@/components/notes/NoteCardSkeleton";

export function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-36 sm:pb-16 lg:px-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-md bg-muted" />
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <NoteCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

