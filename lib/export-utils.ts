import type { NotePayload } from "@/types/note";

// =====================
// Shared helpers
// =====================

/** Strip HTML tags from rich-text content so plain text can be rendered. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/** Escape user-derived strings before injecting them into raw HTML. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function exportNoteToMarkdown(note: NotePayload): string {
  let markdown = `# ${note.title || "Untitled Note"}\n\n`;
  
  if (note.content) {
    markdown += `${note.content}\n\n`;
  }

  if (note.checklist.length > 0) {
    markdown += `## Checklist\n\n`;
    note.checklist.forEach((item) => {
      markdown += `- [${item.checked ? "x" : " "}] ${item.text}\n`;
    });
    markdown += "\n";
  }

  if (note.tags.length > 0) {
    markdown += `## Tags\n\n`;
    note.tags.forEach((tag) => {
      markdown += `#${tag} `;
    });
    markdown += "\n\n";
  }

  if (note.dueAt) {
    markdown += `## Due Date\n\n${new Date(note.dueAt).toLocaleString()}\n\n`;
  }

  markdown += `---\n\n`;
  markdown += `Created: ${new Date(note.createdAt).toLocaleString()}\n`;
  markdown += `Updated: ${new Date(note.updatedAt).toLocaleString()}\n`;

  return markdown;
}



// =====================
// PDF helpers
// =====================

import type { jsPDF } from "jspdf";

type PDFLayout = {
  margin: number;
  maxWidth: number;
  pageHeight: number;
};

/**
 * Render a single note onto the current page of a jsPDF document.
 * Returns the Y cursor position after rendering.
 */
function renderNoteToPDF(
  pdf: jsPDF,
  note: NotePayload,
  layout: PDFLayout,
  startY: number,
): number {
  const { margin, maxWidth, pageHeight } = layout;
  let y = startY;

  const ensureSpace = () => {
    if (y > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  // Title
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  const title = note.title || "Untitled Note";
  const titleLines = pdf.splitTextToSize(title, maxWidth);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 8 + 10;

  // Content — strip HTML tags so only plain text is rendered
  if (note.content) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    const plainContent = stripHtml(note.content);
    const contentLines = pdf.splitTextToSize(plainContent, maxWidth);

    for (const line of contentLines) {
      ensureSpace();
      pdf.text(line as string, margin, y);
      y += 7;
    }
    y += 10;
  }

  // Checklist
  if (note.checklist.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Checklist", margin, y);
    y += 10;

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    for (const item of note.checklist) {
      ensureSpace();
      const checkbox = item.checked ? "☑" : "☐";
      pdf.text(`${checkbox} ${item.text}`, margin + 5, y);
      y += 7;
    }
    y += 10;
  }

  // Tags
  if (note.tags.length > 0) {
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "italic");
    const tagsText = note.tags.map((tag) => `#${tag}`).join(" ");
    const tagLines = pdf.splitTextToSize(tagsText, maxWidth);
    for (const line of tagLines) {
      ensureSpace();
      pdf.text(line as string, margin, y);
      y += 7;
    }
  }

  return y;
}

export async function exportNoteToPDF(note: NotePayload): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pdf.internal.pageSize.getWidth() - 2 * margin;
  const layout: PDFLayout = { margin, maxWidth, pageHeight };

  const y = renderNoteToPDF(pdf, note, layout, margin);
  void y;

  // Metadata footer
  const footerY = pageHeight - 30;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Created: ${new Date(note.createdAt).toLocaleString()}`, margin, footerY);
  pdf.text(`Updated: ${new Date(note.updatedAt).toLocaleString()}`, margin, footerY + 5);

  pdf.save(`${note.title || "note"}.pdf`);
}

export async function exportNotesToPDF(notes: NotePayload[]): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pdf.internal.pageSize.getWidth() - 2 * margin;
  const layout: PDFLayout = { margin, maxWidth, pageHeight };

  let isFirstNote = true;
  for (const note of notes) {
    if (!isFirstNote) pdf.addPage();
    isFirstNote = false;
    renderNoteToPDF(pdf, note, layout, margin);
  }

  pdf.save("notes-export.pdf");
}

export function printNote(note: NotePayload): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const safeTitle = escapeHtml(note.title || "Untitled Note");
  const safeContent = note.content.replace(/\n/g, "<br>");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${safeTitle}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
          }
          h1 { border-bottom: 2px solid #eee; padding-bottom: 10px; }
          .checklist { margin: 20px 0; }
          .tags { margin: 20px 0; color: #666; }
          .metadata { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <h1>${safeTitle}</h1>
        <div>${safeContent}</div>
        ${note.checklist.length > 0 ? `
          <div class="checklist">
            <h2>Checklist</h2>
            <ul>
              ${note.checklist.map(item => `<li>${item.checked ? "☑" : "☐"} ${escapeHtml(item.text)}</li>`).join("")}
            </ul>
          </div>
        ` : ""}
        ${note.tags.length > 0 ? `
          <div class="tags">
            ${note.tags.map(tag => `<span>#${escapeHtml(tag)}</span>`).join(" ")}
          </div>
        ` : ""}
        <div class="metadata">
          <p>Created: ${new Date(note.createdAt).toLocaleString()}</p>
          <p>Updated: ${new Date(note.updatedAt).toLocaleString()}</p>
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

