import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The encryption module reads its key once at import time, so the env var has
// to be in place before the dynamic import below.
process.env.NOTES_ENCRYPTION_KEY = "test-key-for-unit-tests";

const encryption = await import("@/lib/encryption");
const {
  encryptString,
  decryptString,
  encryptStringArray,
  decryptStringArray,
  encryptChecklist,
  decryptChecklist,
  encryptAttachments,
  decryptAttachments,
} = encryption;

const UUID = "11111111-2222-4333-8444-555555555555";

describe("encryptString / decryptString", () => {
  it("round-trips a value", () => {
    expect(decryptString(encryptString("hello world"))).toBe("hello world");
  });

  it("round-trips unicode and emoji", () => {
    const value = "日本語 — café 🔐";
    expect(decryptString(encryptString(value))).toBe(value);
  });

  it("round-trips an empty string", () => {
    expect(decryptString(encryptString(""))).toBe("");
  });

  it("produces different ciphertext for the same plaintext", () => {
    // A fresh random IV per call, so equal notes are not detectable as equal.
    expect(encryptString("same")).not.toBe(encryptString("same"));
  });

  it("does not leak plaintext into the ciphertext", () => {
    expect(encryptString("secret-token")).not.toContain("secret-token");
  });

  it("reports a decryption failure instead of throwing", () => {
    expect(decryptString("not-valid-ciphertext")).toBe("[Unable to decrypt content]");
  });

  it("rejects ciphertext whose auth tag has been tampered with", () => {
    const encrypted = encryptString("original");
    const buffer = Buffer.from(encrypted, "base64");
    buffer[buffer.length - 1] ^= 0xff;
    expect(decryptString(buffer.toString("base64"))).toBe("[Unable to decrypt content]");
  });
});

describe("collection helpers", () => {
  it("round-trips a string array", () => {
    const tags = ["work", "urgent"];
    expect(decryptStringArray(encryptStringArray(tags))).toEqual(tags);
  });

  it("round-trips a checklist, preserving ids and checked state", () => {
    const checklist = [
      { id: UUID, text: "buy milk", checked: true },
      { id: UUID, text: "walk dog", checked: false },
    ];
    expect(decryptChecklist(encryptChecklist(checklist))).toEqual(checklist);
  });

  it("encrypts checklist text but leaves ids readable", () => {
    const encrypted = encryptChecklist([{ id: UUID, text: "secret", checked: false }]);
    expect(encrypted[0].id).toBe(UUID);
    expect(encrypted[0].text).not.toBe("secret");
  });

  it("round-trips attachments", () => {
    const attachments = [
      {
        id: UUID,
        name: "photo.png",
        type: "image/png",
        size: 1234,
        data: "https://cdn.test/photo.png",
      },
    ];
    expect(decryptAttachments(encryptAttachments(attachments))).toEqual(attachments);
  });

  it("returns an empty array for malformed stored values", () => {
    expect(decryptChecklist(null)).toEqual([]);
    expect(decryptChecklist("not-an-array")).toEqual([]);
    expect(decryptAttachments(undefined)).toEqual([]);
  });

  it("skips entries that are missing required fields", () => {
    expect(decryptChecklist([{ text: "no id" }, null, 5])).toEqual([]);
    expect(decryptAttachments([{ id: UUID }])).toEqual([]);
  });
});

describe("without an encryption key", () => {
  let plaintextModule: typeof encryption;

  beforeAll(async () => {
    delete process.env.NOTES_ENCRYPTION_KEY;
    // Clear the module registry so the module-level key check runs again.
    vi.resetModules();
    plaintextModule = await import("@/lib/encryption");
  });

  afterAll(() => {
    process.env.NOTES_ENCRYPTION_KEY = "test-key-for-unit-tests";
    vi.resetModules();
  });

  it("falls back to storing values as-is", () => {
    expect(plaintextModule.encryptString("hello")).toBe("hello");
    expect(plaintextModule.decryptString("hello")).toBe("hello");
  });

  it("is not the same module instance as the keyed one", () => {
    // Guards against a false pass if module caching defeated the reset.
    expect(plaintextModule.encryptString).not.toBe(encryptString);
  });
});

describe("isDecryptionFailure", () => {
  it("recognises the placeholder a failed decryption returns", () => {
    expect(encryption.isDecryptionFailure(decryptString("garbage"))).toBe(true);
    expect(encryption.isDecryptionFailure(encryption.DECRYPTION_FAILED_PLACEHOLDER)).toBe(true);
  });

  it("ignores surrounding whitespace, which validation trims anyway", () => {
    expect(
      encryption.isDecryptionFailure(` ${encryption.DECRYPTION_FAILED_PLACEHOLDER} `)
    ).toBe(true);
  });

  it("does not flag ordinary note text", () => {
    expect(encryption.isDecryptionFailure("Unable to decrypt content")).toBe(false);
    expect(encryption.isDecryptionFailure("my notes")).toBe(false);
    expect(encryption.isDecryptionFailure("")).toBe(false);
    expect(encryption.isDecryptionFailure(undefined)).toBe(false);
    expect(encryption.isDecryptionFailure(null)).toBe(false);
  });
});
