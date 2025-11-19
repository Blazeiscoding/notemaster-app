"use client";

import React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotePayload } from "@/types/note";

type CalendarViewProps = {
  notes: NotePayload[];
  onOpenNote: (note: NotePayload) => void;
};

const CalendarView: React.FC<CalendarViewProps> = ({ notes, onOpenNote }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const jumpToToday = () => setCurrentMonth(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getNotesForDay = (day: Date) => {
    return notes.filter((note) => {
      if (!note.dueAt) return false;
      return isSameDay(new Date(note.dueAt), day);
    });
  };

  return (
    <div className="flex h-full flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-1 rounded-md border bg-background/50 p-0.5 shadow-sm">
            <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={jumpToToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg border bg-muted text-center text-sm font-semibold leading-6 shadow-sm overflow-hidden">
        {weekDays.map((day) => (
          <div key={day} className="bg-background py-2 text-muted-foreground">
            {day}
          </div>
        ))}
        {calendarDays.map((day, dayIdx) => {
          const dayNotes = getNotesForDay(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isDayToday = isToday(day);

          return (
            <div
              key={day.toString()}
              className={cn(
                "relative flex min-h-[120px] flex-col gap-1 bg-background p-2 hover:bg-muted/20 transition-colors",
                !isCurrentMonth && "bg-muted/5 text-muted-foreground/50"
              )}
            >
              <time
                dateTime={format(day, "yyyy-MM-dd")}
                className={cn(
                  "ml-auto flex size-6 items-center justify-center rounded-full text-xs font-medium",
                  isDayToday
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                )}
              >
                {format(day, "d")}
              </time>
              <div className="flex flex-col gap-1 overflow-y-auto max-h-[100px] no-scrollbar">
                {dayNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => onOpenNote(note)}
                    className="group flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-xs font-medium transition-all hover:bg-primary/10 hover:text-primary"
                  >
                    <div
                      className={cn(
                        "size-1.5 rounded-full shrink-0",
                        note.pinned ? "bg-[var(--interactive-accent)]" : "bg-primary/40"
                      )}
                    />
                    <span className="truncate">{note.title || "Untitled"}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
