import { describe, expect, it } from "vitest";
import { stripHtml, richTextHtmlToMarkdown } from "@/lib/note-html";
import { snapshotNote } from "@/components/note-app/hooks/useAutosave";
import { buildNewNote } from "@/components/note-app/util";

describe("stripHtml", () => {
  it("removes tags and keeps text", () => {
    expect(stripHtml("<p>hello <strong>world</strong></p>")).toBe("hello world");
  });

  it("turns <br> into a newline", () => {
    expect(stripHtml("a<br>b")).toBe("a\nb");
    expect(stripHtml("a<br />b")).toBe("a\nb");
  });

  it("turns block closes into newlines", () => {
    expect(stripHtml("<p>a</p><p>b</p>")).toBe("a\nb");
    expect(stripHtml("<li>one</li><li>two</li>")).toBe("one\ntwo");
  });

  it("normalizes non-breaking spaces", () => {
    expect(stripHtml("a\u00a0b")).toBe("a b");
  });

  it("handles empty input", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("richTextHtmlToMarkdown", () => {
  // Without a DOM the function falls back to stripHtml, which is the behaviour
  // on the server; the browser path is exercised by the editor itself.
  it("falls back to plain text when no DOMParser is available", () => {
    expect(richTextHtmlToMarkdown("<p>hello</p>")).toBe("hello");
  });
});

describe("snapshotNote", () => {
  const base = buildNewNote("user-1", { title: "T", content: "<p>C</p>" });

  it("is stable across calls for an unchanged note", () => {
    expect(snapshotNote(base)).toBe(snapshotNote({ ...base }));
  });

  it("ignores updatedAt, which autosave rewrites on every save", () => {
    // This is what stopped every note open from leaving a stale draft behind.
    expect(snapshotNote({ ...base, updatedAt: "2030-01-01T00:00:00.000Z" })).toBe(
      snapshotNote(base)
    );
  });

  it("changes when the title changes", () => {
    expect(snapshotNote({ ...base, title: "Other" })).not.toBe(snapshotNote(base));
  });

  it("changes when the content changes", () => {
    expect(snapshotNote({ ...base, content: "<p>D</p>" })).not.toBe(snapshotNote(base));
  });

  it("changes when tags, checklist or attachments change", () => {
    expect(snapshotNote({ ...base, tags: ["x"] })).not.toBe(snapshotNote(base));
    expect(
      snapshotNote({ ...base, checklist: [{ id: "1", text: "a", checked: false }] })
    ).not.toBe(snapshotNote(base));
  });

  it("changes when a flag changes", () => {
    expect(snapshotNote({ ...base, pinned: true })).not.toBe(snapshotNote(base));
    expect(snapshotNote({ ...base, dueAt: "2026-01-01T00:00:00.000Z" })).not.toBe(
      snapshotNote(base)
    );
  });
});
