"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  debounceMs = 300,
  inputRef,
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync local value when external value changes (e.g., from filter reset)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  const hasValue = localValue.trim().length > 0;

  return (
    <div className="relative">
      <Search
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 transition-colors",
          hasValue
            ? "text-(--interactive-accent)"
            : "text-muted-foreground"
        )}
      />
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        placeholder="Search notes"
        className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent pl-9 pr-3 py-1 text-base shadow-xs transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-(--interactive-accent) focus-visible:ring-(--interactive-accent-ring) focus-visible:ring-[3px] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
        style={
          {
            WebkitAppearance: "none",
            appearance: "none",
          } as React.CSSProperties
        }
      />
      {hasValue && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-1.5 w-1.5 rounded-full bg-(--interactive-accent) animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default SearchBar;
