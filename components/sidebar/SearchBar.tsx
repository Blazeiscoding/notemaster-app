"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
};

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  debounceMs = 300,
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

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={localValue}
        onChange={(event) => setLocalValue(event.target.value)}
        placeholder="Search notes"
        className="pl-9"
      />
    </div>
  );
};

export default SearchBar;
