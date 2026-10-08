/** Titles that look like garbage / system noise — never show these to users. */
const JUNK_TITLE =
  /^(via\s*proxy|proxy|null|undefined|nan|test|asdf|xxx+|lorem\s*ipsum)$/i;

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
