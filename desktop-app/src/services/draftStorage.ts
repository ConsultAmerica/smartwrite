import type { Document } from "../types";

const DRAFTS_KEY = "smartwrite-drafts";
const ACTIVE_KEY = "smartwrite-active-draft-id";

export interface LocalDraft {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  server_id?: number;
}

function loadAll(): LocalDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LocalDraft[]) : [];
  } catch {
    return [];
  }
}

function saveAll(drafts: LocalDraft[]): void {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

export function saveLocalDraft(
  title: string,
  content: string,
  serverId?: number | null,
  localId?: string | null
): LocalDraft {
  const drafts = loadAll();
  const now = new Date().toISOString();
  const id = localId ?? (serverId ? `server-${serverId}` : `local-${Date.now()}`);

  const existing = drafts.findIndex((d) => d.id === id);
  const draft: LocalDraft = {
    id,
    title: title.trim() || "Untitled Document",
    content,
    updated_at: now,
    server_id: serverId ?? undefined,
  };

  if (existing >= 0) drafts[existing] = draft;
  else drafts.unshift(draft);

  saveAll(drafts);
  localStorage.setItem(ACTIVE_KEY, id);
  return draft;
}

export function localDraftsAsDocuments(): Document[] {
  return loadAll().map((d) => ({
    id: d.server_id ?? -Math.abs(d.id.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)),
    title: d.title,
    content: d.content,
    created_at: d.updated_at,
    updated_at: d.updated_at,
  }));
}
