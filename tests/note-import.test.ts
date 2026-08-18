import { describe, expect, it } from "vitest";
import { parseImportedNote, buildNewNote } from "@/components/note-app/util";
import { buildNotePreview, deriveNoteSummary } from "@/types/note";

const fullNote = () => ({
  id: "note-1",
  userId: "user-1",
  title: "Groceries",
  content: "<p>milk and eggs</p>",
  tags: ["home"],
  checklist: [{ id: "c1", text: "milk", checked: true }],
  attachments: [
    { id: "a1", name: "x.png", type: "image/png", size: 10, data: "https://cdn.test/x.png" },
  ],
  type: "note",
  pinned: true,
  archived: false,
  trashed: false,
  dueAt: "2026-03-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
});

describe("parseImportedNote", () => {
  it("accepts a full note and preserves its fields", () => {
    const parsed = parseImportedNote(fullNote());
    expect(parsed).not.toBeNull();
    expect(parsed?.content).toBe("<p>milk and eggs</p>");
    expect(parsed?.tags).toEqual(["home"]);
    expect(parsed?.pinned).toBe(true);
    expect(parsed?.dueAt).toBe("2026-03-01T00:00:00.000Z");
  });

  it("rejects a summary object, which has a preview instead of content", () => {
    // Exports produced before the summaries refactor contained these, and
    // importing them silently created notes with no body.
    const summary = deriveNoteSummary(fullNote() as never);
    expect(parseImportedNote(summary)).toBeNull();
  });

  it("rejects entries that are not objects", () => {
    expect(parseImportedNote(null)).toBeNull();
    expect(parseImportedNote("note")).toBeNull();
    expect(parseImportedNote(42)).toBeNull();
    expect(parseImportedNote([])).toBeNull();
  });

  it("rejects an entry with no id", () => {
    const withoutId: Record<string, unknown> = { ...fullNote() };
    delete withoutId.id;
    expect(parseImportedNote(withoutId)).toBeNull();
  });

  it("defaults missing optional fields rather than failing", () => {
    const parsed = parseImportedNote({ id: "n", content: "<p>x</p>" });
    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe("");
    expect(parsed?.tags).toEqual([]);
    expect(parsed?.checklist).toEqual([]);
    expect(parsed?.attachments).toEqual([]);
    expect(parsed?.userId).toBeNull();
    expect(parsed?.dueAt).toBeNull();
  });

  it("drops malformed checklist and attachment entries", () => {
    const parsed = parseImportedNote({
      id: "n",
      content: "",
      checklist: [{ id: "ok", text: "t", checked: false }, null, { text: "no id" }],
      attachments: [{ id: "a", data: "https://x.test" }, { id: "b" }, "nope"],
    });
    expect(parsed?.checklist).toHaveLength(1);
    expect(parsed?.attachments).toHaveLength(1);
  });

  it("drops non-string tags", () => {
    const parsed = parseImportedNote({ id: "n", content: "", tags: ["ok", 5, null] });
    expect(parsed?.tags).toEqual(["ok"]);
  });

  it("replaces an invalid timestamp with a valid one", () => {
    const parsed = parseImportedNote({ id: "n", content: "", createdAt: "garbage" });
    expect(Number.isNaN(Date.parse(parsed!.createdAt))).toBe(false);
  });

  it("forces the type to note", () => {
    expect(parseImportedNote({ id: "n", content: "", type: "notebook" })?.type).toBe("note");
  });

  it("round-trips a note built by buildNewNote", () => {
    const note = buildNewNote("user-1", { title: "T", content: "<p>C</p>" });
    expect(parseImportedNote(JSON.parse(JSON.stringify(note)))).toEqual(note);
  });
});

describe("buildNotePreview", () => {
  it("strips markup and collapses whitespace", () => {
    expect(buildNotePreview("<p>hello   <strong>world</strong></p>")).toBe("hello world");
  });

  it("returns a placeholder for empty content", () => {
    expect(buildNotePreview("")).toBe("No content yet");
    expect(buildNotePreview("<p></p>")).toBe("No content yet");
  });

  it("truncates long content with an ellipsis", () => {
    const preview = buildNotePreview("x".repeat(500));
    expect(preview.endsWith("...")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(243);
  });

  it("leaves content at the limit untruncated", () => {
    expect(buildNotePreview("x".repeat(240))).toBe("x".repeat(240));
  });
});

describe("deriveNoteSummary", () => {
  it("counts checklist completion", () => {
    const summary = deriveNoteSummary({
      ...fullNote(),
      checklist: [
        { id: "a", text: "", checked: true },
        { id: "b", text: "", checked: false },
      ],
    } as never);
    expect(summary.checklistTotalCount).toBe(2);
    expect(summary.checklistCompletedCount).toBe(1);
  });

  it("picks the first image attachment", () => {
    const summary = deriveNoteSummary({
      ...fullNote(),
      attachments: [
        { id: "1", name: "a.pdf", type: "application/pdf", size: 1, data: "https://x.test/a" },
        { id: "2", name: "b.png", type: "image/png", size: 1, data: "https://x.test/b" },
      ],
    } as never);
    expect(summary.firstImage?.id).toBe("2");
  });

  it("reports no image when there is none", () => {
    const summary = deriveNoteSummary({ ...fullNote(), attachments: [] } as never);
    expect(summary.firstImage).toBeNull();
  });
});
