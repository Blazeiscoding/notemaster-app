const BLOCK_TAGS = new Set([
  "p",
  "div",
  "section",
  "article",
  "blockquote",
  "pre",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+\n/g, "\n");
}

export function stripHtml(html: string): string {
  return normalizeWhitespace(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|blockquote|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]*>/g, "")
  ).trim();
}

export function richTextHtmlToMarkdown(html: string): string {
  if (typeof DOMParser === "undefined") {
    return stripHtml(html);
  }

  const doc = new DOMParser().parseFromString(html, "text/html");

  const renderNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? "";
    }

    if (!(node instanceof HTMLElement)) {
      return "";
    }

    const children = Array.from(node.childNodes).map(renderNode).join("");
    const tag = node.tagName.toLowerCase();

    switch (tag) {
      case "strong":
      case "b":
        return `**${children.trim()}**`;
      case "em":
      case "i":
        return `*${children.trim()}*`;
      case "code":
        return `\`${children.trim()}\``;
      case "pre":
        return `\n\`\`\`\n${stripHtml(node.innerHTML)}\n\`\`\`\n`;
      case "blockquote":
        return `\n> ${stripHtml(node.innerHTML).replace(/\n/g, "\n> ")}\n`;
      case "h1":
        return `\n# ${stripHtml(node.innerHTML)}\n`;
      case "h2":
        return `\n## ${stripHtml(node.innerHTML)}\n`;
      case "h3":
        return `\n### ${stripHtml(node.innerHTML)}\n`;
      case "li": {
        const prefix = node.parentElement?.tagName.toLowerCase() === "ol" ? "1. " : "- ";
        return `${prefix}${children.trim()}\n`;
      }
      case "ul":
      case "ol":
        return `\n${children}`;
      case "img": {
        const src = node.getAttribute("src") ?? "";
        const alt = node.getAttribute("alt") ?? "image";
        return src ? `![${alt}](${src})` : "";
      }
      case "br":
        return "\n";
      default:
        if (BLOCK_TAGS.has(tag)) {
          return `\n${children}\n`;
        }
        return children;
    }
  };

  return normalizeWhitespace(Array.from(doc.body.childNodes).map(renderNode).join(""))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
