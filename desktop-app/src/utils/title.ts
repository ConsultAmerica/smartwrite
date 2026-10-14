/** Titles that look like garbage / system noise — never show these to users. */
const JUNK_TITLE =
  /^(via\s*proxy|proxy|null|undefined|nan|test|asdf|xxx+|lorem\s*ipsum)$/i;

/** RC / smoke / CI docs — hide from Recent for beta users. */
const SYSTEM_DOC_TITLE =
  /^(RC\d+\b|.*\bsmoke\b|\b(qa|ci|e2e|debug|fixture)\b)/i;
const ISO_STAMP_IN_TITLE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export function isSystemOrTestDocumentTitle(
  title: string | null | undefined
): boolean {
  const cleaned = (title ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return false;
  if (SYSTEM_DOC_TITLE.test(cleaned)) return true;
  if (ISO_STAMP_IN_TITLE.test(cleaned)) return true;
  return false;
}

export function sanitizeDocumentTitle(title: string | null | undefined): string {
  const cleaned = (title ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "Untitled";
  if (JUNK_TITLE.test(cleaned)) return "Untitled";
  if (/via\s*proxy/i.test(cleaned)) return "Untitled";
  // Strip accidental control / zero-width characters
  const printable = cleaned.replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, "");
  return printable.trim() || "Untitled";
}

/** Prefer first content line when the title is still a placeholder. */
export function titleFromContent(content: string, currentTitle?: string): string {
  const current = sanitizeDocumentTitle(currentTitle);
  if (current !== "Untitled" && current !== "Untitled Document") return current;
  const firstLine = content
    .split(/\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return "Untitled";
  const snippet = firstLine.replace(/\s+/g, " ").slice(0, 48);
  return sanitizeDocumentTitle(snippet.endsWith(".") ? snippet.slice(0, -1) : snippet);
}
