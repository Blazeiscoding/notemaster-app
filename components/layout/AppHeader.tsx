"use client";

import React from "react";
import { Download, Menu, Moon, Plus, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
} from "@clerk/nextjs";

type AppHeaderProps = {
  userFirstName?: string | null;
  onToggleSidebar: () => void;
  canInstall: boolean;
  onInstall: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onCreateNote: () => void;
};

const AppHeader: React.FC<AppHeaderProps> = ({
  userFirstName,
  onToggleSidebar,
  canInstall,
  onInstall,
  darkMode,
  onToggleDarkMode,
  onCreateNote,
}) => {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          className="sm:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="size-4" />
        </Button>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Welcome back{userFirstName ? `, ${userFirstName}` : ""}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">NoteMaster</h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
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
          size="sm"
          onClick={onCreateNote}
          variant="accent"
          className="shadow-md shadow-(--interactive-accent)/20"
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
