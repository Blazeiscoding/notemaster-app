"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          className={cn(
            "appearance-none w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm font-medium shadow-sm transition-all duration-200",
            "focus:border-(--accent-primary) focus:outline-none focus:ring-2 focus:ring-(--accent-primary)/50 focus:shadow-md",
            "hover:border-(--interactive-accent)/50 hover:bg-accent/30 hover:shadow-sm",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background",
            "cursor-pointer",
            "text-foreground",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none text-muted-foreground transition-transform duration-200 group-hover:translate-y-[-2px]" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };

