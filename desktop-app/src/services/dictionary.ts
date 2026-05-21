const STORAGE_KEY = "smartwrite-user-dictionary";

export function loadUserDictionary(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  } catch {
    return [];
  }
}

export function saveUserDictionary(terms: string[]): void {
  const unique = [...new Set(terms.map((t) => t.trim()).filter(Boolean))];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
}

export function addToUserDictionary(term: string): string[] {
  const next = [...new Set([...loadUserDictionary(), term.trim()])].filter(Boolean);
  saveUserDictionary(next);
  return next;
}

/** True if this issue's flagged text is covered by the user dictionary. */
export function isIssueDictionarySuppressed(
  issue: { problem: string; offset: number; length: number },
  terms: string[]
): boolean {
  const problem = issue.problem.trim().toLowerCase();
  if (!problem || problem === "(end of sentence)" || problem === "(issue)") {
    return false;
  }
  const lowerTerms = terms.map((t) => t.toLowerCase());
  if (lowerTerms.includes(problem)) return true;
  return lowerTerms.some((t) => t.includes(problem) || problem.includes(t));
}
