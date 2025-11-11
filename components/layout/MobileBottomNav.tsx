"use client";

import React from "react";
import { Archive, Filter, StickyNote, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";

type NoteAppSection = "notes" | "archive" | "bin";

type MobileBottomNavProps = {
  activeSection: NoteAppSection;
  sectionCounts: Record<NoteAppSection, number>;
  onSelectSection: (section: NoteAppSection) => void;
  onOpenSidebar: () => void;
};

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeSection,
  sectionCounts,
  onSelectSection,
  onOpenSidebar,
}) => {
  const navItems: Array<{
    key: NoteAppSection;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    count: number;
  }> = React.useMemo(
    () => [
      { key: "notes", label: "Notes", icon: StickyNote, count: sectionCounts.notes },
      { key: "archive", label: "Archive", icon: Archive, count: sectionCounts.archive },
      { key: "bin", label: "Bin", icon: Trash2, count: sectionCounts.bin },
    ],
    [sectionCounts],
  );

  const handleSelect = React.useCallback(
    (section: NoteAppSection) => {
      hapticLight();
      onSelectSection(section);
    },
    [onSelectSection],
  );

  const handleOpenSidebar = React.useCallback(() => {
    hapticLight();
    onOpenSidebar();
  }, [onOpenSidebar]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 16px) + 0.5rem)" }}
    >
      <div className="pointer-events-auto mx-auto w-full max-w-3xl px-4">
        <div className="flex items-center justify-around rounded-full border bg-card/95 px-2 py-2 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/75">
          {navItems.map(({ key, label, icon: Icon, count }) => {
            const isActive = key === activeSection;
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-medium transition",
                  isActive
                    ? "text-(--accent-primary)"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => handleSelect(key)}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition",
                    isActive ? "bg-(--accent-primary)/10" : "bg-transparent",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="leading-none">{label}</span>
                <span className="text-[10px] font-semibold text-muted-foreground/80">
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            className="flex flex-1 flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            onClick={handleOpenSidebar}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-transparent">
              <Filter className="size-5" />
            </span>
            <span className="leading-none">Filters</span>
            <span className="text-[10px] font-semibold text-muted-foreground/80">&nbsp;</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileBottomNav;
