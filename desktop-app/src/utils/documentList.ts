import type { Document } from "../types";
import {
  formatRelativeTime,
  formatShortDate,
  formatWordCount,
  getTextStats,
  inferDocumentTypeLabel,
} from "./textStats";
import { sanitizeDocumentTitle } from "./title";

export function titleCounts(documents: Document[]): Record<string, number> {
  return documents.reduce<Record<string, number>>((acc, doc) => {
    const title = sanitizeDocumentTitle(doc.title);
    acc[title] = (acc[title] ?? 0) + 1;
    return acc;
  }, {});
}

export function documentDisplayTitle(
  doc: Document,
  counts: Record<string, number>
): string {
  const title = sanitizeDocumentTitle(doc.title);
  if ((counts[title] ?? 0) <= 1) return title;
  const date = formatShortDate(doc.updated_at);
  return date ? `${title} · ${date}` : title;
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

export function filterAndSortDocuments(
  documents: Document[],
  options: {
    query: string;
    filter: DocumentTypeFilter;
    sort: DocumentSort;
  }
): Document[] {
  const q = options.query.trim().toLowerCase();
  let list = [...documents];

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
