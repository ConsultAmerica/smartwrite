import type { DocumentMeta } from "../types";

const META_KEY = "smartwrite-doc-meta";

type MetaMap = Record<string, DocumentMeta>;

function loadMap(): MetaMap {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as MetaMap) : {};
  } catch {
    return {};
  }
}

function saveMap(map: MetaMap): void {
  localStorage.setItem(META_KEY, JSON.stringify(map));
}

export function metaKeyFor(doc: { id: number; local_id?: string }): string {
  return doc.local_id ?? `id-${doc.id}`;
}

export function getDocumentMeta(doc: { id: number; local_id?: string }): DocumentMeta {
  return loadMap()[metaKeyFor(doc)] ?? {};
}

export function patchDocumentMeta(
  doc: { id: number; local_id?: string },
  patch: Partial<DocumentMeta>
): DocumentMeta {
  const map = loadMap();
  const key = metaKeyFor(doc);
  const next = { ...map[key], ...patch };
  map[key] = next;
  saveMap(map);
  return next;
}

export function clearDocumentMeta(doc: { id: number; local_id?: string }): void {
  const map = loadMap();
  delete map[metaKeyFor(doc)];
  saveMap(map);
}

export function applyMetaToDocuments<T extends { id: number; local_id?: string }>(
  documents: T[]
): Array<T & DocumentMeta> {
  const map = loadMap();
  return documents.map((doc) => {
    const meta = map[metaKeyFor(doc)] ?? {};
    return { ...doc, ...meta };
  });
}
