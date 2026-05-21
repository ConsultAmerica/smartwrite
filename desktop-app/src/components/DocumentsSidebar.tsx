import type { Document } from "../types";
import { formatRelativeTime } from "../utils/textStats";
import "./DocumentsSidebar.css";

interface Props {
  documents: Document[];
  activeId: number | null;
  onSelect: (doc: Document) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}

export default function DocumentsSidebar({
  documents,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: Props) {
  return (
    <aside className="docs-sidebar">
      <div className="docs-header">
        <h3>Documents</h3>
        <button type="button" className="new-doc" onClick={onNew}>
          + New
        </button>
      </div>
      <ul className="docs-list">
        {documents.map((doc) => (
          <li key={doc.id} className={activeId === doc.id ? "active" : ""}>
            <button type="button" className="doc-item" onClick={() => onSelect(doc)}>
              <span className="doc-title">{doc.title}</span>
              <span className="doc-date">{formatRelativeTime(doc.updated_at)}</span>
            </button>
            <button
              type="button"
              className="doc-delete"
              title="Delete"
              onClick={() => onDelete(doc.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {documents.length === 0 && <p className="docs-empty">No saved drafts yet.</p>}
    </aside>
  );
}
