import type { NotePayload } from "@/types/note";

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



export async function exportNoteToPDF(note: NotePayload): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;

  let y = margin;

  // Title
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  const title = note.title || "Untitled Note";
  const titleLines = pdf.splitTextToSize(title, maxWidth);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 8 + 10;

  // Content
  if (note.content) {
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    const contentLines = pdf.splitTextToSize(note.content, maxWidth);
    
    contentLines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += 7;
    });
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
    note.checklist.forEach((item) => {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      const checkbox = item.checked ? "☑" : "☐";
      pdf.text(`${checkbox} ${item.text}`, margin + 5, y);
      y += 7;
    });
    y += 10;
  }

  // Tags
  if (note.tags.length > 0) {
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "italic");
    const tagsText = note.tags.map((tag) => `#${tag}`).join(" ");
    const tagLines = pdf.splitTextToSize(tagsText, maxWidth);
    tagLines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += 7;
    });
  }

  // Metadata
  y = pageHeight - 30;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(128, 128, 128);
  pdf.text(
    `Created: ${new Date(note.createdAt).toLocaleString()}`,
    margin,
    y
  );
  pdf.text(
    `Updated: ${new Date(note.updatedAt).toLocaleString()}`,
    margin,
    y + 5
  );

  pdf.save(`${note.title || "note"}.pdf`);
}

export async function exportNotesToPDF(notes: NotePayload[]): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;

  let isFirstNote = true;

  for (const note of notes) {
    if (!isFirstNote) {
      pdf.addPage();
    }
    isFirstNote = false;

    let y = margin;

    // Title
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    const title = note.title || "Untitled Note";
    const titleLines = pdf.splitTextToSize(title, maxWidth);
    pdf.text(titleLines, margin, y);
    y += titleLines.length * 8 + 10;

    // Content
    if (note.content) {
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      const contentLines = pdf.splitTextToSize(note.content, maxWidth);

      contentLines.forEach((line: string) => {
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += 7;
      });
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
      note.checklist.forEach((item) => {
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        const checkbox = item.checked ? "☑" : "☐";
        pdf.text(`${checkbox} ${item.text}`, margin + 5, y);
        y += 7;
      });
      y += 10;
    }

    // Tags
    if (note.tags.length > 0) {
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "italic");
      const tagsText = note.tags.map((tag) => `#${tag}`).join(" ");
      const tagLines = pdf.splitTextToSize(tagsText, maxWidth);
      tagLines.forEach((line: string) => {
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += 7;
      });
    }
  }

  pdf.save("notes-export.pdf");
}

export function printNote(note: NotePayload): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${note.title || "Untitled Note"}</title>
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
        <h1>${note.title || "Untitled Note"}</h1>
        <div>${note.content.replace(/\n/g, "<br>")}</div>
        ${note.checklist.length > 0 ? `
          <div class="checklist">
            <h2>Checklist</h2>
            <ul>
              ${note.checklist.map(item => `<li>${item.checked ? "☑" : "☐"} ${item.text}</li>`).join("")}
            </ul>
          </div>
        ` : ""}
        ${note.tags.length > 0 ? `
          <div class="tags">
            ${note.tags.map(tag => `<span>#${tag}</span>`).join(" ")}
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

