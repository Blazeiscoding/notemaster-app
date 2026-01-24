"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Link as LinkIcon, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function SharePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isCreating, setIsCreating] = useState(false);
  const [autoCreate, setAutoCreate] = useState(false);
  
  const title = searchParams.get("title") || "";
  const text = searchParams.get("text") || "";
  const url = searchParams.get("url") || "";
  const hasFiles = searchParams.get("hasFiles") === "true";
  const fileCount = parseInt(searchParams.get("fileCount") || "0", 10);
  
  // Compose the note content
  const composeContent = () => {
    const parts: string[] = [];
    
    if (text) {
      parts.push(text);
    }
    
    if (url) {
      parts.push(`\n\n🔗 ${url}`);
    }
    
    if (hasFiles && fileCount > 0) {
      parts.push(`\n\n📎 ${fileCount} file(s) shared`);
    }
    
    return parts.join("");
  };
  
  // Create a new note with the shared content
  const handleCreateNote = async () => {
    setIsCreating(true);
    
    try {
      // Store the shared content in sessionStorage for the main app to pick up
      const sharedNote = {
        title: title || "Shared Note",
        content: composeContent(),
        createdAt: new Date().toISOString(),
      };
      
      sessionStorage.setItem("notemaster-shared-note", JSON.stringify(sharedNote));
      
      // Redirect to the main app - it will detect and create the note
      router.push("/?action=create-from-share");
    } catch (error) {
      console.error("Failed to create note:", error);
      setIsCreating(false);
    }
  };
  
  // Auto-create if there's content and user came directly from share
  useEffect(() => {
    if ((title || text || url) && !autoCreate) {
      setAutoCreate(true);
      // Small delay to show the UI first
      const timer = setTimeout(() => {
        handleCreateNote();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [title, text, url, autoCreate]);
  
  const hasContent = title || text || url || hasFiles;
  
  if (!hasContent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <div className="size-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <FileText className="size-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Nothing to Share</h1>
          <p className="text-muted-foreground max-w-md">
            Share content from another app to create a new note in NoteMaster.
          </p>
          <Button onClick={() => router.push("/")} variant="accent">
            Go to NoteMaster
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="size-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <FileText className="size-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Create Note from Shared Content</h1>
          <p className="text-muted-foreground text-sm">
            Creating a new note with the content you shared...
          </p>
        </div>
        
        {/* Preview Card */}
        <div className="rounded-xl border bg-card p-4 space-y-3 shadow-lg">
          {title && (
            <div className="font-semibold text-lg">{title}</div>
          )}
          
          {text && (
            <p className="text-muted-foreground text-sm line-clamp-4">
              {text}
            </p>
          )}
          
          {url && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <LinkIcon className="size-4 shrink-0" />
              <span className="truncate">{url}</span>
            </div>
          )}
          
          {hasFiles && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="size-4" />
              <span>{fileCount} file(s) attached</span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleCreateNote}
            disabled={isCreating}
            variant="accent"
            className="w-full gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating Note...
              </>
            ) : (
              <>
                Create Note
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
          
          <Button
            onClick={() => router.push("/")}
            variant="ghost"
            className="w-full"
            disabled={isCreating}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <SharePageContent />
    </Suspense>
  );
}
