import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { bufferToText } from "./extract-text";
import { analyze } from "./engine";

const NOW = new Date("2026-10-18T12:00:00Z");
const txt = fs.readFileSync("data/demo-resume.txt", "utf8");
const jd = "Requirements:\n- 5+ years\n- TypeScript\n- React\n- GraphQL\n- Kubernetes";

describe("file extraction", () => {
  it("keeps line breaks in PDFs so sections and dates are detected", async () => {
    const text = await bufferToText("resume.pdf", "application/pdf", fs.readFileSync("test-files/demo-resume.pdf"));
    expect(text.split("\n").length).toBeGreaterThan(20);
    expect(text).toMatch(/^EXPERIENCE$/m);
  });

  it("scores a PDF, a DOCX and the plain text the same", async () => {
    const pdf = await bufferToText("r.pdf", "application/pdf", fs.readFileSync("test-files/demo-resume.pdf"));
    const docx = await bufferToText("r.docx", "", fs.readFileSync("test-files/demo-resume.docx"));
    const expected = analyze(txt, jd, "", NOW).score;
    expect(analyze(pdf, jd, "", NOW).score).toBe(expected);
    expect(analyze(docx, jd, "", NOW).score).toBe(expected);
  });

  it("rejects unsupported file types with a readable message", async () => {
    await expect(bufferToText("photo.png", "image/png", Buffer.from("x"))).rejects.toThrow(/PDF, DOCX or TXT/);
  });
});
