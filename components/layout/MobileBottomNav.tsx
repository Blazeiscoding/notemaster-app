"use client";

import React from "react";
import { Archive, Filter, StickyNote, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";
import type { SectionKey } from "@/types/note";

type MobileBottomNavProps = {
  activeSection: SectionKey;
  sectionCounts: Record<SectionKey, number>;
  onSelectSection: (section: SectionKey) => void;
  onOpenSidebar: () => void;
};

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeSection,
  sectionCounts,
  onSelectSection,
  onOpenSidebar,
}) => {
  const navItems: Array<{
    key: SectionKey;
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
    (section: SectionKey) => {
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
        <div className="flex items-center justify-around rounded-full border bg-card/95 px-2 py-2 shadow-2xl backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
          {navItems.map(({ key, label, icon: Icon, count }) => {
            const isActive = key === activeSection;
            return (
              <button
                key={key}
                type="button"
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "text-(--accent-primary)"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => handleSelect(key)}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
                    isActive ? "bg-(--accent-primary)/10 scale-110" : "bg-transparent hover:bg-muted/50",
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
            className="flex flex-1 flex-col items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition hover:text-(--interactive-accent)"
            onClick={handleOpenSidebar}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-transparent transition-colors hover:bg-(--interactive-accent-soft)">
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
