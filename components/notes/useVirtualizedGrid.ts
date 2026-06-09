// @tanstack/react-virtual uses patterns that trigger false positives in react-hooks exhaustive-deps
/* eslint-disable react-hooks/incompatible-library */
import { useRef, useMemo, useState, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { NoteSummaryPayload } from "@/types/note";

const VIRTUAL_SCROLL_THRESHOLD = 50;

// Memoized breakpoint values to avoid recalculation
const BREAKPOINT_XL = 1280;
const BREAKPOINT_SM = 640;

const getColumnsCount = (): number => {
  if (typeof window === "undefined") return 3;
  const width = window.innerWidth;
  if (width >= BREAKPOINT_XL) return 3; // xl
  if (width >= BREAKPOINT_SM) return 2; // sm
  return 1; // mobile
};

export function useVirtualizedGrid(notes: NoteSummaryPayload[]) {
  "use no memo";

  const parentRef = useRef<HTMLDivElement>(null);
  const [columnsCount, setColumnsCount] = useState(() => getColumnsCount());

  // Update columns on window resize with debounce for performance
  useEffect(() => {
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setColumnsCount(getColumnsCount());
      }, 100); // Debounce resize events
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  const shouldVirtualize = notes.length > VIRTUAL_SCROLL_THRESHOLD;

  // Group notes into rows for virtual scrolling
  const rows = useMemo(() => {
    if (!shouldVirtualize) return [];
    const rows: NoteSummaryPayload[][] = [];
    for (let i = 0; i < notes.length; i += columnsCount) {
      rows.push(notes.slice(i, i + columnsCount));
    }
    return rows;
  }, [notes, columnsCount, shouldVirtualize]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280, // Optimized estimated height of a note card row
    overscan: 3, // Render 3 extra rows for smoother scrolling
    enabled: shouldVirtualize,
  });

  return {
    parentRef,
    columnsCount,
    shouldVirtualize,
    rows,
    rowVirtualizer,
  };
}
