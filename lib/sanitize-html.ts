/**
 * Allowlist-based HTML sanitizer for rich-text note content.
 *
 * Note bodies are produced by TipTap, whose schema is a small, known set of
 * tags and attributes. Rather than blocklisting dangerous markup with regexes
 * (trivially bypassed by unquoted attributes, e.g. `<img src=x onerror=alert(1)>`),
 * this tokenizes the input and re-emits only tags and attributes that appear in
 * the allowlist below. Everything else — unknown tags, every `on*` handler,
 * `javascript:` URLs, `<script>`/`<style>` bodies — is dropped.
 *
 * Runs identically on the server (API validation) and the client (print/export),
 * with no DOM dependency.
 */

/** Tags that survive sanitization, mapped to the attributes each may keep. */
const ALLOWED_TAGS: Record<string, readonly string[]> = {
  p: [],
  br: [],
  div: [],
  span: [],
  strong: [],
  b: [],
  em: [],
  i: [],
  u: [],
  s: [],
  strike: [],
  del: [],
  mark: [],
  sub: [],
  sup: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  ul: [],
  ol: ["start"],
  li: [],
  blockquote: [],
  pre: [],
  code: ["class"],
  hr: [],
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title", "width", "height"],
  table: [],
  thead: [],
  tbody: [],
  tr: [],
  th: ["colspan", "rowspan"],
  td: ["colspan", "rowspan"],
};

/** Tags with no closing counterpart. */
const VOID_TAGS = new Set(["br", "hr", "img"]);

/** Tags whose entire contents are discarded, not just the tag itself. */
const RAW_TEXT_TAGS = new Set(["script", "style", "iframe", "object", "embed"]);

/** Attributes that carry a URL and therefore need scheme validation. */
const URL_ATTRIBUTES = new Set(["href", "src"]);

const SAFE_URL =
  /^(?:https?:\/\/|mailto:|tel:|\/|#|data:image\/(?:png|jpe?g|gif|webp|avif);base64,)/i;

/** `class` is only allowed on <code>, for lowlight syntax highlighting. */
const SAFE_CLASS =
  /^(?:language-[a-z0-9#+-]+|hljs(?:-[a-z0-9-]+)?)(?:\s+(?:language-[a-z0-9#+-]+|hljs(?:-[a-z0-9-]+)?))*$/i;

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeText(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ENTITIES[char]);
}

/**
 * Decode the entities and strip the whitespace an attacker could hide a scheme
 * behind (`java\tscript:`, `&#106;avascript:`) before the scheme is checked.
 */
function normalizeUrl(value: string): string {
  return value
    .replace(/&#(\d+);?/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, code: string) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/[\u0000-\u0020]/g, "")
    .toLowerCase();
}

function isSafeUrl(value: string): boolean {
  const normalized = normalizeUrl(value);
  const declaresScheme = /^[a-z][a-z0-9+.-]*:/.test(normalized);

  // A URL either declares a scheme we explicitly allow, or declares none at all
  // (relative paths, fragments) — anything else is rejected.
  return declaresScheme ? SAFE_URL.test(normalized) : true;
}

type Attribute = { name: string; value: string };

/** Parse an attribute list, handling double-quoted, single-quoted and bare values. */
function parseAttributes(source: string): Attribute[] {
  const attributes: Attribute[] = [];
  const pattern =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    attributes.push({
      name: match[1].toLowerCase(),
      value: match[2] ?? match[3] ?? match[4] ?? "",
    });
  }

  return attributes;
}

function serializeAttributes(tag: string, attributes: Attribute[]): string {
  const allowed = ALLOWED_TAGS[tag];
  const parts: string[] = [];
  let hasTarget = false;
  let hasHref = false;

  for (const { name, value } of attributes) {
    // `on*` handlers never survive, regardless of quoting style.
    if (name.startsWith("on") || !allowed.includes(name)) continue;
    if (URL_ATTRIBUTES.has(name) && !isSafeUrl(value)) continue;
    if (name === "class" && !SAFE_CLASS.test(value.trim())) continue;
    if (name === "rel") continue; // re-added below only where it is needed

    if (name === "target") hasTarget = true;
    if (name === "href") hasHref = true;

    parts.push(`${name}="${escapeText(value)}"`);
  }

  // Prevent reverse tabnabbing on links that open in a new browsing context.
  if (tag === "a" && hasHref && hasTarget) {
    parts.push('rel="noopener noreferrer"');
  }

  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

/**
 * Strip every tag and attribute outside the allowlist, returning safe HTML.
 * Text content is preserved and escaped; tag contents are kept except for
 * raw-text elements like <script> and <style>, which are dropped wholesale.
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  const output: string[] = [];
  const openTags: string[] = [];
  const pattern =
    /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let skipUntil: string | null = null;

  while ((match = pattern.exec(input)) !== null) {
    const [raw, rawTag, rawAttrs = ""] = match;
    const text = input.slice(lastIndex, match.index);
    lastIndex = pattern.lastIndex;

    if (!skipUntil) output.push(escapeText(text));

    // Comments carry no content worth keeping.
    if (rawTag === undefined) continue;

    const tag = rawTag.toLowerCase();
    const isClosing = raw.startsWith("</");

    // Inside <script>/<style>/etc., discard everything until the matching close.
    if (skipUntil) {
      if (isClosing && tag === skipUntil) skipUntil = null;
      continue;
    }

    if (RAW_TEXT_TAGS.has(tag)) {
      if (!isClosing && !raw.endsWith("/>")) skipUntil = tag;
      continue;
    }

    if (!(tag in ALLOWED_TAGS)) continue;

    if (isClosing) {
      // Only close a tag we actually opened, so the output stays balanced.
      const openIndex = openTags.lastIndexOf(tag);
      if (openIndex === -1) continue;
      while (openTags.length > openIndex) {
        output.push(`</${openTags.pop()}>`);
      }
      continue;
    }

    const attributes = serializeAttributes(tag, parseAttributes(rawAttrs));

    if (VOID_TAGS.has(tag)) {
      output.push(`<${tag}${attributes} />`);
      continue;
    }

    output.push(`<${tag}${attributes}>`);
    openTags.push(tag);
  }

  if (!skipUntil) output.push(escapeText(input.slice(lastIndex)));

  // Close anything the input left dangling.
  while (openTags.length > 0) {
    output.push(`</${openTags.pop()}>`);
  }

  return output.join("");
}
