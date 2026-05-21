import type {
  Document,
  GrammarCheckResult,
  ToneResult,
  ToneMode,
} from "../types";
import { normalizeClaritySuggestions, normalizeIssues } from "./normalize";

function resolveApiBase(): string {
  const envBase = import.meta.env.VITE_API_BASE?.trim();
  if (envBase) return envBase.replace(/\/$/, "");

  if (typeof window === "undefined") return "http://127.0.0.1:8002";
  const electronUrl = (window as Window & { smartwrite?: { apiBaseUrl: string } }).smartwrite
    ?.apiBaseUrl;
  if (electronUrl) return electronUrl;
  // Vite dev proxy: same origin; production bundle served from API on :8002
  if (import.meta.env.DEV) return "";
  if (window.location.port === "8002" || window.location.port === "") {
    return window.location.origin;
  }
  return "http://127.0.0.1:8002";
}

const API_BASE = resolveApiBase();

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function checkGrammar(
  text: string,
  documentId?: number | null,
  userDictionary?: string[]
): Promise<GrammarCheckResult> {
  const raw = await post<GrammarCheckResult & { issues?: unknown[] }>(
    "/check-grammar",
    {
      text,
      document_id: documentId ?? null,
      user_dictionary: userDictionary ?? [],
    }
  );
  return {
    ...raw,
    issues: normalizeIssues(raw.issues ?? [], text),
    clarity_score: Number(raw.clarity_score ?? 100),
    clarity_suggestions: normalizeClaritySuggestions(raw.clarity_suggestions ?? []),
  };
}

export function buildWritingSummary(issueCount: number, grammarScore: number): string {
  if (issueCount === 0) {
    return "Writing looks clean — keep going!";
  }
  return `${issueCount} issue${issueCount === 1 ? "" : "s"} to fix. Grammar score: ${grammarScore}%.`;
}

export function grammarResultToTone(
  result: GrammarCheckResult,
  toneLabel = "Neutral",
  visibleIssueCount?: number
): ToneResult {
  const count = visibleIssueCount ?? result.issue_count;
  return {
    tone: toneLabel,
    clarity_score: result.clarity_score,
    grammar_score: result.grammar_score,
    suggestion_count: count,
    clarity_suggestions: result.clarity_suggestions,
    summary: buildWritingSummary(count, result.grammar_score),
  };
}

export async function detectTone(
  text: string,
  userDictionary?: string[]
): Promise<ToneResult> {
  const raw = await post<ToneResult & { clarity_suggestions?: unknown[] }>("/detect-tone", {
    text,
    user_dictionary: userDictionary ?? [],
  });
  const issueCount = Number(raw.suggestion_count ?? 0);
  const grammarScore = Number(raw.grammar_score ?? 100);
  return {
    ...raw,
    clarity_suggestions: normalizeClaritySuggestions(raw.clarity_suggestions ?? []),
    summary: buildWritingSummary(issueCount, grammarScore),
  };
}

export async function rewrite(
  text: string,
  mode: ToneMode,
  documentId?: number | null
): Promise<{ rewritten_text: string; mode: string; source: string }> {
  return post("/rewrite", { text, mode, document_id: documentId ?? null });
}

export async function improveResume(
  text: string,
  action: string = "bullet",
  documentId?: number | null
): Promise<{ rewritten_text: string }> {
  return post("/improve-resume-bullet", {
    text,
    action,
    document_id: documentId ?? null,
  });
}

export async function improveEmail(
  text: string,
  action: string,
  documentId?: number | null
): Promise<{ rewritten_text: string }> {
  return post("/improve-email", { text, action, document_id: documentId ?? null });
}

export async function improveHealthcare(
  text: string,
  action: string,
  documentId?: number | null
): Promise<{ rewritten_text: string }> {
  return post("/improve-healthcare", { text, action, document_id: documentId ?? null });
}

export async function listDocuments(): Promise<{ documents: Document[] }> {
  return get("/documents");
}

export async function seedSampleDocuments(): Promise<{ documents: Document[] }> {
  return post("/documents/seed-samples", {});
}

export async function saveDocument(
  title: string,
  content: string,
  id?: number | null
): Promise<Document> {
  return post("/documents", { title, content, id: id ?? null });
}

export async function deleteDocument(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Delete failed");
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return false;
    const data = (await res.json()) as { api?: string };
    return data.api === "backend-v1";
  } catch {
    return false;
  }
}
