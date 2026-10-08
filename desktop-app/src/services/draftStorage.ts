import type { Document } from "../types";
import { sanitizeDocumentTitle } from "../utils/title";
import {
  commitRevisionIfNewer,
  pruneRecoveryAfterConfirm,
  writeRecoverySnapshot,
} from "./documentSession";

const DRAFTS_KEY = "smartwrite-drafts";
const ACTIVE_KEY = "smartwrite-active-draft-id";

export interface LocalDraft {
  id: string;
  title: string;
  content: string;
  updated_at: string;
  server_id?: number;
  revision?: number;
}

function loadAll(): LocalDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const drafts = (parsed as LocalDraft[]).map((d) => ({
      ...d,
      title: sanitizeDocumentTitle(d.title),
    }));
    const changed = drafts.some((d, i) => d.title !== (parsed as LocalDraft[])[i]?.title);
    if (changed) saveAll(drafts);
    return drafts;
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
  localId?: string | null,
  revision?: number
): LocalDraft {
  const drafts = loadAll();
  const now = new Date().toISOString();
  const id = localId ?? (serverId ? `server-${serverId}` : `local-${Date.now()}`);

  const existing = drafts.findIndex((d) => d.id === id);
  if (existing >= 0 && revision != null) {
    const prevRev = drafts[existing].revision ?? 0;
    if (revision < prevRev) {
      // Stale save — keep newer draft, do not overwrite
      return drafts[existing];
    }
    if (!commitRevisionIfNewer(id, revision)) {
      return drafts[existing];
    }
  } else if (revision != null) {
    commitRevisionIfNewer(id, revision);
  }

  const draft: LocalDraft = {
    id,
    title: sanitizeDocumentTitle(title),
    content,
    updated_at: now,
    server_id: serverId ?? undefined,
    revision,
  };

  if (existing >= 0) drafts[existing] = draft;
  else drafts.unshift(draft);

  saveAll(drafts);
  localStorage.setItem(ACTIVE_KEY, id);
  const rev = revision ?? draft.revision ?? 0;
  // Emergency buffer only — canonical state is the draft list above.
  writeRecoverySnapshot({
    localId: id,
    title: draft.title,
    content: draft.content,
    revision: rev,
    updatedAt: now,
    serverId: draft.server_id,
  });
  return draft;
}

/** Call after server ack so emergency snapshots cannot resurrect older text. */
export function confirmServerRevision(localId: string, revision: number): void {
  commitRevisionIfNewer(localId, revision);
  pruneRecoveryAfterConfirm(localId, revision);
}

export function localDraftsAsDocuments(): Document[] {
  return loadAll().map((d) => ({
    id: d.server_id ?? -Math.abs(d.id.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)),
    title: sanitizeDocumentTitle(d.title),
    content: d.content,
    created_at: d.updated_at,
    updated_at: d.updated_at,
    local_id: d.id,
  }));
}

export function deleteLocalDraft(localId: string): void {
  saveAll(loadAll().filter((draft) => draft.id !== localId));
}

export function cleanupJunkDraftTitles(): void {
  const drafts = loadAll();
  saveAll(drafts.map((d) => ({ ...d, title: sanitizeDocumentTitle(d.title) })));
}

export function getActiveDraftId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function getLocalDraft(localId: string): LocalDraft | null {
  return loadAll().find((d) => d.id === localId) ?? null;
}
