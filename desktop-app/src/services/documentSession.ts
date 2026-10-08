/**
 * Client-side document revision + emergency recovery snapshots.
 * Drafts are canonical; recovery is crash-only and pruned after confirmed saves.
 */

import { sanitizeDocumentTitle } from "../utils/title";

const REVISION_KEY = "smartwrite-doc-revisions";
const RECOVERY_KEY = "smartwrite-recovery";
const COMMITTED_KEY = "smartwrite-committed-revisions";

type RevMap = Record<string, number>;

function loadMap(key: string): RevMap {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as RevMap) : {};
  } catch {
    return {};
  }
}

function saveMap(key: string, map: RevMap): void {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

export function nextRevision(localId: string): number {
  const map = loadMap(REVISION_KEY);
  const next = (map[localId] ?? 0) + 1;
  map[localId] = next;
  saveMap(REVISION_KEY, map);
  return next;
}

export function peekRevision(localId: string): number {
  return loadMap(REVISION_KEY)[localId] ?? 0;
}

export function getCommittedRevision(localId: string): number {
  return loadMap(COMMITTED_KEY)[localId] ?? 0;
}

/** Returns true if this save should be applied (not stale). */
export function commitRevisionIfNewer(localId: string, revision: number): boolean {
  const map = loadMap(COMMITTED_KEY);
  const current = map[localId] ?? 0;
  if (revision < current) return false;
  map[localId] = revision;
  saveMap(COMMITTED_KEY, map);
  return true;
}

export interface RecoverySnapshot {
  localId: string;
  title: string;
  content: string;
  revision: number;
  updatedAt: string;
  serverId?: number | null;
  /** Emergency-only marker — never treat as canonical store. */
  emergency?: true;
}

function loadRecoveryMap(): Record<string, RecoverySnapshot> {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, RecoverySnapshot>)
      : {};
  } catch {
    return {};
  }
}

function saveRecoveryMap(map: Record<string, RecoverySnapshot>): void {
  try {
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Emergency crash buffer only — drafts remain the canonical store. */
export function writeRecoverySnapshot(snapshot: Omit<RecoverySnapshot, "emergency">): void {
  const map = loadRecoveryMap();
  map[snapshot.localId] = {
    ...snapshot,
    title: sanitizeDocumentTitle(snapshot.title),
    emergency: true,
  };
  saveRecoveryMap(map);
}

export function readRecoverySnapshot(localId: string): RecoverySnapshot | null {
  return loadRecoveryMap()[localId] ?? null;
}

export function clearRecoverySnapshot(localId: string): void {
  const map = loadRecoveryMap();
  delete map[localId];
  saveRecoveryMap(map);
}

/**
 * After a confirmed save (especially server-acked), drop emergency snapshots
 * at or below that revision so older text cannot be resurrected later.
 */
export function pruneRecoveryAfterConfirm(localId: string, confirmedRevision: number): void {
  const snap = readRecoverySnapshot(localId);
  if (!snap) return;
  if (snap.revision <= confirmedRevision) {
    clearRecoverySnapshot(localId);
  }
}

/**
 * Restore emergency snapshot only when it is strictly newer than the canonical draft.
 * Otherwise prune so stale recovery cannot overwrite good state.
 */
export function restoreRecoveryIfNewer(
  localId: string,
  draftRevision: number
): RecoverySnapshot | null {
  const snap = readRecoverySnapshot(localId);
  if (!snap) return null;
  if (snap.revision > draftRevision) return snap;
  clearRecoverySnapshot(localId);
  return null;
}

export interface RewriteScope {
  requestId: string;
  documentKey: string;
  revision: number;
  start: number;
  end: number;
  sourceText: string;
  startedAt?: number;
}

export function scopesMatch(
  scope: RewriteScope,
  current: {
    documentKey: string;
    revision: number;
    text: string;
  }
): boolean {
  if (scope.documentKey !== current.documentKey) return false;
  if (scope.revision !== current.revision) return false;
  if (scope.end > current.text.length || scope.start > scope.end) return false;
  return current.text.slice(scope.start, scope.end) === scope.sourceText;
}
