export interface TextStats {
  words: number;
  sentences: number;
  readingMinutes: number;
  readingLabel: string;
}

export function getTextStats(text: string): TextStats {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const sentences = trimmed
    ? Math.max(1, trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0).length)
    : 0;
  const readingMinutes = words / 200;
  const readingLabel =
    readingMinutes < 1 ? "<1 min" : `${Math.max(1, Math.round(readingMinutes))} min`;

  return { words, sentences, readingMinutes, readingLabel };
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
