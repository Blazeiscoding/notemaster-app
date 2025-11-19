"use client";

import React from "react";
import { Download, Filter, Menu, Moon, Palette, Plus, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";

export type AppHeaderProps = {
  userFirstName?: string | null;
  onToggleSidebar: () => void;
  canInstall: boolean;
  onInstall: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  accentName?: string;
  onOpenAccentModal: () => void;
  canSaveSmartFilter: boolean;
  onSaveSmartFilter: () => void;
  onCreateNote: () => void;
};

const AppHeader: React.FC<AppHeaderProps> = ({
  userFirstName,
  onToggleSidebar,
  canInstall,
  onInstall,
  darkMode,
  onToggleDarkMode,
  accentName,
  onOpenAccentModal,
  canSaveSmartFilter,
  onSaveSmartFilter,
  onCreateNote,
}) => {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          className="sm:hidden hover:bg-accent transition-colors"
          onClick={onToggleSidebar}
        >
          <Menu className="size-4" />
        </Button>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Welcome back{userFirstName ? `, ${userFirstName}` : ""}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            NoteMaster
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {canInstall && (
          <Button
            variant="outline"
            size="sm"
            onClick={onInstall}
            className="border-(--accent-primary) text-(--accent-primary) hover:bg-(--accent-primary)/10"
          >
            <Download className="size-4" />
            Install
          </Button>
        )}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={onToggleDarkMode}
          className="hover:border-(--accent-primary) hover:text-(--accent-primary)"
        >
          {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAccentModal}
          className="gap-2"
        >
          <Palette className="size-4" />
          <span className="hidden sm:inline">Theme</span>
          {accentName && <span className="text-xs text-muted-foreground">{accentName}</span>}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveSmartFilter}
          disabled={!canSaveSmartFilter}
          className="gap-2 disabled:opacity-50"
        >
          <Filter className="size-4" />
          <span className="hidden sm:inline">Save filter</span>
        </Button>
        <Button
          size="sm"
          onClick={onCreateNote}
          variant="accent"
          className="shadow-md shadow-(--interactive-accent)/20 hover:shadow-lg hover:shadow-(--interactive-accent)/30 transition-all duration-200"
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
          <UserButton appearance={{ elements: { userButtonAvatarBox: "size-8" } }} />
        </SignedIn>
      </div>
    </header>
  );
};

export default AppHeader;
