import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

import type { Attachment, ChecklistItem } from "@/types/note";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Returned in place of a field that could not be decrypted (usually a changed
 * or missing NOTES_ENCRYPTION_KEY).
 *
 * Writers must never persist this value: the underlying ciphertext is still
 * intact and recoverable once the right key is restored, but overwriting it
 * with the placeholder destroys the note for good. See `isDecryptionFailure`.
 */
export const DECRYPTION_FAILED_PLACEHOLDER = "[Unable to decrypt content]";

/** True if a value is the placeholder produced by a failed decryption. */
export const isDecryptionFailure = (value: unknown): boolean =>
  typeof value === "string" && value.trim() === DECRYPTION_FAILED_PLACEHOLDER;

/**
 * Minimum key length before we warn.
 *
 * The AES key is SHA-256 of this value, so a short or guessable string is
 * brute-forceable regardless of the 256-bit key it expands to — the entropy of
 * the input is what matters.
 */
const MIN_KEY_LENGTH = 32;

const rawKey = process.env.NOTES_ENCRYPTION_KEY;
const hasEncryptionKey = typeof rawKey === "string" && rawKey.trim().length > 0;

if (hasEncryptionKey && rawKey!.trim().length < MIN_KEY_LENGTH) {
  console.warn(
    `NOTES_ENCRYPTION_KEY is shorter than ${MIN_KEY_LENGTH} characters. ` +
      "Use high-entropy random data (e.g. `openssl rand -base64 32`)."
  );
}

if (!hasEncryptionKey) {
  const message =
    "NOTES_ENCRYPTION_KEY is not set. Falling back to plaintext storage for notes.";
  if (process.env.NODE_ENV === "production") {
    console.error(message);
  } else {
    console.warn(message);
  }
}

export const encryptAttachments = (
  attachments: Attachment[] = []
): Attachment[] =>
  attachments.map((attachment) => ({
    ...attachment,
    name: encryptString(attachment.name ?? ""),
    type: encryptString(attachment.type ?? ""),
    data: encryptString(attachment.data ?? ""),
  }));

export const decryptAttachments = (value: unknown): Attachment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const { id, name, type, size, data } = item as Partial<Attachment>;

      if (typeof id !== "string" || typeof size !== "number") {
        return null;
      }

      return {
        id,
        size,
        name: decryptString(typeof name === "string" ? name : ""),
        type: decryptString(typeof type === "string" ? type : ""),
        data: decryptString(typeof data === "string" ? data : ""),
      };
    })
    .filter((item): item is Attachment => item !== null);
};

const KEY = hasEncryptionKey
  ? createHash("sha256").update(rawKey!).digest()
  : null;

const encode = (buffer: Buffer) => buffer.toString("base64");
const decode = (value: string) => Buffer.from(value, "base64");

export const encryptString = (plainText: string): string => {
  if (!KEY) {
    return plainText;
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return encode(Buffer.concat([iv, authTag, encrypted]));
};

export const decryptString = (encrypted: string): string => {
  if (!encrypted) {
    return "";
  }

  if (!KEY) {
    return encrypted;
  }

  try {
    const buffer = decode(encrypted);
    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Failed to decrypt note field", error);
    return DECRYPTION_FAILED_PLACEHOLDER;
  }
};

export const encryptStringArray = (values: string[] = []): string[] =>
  values.map(encryptString);

export const decryptStringArray = (values: string[] = []): string[] =>
  values.map(decryptString);

export const encryptChecklist = (
  items: ChecklistItem[] = []
): ChecklistItem[] =>
  items.map((item) => ({
    ...item,
    text: encryptString(item.text ?? ""),
  }));

export const decryptChecklist = (value: unknown): ChecklistItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const { id, text, checked } = item as Partial<ChecklistItem>;

      if (typeof id !== "string") {
        return null;
      }

      return {
        id,
        checked: Boolean(checked),
        text: decryptString(typeof text === "string" ? text : ""),
      };
    })
    .filter((item): item is ChecklistItem => item !== null);
};
