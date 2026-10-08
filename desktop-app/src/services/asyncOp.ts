/** Correlation metadata attached to autosave, analysis, and rewrite. */

export interface AsyncOpMeta {
  documentKey: string;
  clientRevision: number;
  requestId: string;
  startedAt: number;
}

export function createAsyncOpMeta(
  documentKey: string,
  clientRevision: number
): AsyncOpMeta {
  return {
    documentKey,
    clientRevision,
    requestId: `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.now(),
  };
}

/** True if this response still belongs to the active document/revision race window. */
export function isAsyncOpCurrent(
  meta: AsyncOpMeta,
  current: { documentKey: string; clientRevision: number }
): boolean {
  if (meta.documentKey !== current.documentKey) return false;
  // Allow applying when revision hasn't moved past this op's revision for reads;
  // for saves, caller compares with committed revision separately.
  return meta.clientRevision <= current.clientRevision;
}
