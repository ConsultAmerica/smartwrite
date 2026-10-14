import type { Document } from "../types";
import {
  formatRelativeTime,
  formatWordCount,
  getTextStats,
  inferDocumentTypeLabel,
} from "./textStats";
import { isSystemOrTestDocumentTitle, sanitizeDocumentTitle } from "./title";

export function titleCounts(documents: Document[]): Record<string, number> {
  return documents.reduce<Record<string, number>>((acc, doc) => {
    const title = sanitizeDocumentTitle(doc.title);
    acc[title] = (acc[title] ?? 0) + 1;
    return acc;
  }, {});
}

/** Recent lists for home/sidebar — exclude smoke/RC/CI noise. */
export function userFacingDocuments(documents: Document[]): Document[] {
  return documents.filter((doc) => !isSystemOrTestDocumentTitle(doc.title));
}

/** Strip trailing date stamps that duplicate the meta line under the title. */
const TRAILING_DATE =
  /\s*[·•|–-]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?)\s*$/i;

export function documentDisplayTitle(
  doc: Document,
  _counts?: Record<string, number>
): string {
  const title = sanitizeDocumentTitle(doc.title).replace(TRAILING_DATE, "").trim();
  return title || "Untitled";
}

export function documentRowMeta(doc: Document): {
  typeLabel: string;
  edited: string;
  words: string;
  metaLine: string;
} {
  const title = sanitizeDocumentTitle(doc.title);
  const typeLabel = inferDocumentTypeLabel(title, doc.content) ?? "General";
  const edited = formatRelativeTime(doc.updated_at).replace(/^Updated\s+/i, "");
  const words = formatWordCount(getTextStats(doc.content).words);
  const metaLine = [edited, typeLabel].filter(Boolean).join(" · ");
  return { typeLabel, edited, words, metaLine };
}

export type DocumentSort = "newest" | "oldest" | "title" | "words";
export type DocumentTypeFilter =
  | "all"
  | "recent"
  | "favorites"
  | "trash"
  | "email"
  | "business"
  | "career"
  | "academic";

function allowSystemDocuments(): boolean {
  try {
    return (
      Boolean(import.meta.env.DEV) &&
      typeof localStorage !== "undefined" &&
      localStorage.getItem("smartwrite-show-system-docs") === "1"
    );
  } catch {
    return false;
  }
}

export function filterAndSortDocuments(
  documents: Document[],
  options: {
    query: string;
    filter: DocumentTypeFilter;
    sort: DocumentSort;
  }
): Document[] {
  const q = options.query.trim().toLowerCase();
  let list = allowSystemDocuments() ? [...documents] : userFacingDocuments(documents);

  if (options.filter === "trash") {
    list = list.filter((doc) => doc.trashed);
  } else {
    list = list.filter((doc) => !doc.trashed);
    if (options.filter === "recent") {
      list = list
        .slice()
        .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
        .slice(0, 12);
    } else if (options.filter === "favorites") {
      list = list.filter((doc) => doc.favorite);
    } else if (options.filter !== "all") {
      list = list.filter((doc) => {
        const title = sanitizeDocumentTitle(doc.title);
        const type = (inferDocumentTypeLabel(title, doc.content) ?? "General").toLowerCase();
        return type === options.filter;
      });
    }
  }

  if (q) {
    list = list.filter((doc) => {
      const title = sanitizeDocumentTitle(doc.title).toLowerCase();
      const type = (inferDocumentTypeLabel(title, doc.content) ?? "").toLowerCase();
      const content = doc.content.slice(0, 400).toLowerCase();
      return title.includes(q) || type.includes(q) || content.includes(q);
    });
  }

  switch (options.sort) {
    case "oldest":
      list.sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at));
      break;
    case "title":
      list.sort((a, b) =>
        sanitizeDocumentTitle(a.title).localeCompare(sanitizeDocumentTitle(b.title))
      );
      break;
    case "words":
      list.sort(
        (a, b) => getTextStats(b.content).words - getTextStats(a.content).words
      );
      break;
    case "newest":
    default:
      list.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
      break;
  }

  return list;
}
