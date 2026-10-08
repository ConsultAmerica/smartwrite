export interface TextStats {
  words: number;
  characters: number;
  sentences: number;
  readingMinutes: number;
  readingLabel: string;
  readingTime: string;
}

export function getTextStats(text: string): TextStats {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const characters = text.length;
  const sentences = trimmed
    ? Math.max(1, trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0).length)
    : 0;
  const readingMinutes = words / 200;
  const readingLabel =
    readingMinutes < 1 ? "<1 min" : `${Math.max(1, Math.round(readingMinutes))} min`;

  return {
    words,
    characters,
    sentences,
    readingMinutes,
    readingLabel,
    readingTime: readingLabel,
  };
}

export function formatWordCount(words: number): string {
  return `${words} ${words === 1 ? "word" : "words"}`;
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `Updated ${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Updated ${hr} hr ago`;
  const days = Math.floor(hr / 24);
  return `Updated ${days} day${days > 1 ? "s" : ""} ago`;
}

/** Short calendar date for distinguishing similarly titled documents. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Infer a light document-type label from title/content for list disambiguation. */
export function inferDocumentTypeLabel(title: string, content: string): string | null {
  const t = title.toLowerCase();
  const c = content.slice(0, 400).toLowerCase();
  if (/email|follow.?up|dear\s|hiring manager/.test(t) || /\b(hello|dear|best regards|sincerely)\b/.test(c)) {
    return "Email";
  }
  if (/resume|linkedin|summary/.test(t) || /\b(results-driven|years of experience)\b/.test(c)) {
    return "Career";
  }
  if (/academic|essay|study|paragraph/.test(t) || /\b(this study|findings suggest|undergraduate)\b/.test(c)) {
    return "Academic";
  }
  if (/proposal|business|support/.test(t) || /\b(we propose|phased|operational)\b/.test(c)) {
    return "Business";
  }
  if (/patient|healthcare|clinic/.test(t) || /\b(care team|lab results|appointment)\b/.test(c)) {
    return "Healthcare";
  }
  return null;
}

export function adjustIssuesAfterEdit<T extends { offset: number; length: number; id: string }>(
  issues: T[],
  editOffset: number,
  removedLen: number,
  insertedLen: number
): T[] {
  const delta = insertedLen - removedLen;
  return issues
    .filter((i) => {
      const end = i.offset + i.length;
      return !(editOffset >= i.offset && editOffset < end);
    })
    .map((i) => (i.offset > editOffset ? { ...i, offset: i.offset + delta } : i));
}
