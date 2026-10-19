/**
 * File → plain text. Kept free of Next.js imports so it can be unit tested.
 * Line breaks matter: the resume parser relies on them to find sections and date ranges.
 */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_TEXT_CHARS = 60000;

export class UserFacingError extends Error {}

async function pdfToText(data: Uint8Array): Promise<string> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(data);
  let out = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    for (const item of content.items) {
      if (!("str" in item)) continue;
      // A change in vertical position means a new line, even when the PDF doesn't mark one.
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2 && !out.endsWith("\n")) out += "\n";
      out += item.str;
      if (item.hasEOL) out += "\n";
      lastY = y;
    }
    out += "\n";
  }
  return out;
}

export async function bufferToText(fileName: string, mimeType: string, buffer: Buffer): Promise<string> {
  if (buffer.byteLength > MAX_UPLOAD_BYTES) throw new UserFacingError("File is larger than 4 MB.");
  const name = fileName.toLowerCase();

  let text: string;
  if (name.endsWith(".pdf") || mimeType === "application/pdf") {
    text = await pdfToText(new Uint8Array(buffer));
  } else if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    text = (await mammoth.extractRawText({ buffer })).value;
  } else if (name.endsWith(".txt") || name.endsWith(".md") || mimeType.startsWith("text/")) {
    text = buffer.toString("utf8");
  } else {
    throw new UserFacingError("Upload a PDF, DOCX or TXT file, or paste the text instead.");
  }

  text = normalize(text);
  if (text.length < 20) {
    throw new UserFacingError("Couldn't read any text from that file. If it's a scanned PDF, paste the text instead.");
  }
  return text;
}

export function normalize(text: string): string {
  return text
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_CHARS);
}
