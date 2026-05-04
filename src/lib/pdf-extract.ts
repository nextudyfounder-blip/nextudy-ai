// Browser-only PDF text extraction using pdfjs-dist
import * as pdfjsLib from "pdfjs-dist";
// @ts-expect-error - vite worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerPort = new PdfWorker();
}

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  const maxPages = Math.min(pdf.numPages, 50);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it: unknown) => (it as { str?: string }).str ?? "")
      .join(" ");
    parts.push(pageText);
  }
  return parts.join("\n\n").trim();
}
