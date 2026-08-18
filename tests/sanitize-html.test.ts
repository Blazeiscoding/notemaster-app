import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize-html";

describe("sanitizeHtml", () => {
  describe("script injection", () => {
    it("drops script tags along with their contents", () => {
      const output = sanitizeHtml("<p>hi</p><script>alert(1)</script>");
      expect(output).toBe("<p>hi</p>");
    });

    it("drops style tags along with their contents", () => {
      const output = sanitizeHtml("<style>body{background:url(x)}</style><p>hi</p>");
      expect(output).toBe("<p>hi</p>");
    });

    it("drops iframes, objects and embeds", () => {
      expect(sanitizeHtml('<iframe src="//evil.test"></iframe>')).toBe("");
      expect(sanitizeHtml("<object data='x'></object>")).toBe("");
      expect(sanitizeHtml("<embed src='x'>")).toBe("");
    });

    it("does not resurrect a script tag from a nested close tag", () => {
      const output = sanitizeHtml("<script><script>alert(1)</script></script>");
      expect(output).not.toContain("alert");
    });
  });

  describe("event handler attributes", () => {
    // The regex sanitizer this replaced only stripped quoted handlers, so an
    // unquoted one survived and executed in the print window.
    it("strips unquoted on* handlers", () => {
      const output = sanitizeHtml("<img src=x onerror=alert(document.cookie)>");
      expect(output).not.toMatch(/onerror/i);
    });

    it("strips double-quoted on* handlers", () => {
      const output = sanitizeHtml('<img src="x" onerror="alert(1)">');
      expect(output).not.toMatch(/onerror/i);
    });

    it("strips single-quoted on* handlers", () => {
      const output = sanitizeHtml("<img src='x' onerror='alert(1)'>");
      expect(output).not.toMatch(/onerror/i);
    });

    it("strips handlers regardless of attribute name casing", () => {
      const output = sanitizeHtml('<p OnMouseOver="alert(1)">text</p>');
      expect(output).toBe("<p>text</p>");
    });

    it("strips handlers on tags that are otherwise allowed", () => {
      const output = sanitizeHtml('<a href="https://ok.test" onclick="steal()">x</a>');
      expect(output).toContain('href="https://ok.test"');
      expect(output).not.toMatch(/onclick/i);
    });
  });

  describe("URL schemes", () => {
    it("rejects javascript: hrefs", () => {
      const output = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
      expect(output).toBe("<a>click</a>");
    });

    it("rejects javascript: hidden behind whitespace", () => {
      const output = sanitizeHtml('<a href="java\tscript:alert(1)">click</a>');
      expect(output).not.toMatch(/javascript/i);
    });

    it("rejects javascript: hidden behind html entities", () => {
      const output = sanitizeHtml('<a href="&#106;avascript:alert(1)">click</a>');
      expect(output).toBe("<a>click</a>");
    });

    it("rejects non-image data URLs", () => {
      const output = sanitizeHtml('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>');
      expect(output).toBe("<a>x</a>");
    });

    it("rejects data:image/svg+xml, which can carry script", () => {
      const output = sanitizeHtml('<img src="data:image/svg+xml;base64,PHN2Zz4=">');
      expect(output).not.toContain("svg");
    });

    it("keeps https, mailto, relative and fragment URLs", () => {
      expect(sanitizeHtml('<a href="https://ok.test/x">a</a>')).toContain("https://ok.test/x");
      expect(sanitizeHtml('<a href="mailto:me@ok.test">a</a>')).toContain("mailto:");
      expect(sanitizeHtml('<a href="/notes/1">a</a>')).toContain('href="/notes/1"');
      expect(sanitizeHtml('<a href="#section">a</a>')).toContain('href="#section"');
    });

    it("keeps base64 raster image data URLs used by attachments", () => {
      const src = "data:image/png;base64,iVBORw0KGgo=";
      expect(sanitizeHtml(`<img src="${src}">`)).toContain(src);
    });
  });

  describe("content preservation", () => {
    it("preserves the TipTap formatting tags the editor produces", () => {
      const html =
        "<h2>Title</h2><p><strong>bold</strong> and <em>italic</em></p><ul><li>one</li></ul>";
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("preserves code blocks with lowlight language classes", () => {
      const html = '<pre><code class="language-ts">const x = 1;</code></pre>';
      expect(sanitizeHtml(html)).toBe(html);
    });

    it("drops a class that is not a lowlight class", () => {
      const output = sanitizeHtml('<code class="evil-tracker">x</code>');
      expect(output).toBe("<code>x</code>");
    });

    it("escapes bare text that looks like markup", () => {
      expect(sanitizeHtml("5 < 6 & 7 > 3")).toBe("5 &lt; 6 &amp; 7 &gt; 3");
    });

    it("unwraps disallowed tags but keeps their text", () => {
      expect(sanitizeHtml("<marquee>hello</marquee>")).toBe("hello");
    });

    it("closes tags the input left dangling", () => {
      expect(sanitizeHtml("<p>unclosed")).toBe("<p>unclosed</p>");
    });

    it("ignores a stray closing tag that was never opened", () => {
      expect(sanitizeHtml("text</p>")).toBe("text");
    });

    it("drops html comments", () => {
      expect(sanitizeHtml("<p>a</p><!-- secret -->")).toBe("<p>a</p>");
    });

    it("returns an empty string for empty input", () => {
      expect(sanitizeHtml("")).toBe("");
    });
  });

  describe("link hardening", () => {
    it("adds rel=noopener to links that open a new tab", () => {
      const output = sanitizeHtml('<a href="https://ok.test" target="_blank">x</a>');
      expect(output).toContain('rel="noopener noreferrer"');
    });

    it("does not let a caller supply its own weaker rel", () => {
      const output = sanitizeHtml(
        '<a href="https://ok.test" target="_blank" rel="opener">x</a>'
      );
      expect(output).toContain('rel="noopener noreferrer"');
      expect(output).not.toContain('rel="opener"');
    });
  });

  it("is idempotent", () => {
    const dirty = '<p onclick="x">hi<script>bad()</script><img src=y onerror=z></p>';
    const once = sanitizeHtml(dirty);
    expect(sanitizeHtml(once)).toBe(once);
  });
});
