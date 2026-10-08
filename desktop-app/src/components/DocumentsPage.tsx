import { useEffect, useMemo, useRef, useState } from "react";
import type { Document } from "../types";
import {
  documentDisplayTitle,
  documentRowMeta,
  filterAndSortDocuments,
  titleCounts,
  type DocumentSort,
  type DocumentTypeFilter,
} from "../utils/documentList";
import { sanitizeDocumentTitle } from "../utils/title";
import "./DocumentsPage.css";

interface Props {
  documents: Document[];
  onNew: () => void;
  onOpen: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onRename?: (doc: Document, title: string) => void;
  onDuplicate?: (doc: Document) => void;
  onToggleFavorite?: (doc: Document) => void;
  onMoveToTrash?: (doc: Document) => void;
  onRestore?: (doc: Document) => void;
  onDeleteForever?: (doc: Document) => void;
}

const FILTERS: { id: DocumentTypeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recent" },
  { id: "favorites", label: "Favorites" },
  { id: "trash", label: "Trash" },
];

const SORTS: { id: DocumentSort; label: string }[] = [
  { id: "newest", label: "Last edited" },
  { id: "oldest", label: "Oldest" },
  { id: "title", label: "Title" },
  { id: "words", label: "Word count" },
];

export default function DocumentsPage({
  documents,
  onNew,
  onOpen,
  onDelete,
  onRename,
  onDuplicate,
  onToggleFavorite,
  onMoveToTrash,
  onRestore,
  onDeleteForever,
}: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<DocumentTypeFilter>("all");
  const [sort, setSort] = useState<DocumentSort>("newest");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMenuId(null);
      }
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuId]);

  useEffect(() => {
    if (editingKey) editRef.current?.focus();
  }, [editingKey]);

  const filtered = useMemo(
    () => filterAndSortDocuments(documents, { query: debouncedQuery, filter, sort }),
    [documents, debouncedQuery, filter, sort]
  );

  const counts = useMemo(() => titleCounts(documents), [documents]);
  const inTrash = filter === "trash";
  const activeDocs = documents.filter((d) => !d.trashed);

  const beginRename = (doc: Document, key: string) => {
    setEditingKey(key);
    setEditValue(sanitizeDocumentTitle(doc.title));
    setMenuId(null);
  };

  const commitRename = (doc: Document) => {
    if (editValue.trim() && onRename) onRename(doc, editValue.trim());
    setEditingKey(null);
  };

  return (
    <div className="documents-page">
      <div className="documents-page-inner">
        <header className="documents-page-head">
          <div>
            <h1>Documents</h1>
            <p>Find, organize, and continue your writing.</p>
          </div>
          <div className="documents-page-head-actions">
            <input
              className="documents-page-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents…"
              aria-label="Search documents"
            />
            <button type="button" className="documents-page-new" onClick={onNew}>
              + New document
            </button>
          </div>
        </header>

        <div className="documents-page-controls">
          <div className="documents-page-filters" role="tablist" aria-label="Document filters">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={filter === item.id ? "active" : ""}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="documents-page-sort">
            <span>Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as DocumentSort)}
              aria-label="Sort documents"
            >
              {SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className="documents-page-empty">
            <strong>
              {inTrash
                ? "Trash is empty"
                : activeDocs.length === 0
                  ? "No documents yet"
                  : "No documents found"}
            </strong>
            <p>
              {inTrash
                ? "Trashed documents will appear here."
                : activeDocs.length === 0
                  ? "Create your first document to start writing."
                  : "Try another search term."}
            </p>
            {!inTrash && activeDocs.length === 0 && (
              <button type="button" onClick={onNew}>
                + New document
              </button>
            )}
          </div>
        ) : (
          <div className="documents-table-wrap">
            <div className="documents-table-head" aria-hidden="true">
              <span>Name</span>
              <span>Type</span>
              <span>Updated</span>
              <span>Words</span>
              <span />
            </div>
            <ul className="documents-page-list">
              {filtered.map((doc) => {
                const key = `${doc.id}-${doc.local_id ?? ""}`;
                const displayTitle = documentDisplayTitle(doc, counts);
                const meta = documentRowMeta(doc);
                const renaming = editingKey === key;
                return (
                  <li key={key} className={doc.favorite ? "favorite" : ""}>
                    <button
                      type="button"
                      className="documents-page-row"
                      onClick={() => {
                        if (!renaming && !inTrash) onOpen(doc);
                      }}
                    >
                      <span className="documents-page-name">
                        <img src="/images/doc-thumb.svg" alt="" width={28} height={28} />
                        {renaming ? (
                          <input
                            ref={editRef}
                            className="documents-page-rename"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitRename(doc);
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                setEditingKey(null);
                              }
                            }}
                            onBlur={() => commitRename(doc)}
                            aria-label="Rename document"
                          />
                        ) : (
                          <strong>
                            {displayTitle}
                            {doc.favorite ? <span className="fav-mark" aria-label="Favorite">★</span> : null}
                          </strong>
                        )}
                      </span>
                      <span className="documents-page-type">{meta.typeLabel}</span>
                      <span className="documents-page-updated">{meta.edited}</span>
                      <span className="documents-page-words">{meta.words}</span>
                    </button>
                    <div className="documents-page-menu-wrap">
                      <button
                        type="button"
                        className="documents-page-more"
                        aria-label={`More actions for ${displayTitle}`}
                        aria-expanded={menuId === key}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuId(menuId === key ? null : key);
                        }}
                      >
                        ···
                      </button>
                      {menuId === key && (
                        <div
                          className="documents-page-menu"
                          role="menu"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {inTrash ? (
                            <>
                              {onRestore && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    onRestore(doc);
                                    setMenuId(null);
                                  }}
                                >
                                  Restore
                                </button>
                              )}
                              <button
                                type="button"
                                role="menuitem"
                                className="danger"
                                onClick={() => {
                                  (onDeleteForever ?? onDelete)(doc);
                                  setMenuId(null);
                                }}
                              >
                                Delete permanently
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  onOpen(doc);
                                  setMenuId(null);
                                }}
                              >
                                Open
                              </button>
                              {onRename && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => beginRename(doc, key)}
                                >
                                  Rename
                                </button>
                              )}
                              {onDuplicate && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    onDuplicate(doc);
                                    setMenuId(null);
                                  }}
                                >
                                  Duplicate
                                </button>
                              )}
                              {onToggleFavorite && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    onToggleFavorite(doc);
                                    setMenuId(null);
                                  }}
                                >
                                  {doc.favorite ? "Remove from favorites" : "Add to favorites"}
                                </button>
                              )}
                              <button
                                type="button"
                                role="menuitem"
                                className="danger"
                                onClick={() => {
                                  (onMoveToTrash ?? onDelete)(doc);
                                  setMenuId(null);
                                }}
                              >
                                Move to trash
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
