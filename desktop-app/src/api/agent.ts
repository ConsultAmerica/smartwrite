import type { AgentResponse, AgentType } from "../types";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "";

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = API_BASE ? `${API_BASE.replace(/\/$/, "")}${path}` : path;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Agent request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export async function runAgent(
  type: AgentType,
  text: string,
  options: Record<string, unknown> = {},
  documentId?: number | null
): Promise<AgentResponse> {
  if (!text.trim()) {
    throw new Error("Add some text before running an agent.");
  }
  return post<AgentResponse>("/agent", {
    text,
    agent: type,
    options,
    document_id: documentId ?? null,
  });
}

export function agentRewriteText(response: AgentResponse): string | null {
  const rewrite = response.result?.rewrite;
  return typeof rewrite === "string" && rewrite.trim() ? rewrite : null;
}
