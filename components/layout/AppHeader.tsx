"use client";

import React from "react";
import { Download, LayoutGrid, Calendar, Moon, Plus, Save, Settings, Sun, User as UserIcon, Menu, Palette, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";

export type AppHeaderProps = {
  userFirstName: string | null | undefined;
  isDark: boolean;
  toggleTheme: () => void;
  onOpenThemePicker: () => void;
  onSaveSmartFilter: () => void;
  canSaveSmartFilter: boolean;
  onNewNote: () => void;
  onToggleSidebar: () => void;
  canInstall: boolean;
  onInstall: () => void;
  viewMode: "grid" | "calendar";
  onViewModeChange: (mode: "grid" | "calendar") => void;
};

const AppHeader: React.FC<AppHeaderProps> = ({
  userFirstName,
  isDark,
  toggleTheme,
  onOpenThemePicker,
  onSaveSmartFilter,
  canSaveSmartFilter,
  onNewNote,
  onToggleSidebar,
  canInstall,
  onInstall,
  viewMode,
  onViewModeChange,
}) => {
  // Helper to get greeting based on time of day in user's timezone
  const getGreeting = () => {
    // Get current hour in user's local timezone
    // new Date() automatically uses the browser's timezone (user's timezone)
    const now = new Date();
    const hours = now.getHours(); // This already uses the user's timezone
    
    if (hours < 12) return "Good morning";
    if (hours < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden text-muted-foreground"
        >
          <Menu className="size-5" />
        </Button>
        
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span className="bg-gradient-to-r from-primary to-[var(--interactive-accent)] bg-clip-text text-transparent">
              NoteMaster
            </span>
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            {getGreeting()}, {userFirstName || "Guest"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => onViewModeChange("grid")}
            title="Grid View"
            className="h-7 w-7"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={viewMode === "calendar" ? "default" : "ghost"}
            size="icon-sm"
            onClick={() => onViewModeChange("calendar")}
            title="Calendar View"
            className="h-7 w-7"
          >
            <Calendar className="size-4" />
          </Button>
        </div>
        <div className="h-6 w-px bg-border/60 mx-2" />
        {canInstall && (
          <Button
            variant="outline"
            size="sm"
            onClick={onInstall}
            className="border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
          >
            <Download className="size-4" />
            Install
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title="Toggle Theme"
        >
          {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenThemePicker}
          title="Customize Theme"
        >
          <Palette className="size-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSaveSmartFilter}
          disabled={!canSaveSmartFilter}
          title="Save Smart Filter"
          className={canSaveSmartFilter ? "text-primary" : "text-muted-foreground/50"}
        >
          <Save className="size-5" />
        </Button>

        <Button
          onClick={onNewNote}
          variant="accent"
          className="gap-2 shadow-lg shadow-[var(--interactive-accent)]/20 hover:shadow-xl hover:shadow-[var(--interactive-accent)]/30 hover:-translate-y-0.5 transition-all duration-200"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New note</span>
        </Button>
        <SignedOut>
          <SignInButton mode="modal">
            <Button size="sm" variant="ghost">
              Sign in
            </Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton appearance={{ elements: { userButtonAvatarBox: "size-8 ring-2 ring-background" } }} />
        </SignedIn>
      </div>
    </header>
  );
};

export default AppHeader;
