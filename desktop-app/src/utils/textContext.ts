/** Pull 1–2 whole words on either side of an offset (for whitespace diffs). */
export function nearbyWords(
  text: string,
  offset: number,
  length: number,
  side: "before" | "after",
  count = 2
): string {
  if (!text) return "";
  if (side === "before") {
    const slice = text.slice(0, Math.max(0, offset)).replace(/\s+/g, " ").trimEnd();
    if (!slice) return "";
    return slice.split(" ").filter(Boolean).slice(-count).join(" ");
  }
  const slice = text
    .slice(Math.max(0, offset + length))
    .replace(/\s+/g, " ")
    .trimStart();
  if (!slice) return "";
  return slice.split(" ").filter(Boolean).slice(0, count).join(" ");
}
