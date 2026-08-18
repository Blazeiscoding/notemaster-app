import { describe, expect, it } from "vitest";
import {
  sanitizeId,
  sanitizeRichTextHtml,
  sanitizeString,
  sanitizeStringArray,
  validateNotePayload,
} from "@/lib/validation";

const UUID = "11111111-2222-4333-8444-555555555555";
const OTHER_UUID = "99999999-8888-4777-8666-555555555555";

const validNote = () => ({
  id: UUID,
  title: "Title",
  content: "<p>Body</p>",
  tags: ["work"],
  checklist: [{ id: OTHER_UUID, text: "item", checked: false }],
  attachments: [],
  type: "note",
  pinned: false,
  archived: false,
  trashed: false,
  dueAt: null,
});

describe("sanitizeString", () => {
  it("trims surrounding whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });

  it("rejects non-strings", () => {
    expect(() => sanitizeString(42)).toThrow(/expected string/);
    expect(() => sanitizeString(null)).toThrow(/expected string/);
  });

  it("rejects input over the length limit", () => {
    expect(() => sanitizeString("x".repeat(11), 10)).toThrow(/maximum length/);
  });

  it("accepts input exactly at the limit", () => {
    expect(sanitizeString("x".repeat(10), 10)).toHaveLength(10);
  });
});

describe("sanitizeStringArray", () => {
  it("drops empty entries", () => {
    expect(sanitizeStringArray(["a", "  ", "b"])).toEqual(["a", "b"]);
  });

  it("rejects non-arrays", () => {
    expect(() => sanitizeStringArray("nope")).toThrow(/expected array/);
  });

  it("rejects arrays over the item limit", () => {
    expect(() => sanitizeStringArray(["a", "b", "c"], 2)).toThrow(/maximum length/);
  });
});

describe("sanitizeId", () => {
  it("accepts a uuid", () => {
    expect(sanitizeId(UUID)).toBe(UUID);
  });

  it("rejects anything that is not a uuid", () => {
    expect(() => sanitizeId("../../etc/passwd")).toThrow(/Invalid ID format/);
    expect(() => sanitizeId("1 OR 1=1")).toThrow(/Invalid ID format/);
    expect(() => sanitizeId("")).toThrow(/Invalid ID format/);
  });
});

describe("sanitizeRichTextHtml", () => {
  it("strips script payloads that the old regex sanitizer let through", () => {
    const output = sanitizeRichTextHtml("<img src=x onerror=alert(1)>");
    expect(output).not.toMatch(/onerror/i);
  });

  it("keeps ordinary formatting intact", () => {
    expect(sanitizeRichTextHtml("<p><strong>hi</strong></p>")).toBe(
      "<p><strong>hi</strong></p>"
    );
  });

  it("still enforces the length limit", () => {
    expect(() => sanitizeRichTextHtml("x".repeat(50), 10)).toThrow(/maximum length/);
  });
});

describe("validateNotePayload", () => {
  it("accepts a well-formed note", () => {
    const result = validateNotePayload(validNote());
    expect(result.id).toBe(UUID);
    expect(result.title).toBe("Title");
    expect(result.checklist).toHaveLength(1);
  });

  it("rejects a payload that is not an object", () => {
    expect(() => validateNotePayload("nope")).toThrow(/expected object/);
    expect(() => validateNotePayload(null)).toThrow(/expected object/);
  });

  it("requires a valid id", () => {
    expect(() => validateNotePayload({ ...validNote(), id: "abc" })).toThrow(
      /Invalid ID format/
    );
  });

  it("rejects an unsupported note type", () => {
    expect(() => validateNotePayload({ ...validNote(), type: "notebook" })).toThrow(
      /Unsupported note type/
    );
  });

  it("sanitizes content rather than rejecting it", () => {
    const result = validateNotePayload({
      ...validNote(),
      content: '<p>ok</p><script>steal()</script>',
    });
    expect(result.content).toBe("<p>ok</p>");
  });

  describe("attachments", () => {
    it("rejects a non-http, non-image-data URL", () => {
      expect(() =>
        validateNotePayload({
          ...validNote(),
          attachments: [
            { id: OTHER_UUID, name: "x", type: "image/png", size: 1, data: "javascript:alert(1)" },
          ],
        })
      ).toThrow(/http\(s\) or image data URL/);
    });

    it("rejects a negative or oversized attachment", () => {
      const attachment = {
        id: OTHER_UUID,
        name: "x",
        type: "image/png",
        data: "https://cdn.test/a.png",
      };
      expect(() =>
        validateNotePayload({ ...validNote(), attachments: [{ ...attachment, size: -1 }] })
      ).toThrow(/size is invalid/);
      expect(() =>
        validateNotePayload({
          ...validNote(),
          attachments: [{ ...attachment, size: 21 * 1024 * 1024 }],
        })
      ).toThrow(/size is invalid/);
    });

    it("rejects more than 20 attachments", () => {
      const attachments = Array.from({ length: 21 }, () => ({
        id: OTHER_UUID,
        name: "x",
        type: "image/png",
        size: 1,
        data: "https://cdn.test/a.png",
      }));
      expect(() => validateNotePayload({ ...validNote(), attachments })).toThrow(
        /maximum length of 20/
      );
    });
  });

  describe("dueAt", () => {
    it("normalizes a parseable date to ISO", () => {
      const result = validateNotePayload({ ...validNote(), dueAt: "2026-01-02" });
      expect(result.dueAt).toBe(new Date("2026-01-02").toISOString());
    });

    it("treats empty string as null", () => {
      expect(validateNotePayload({ ...validNote(), dueAt: "" }).dueAt).toBeNull();
    });

    it("rejects an unparseable date", () => {
      expect(() => validateNotePayload({ ...validNote(), dueAt: "not-a-date" })).toThrow(
        /Invalid due date/
      );
    });
  });

  describe("partial mode", () => {
    it("returns only the fields that were supplied", () => {
      const result = validateNotePayload({ id: UUID, pinned: true }, { partial: true });
      expect(result).toEqual({ id: UUID, pinned: true });
      expect("title" in result).toBe(false);
    });

    it("still validates the fields that were supplied", () => {
      expect(() =>
        validateNotePayload({ id: UUID, tags: "not-an-array" }, { partial: true })
      ).toThrow(/expected array/);
    });

    it("requires an id even in partial mode", () => {
      expect(() => validateNotePayload({ pinned: true }, { partial: true })).toThrow(
        /Invalid input type: expected string/
      );
    });
  });
});
