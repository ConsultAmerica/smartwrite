import { useMemo } from "react";
import type { Document } from "../types";
import {
  documentDisplayTitle,
  documentRowMeta,
  titleCounts,
} from "../utils/documentList";
import Logo from "./Logo";
import "./DocumentsSidebar.css";

export type SidebarNav = "home" | "documents" | "templates";

interface Props {
  documents: Document[];
  activeId: number | null;
  mobileOpen: boolean;
  collapsed?: boolean;
  activeNav?: SidebarNav;
  onSelect: (doc: Document) => void;
  onNew: () => void;
  onDelete: (doc: Document) => void;
  onClose: () => void;
  onCollapse?: () => void;
  onNavigate?: (nav: SidebarNav) => void;
}

export default function DocumentsSidebar({
  documents,
  activeId,
  mobileOpen,
  collapsed,
  activeNav = "documents",
  onSelect,
  onNew,
  onDelete,
  onClose,
  onCollapse,
  onNavigate,
}: Props) {
  const counts = useMemo(() => titleCounts(documents), [documents]);
  const recent = documents.slice(0, 10);

  return (
    <aside
      className={`docs-sidebar${mobileOpen ? " open" : ""}${collapsed ? " collapsed" : ""}`}
      aria-label="Documents"
    >
      <div className="docs-brand">
        <button
          type="button"
          className="docs-brand-btn"
          onClick={() => {
            onNavigate?.("home");
            onClose();
          }}
          aria-label="Go to home"
        >
          <Logo size={28} />
        </button>
        <div className="docs-brand-actions">
          {onCollapse && (
            <button
              type="button"
              className="docs-collapse hide-mobile"
              onClick={onCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              «
            </button>
          )}
          <button type="button" className="docs-close" onClick={onClose} aria-label="Close documents">
            ×
          </button>
        </div>
      </div>

      <button type="button" className="docs-create" onClick={onNew}>
        <span aria-hidden="true">+</span>
        New document
      </button>

      <nav className="docs-nav" aria-label="Workspace">
        <button
          type="button"
          className={`docs-nav-item${activeNav === "home" ? " active" : ""}`}
          onClick={() => {
            onNavigate?.("home");
            onClose();
          }}
        >
          <img className="docs-nav-icon" src="/images/nav-home.svg" alt="" width={18} height={18} />
          Home
        </button>
        <button
          type="button"
          className={`docs-nav-item${activeNav === "documents" ? " active" : ""}`}
          onClick={() => {
            onNavigate?.("documents");
            onClose();
          }}
        >
          <img className="docs-nav-icon" src="/images/nav-docs.svg" alt="" width={18} height={18} />
          Documents
        </button>
        <button
          type="button"
          className={`docs-nav-item${activeNav === "templates" ? " active" : ""}`}
          onClick={() => {
            onNavigate?.("templates");
            onClose();
          }}
        >
          <img className="docs-nav-icon" src="/images/nav-templates.svg" alt="" width={18} height={18} />
          Templates
        </button>
      </nav>

      <div className="docs-section-label">Recent</div>
      <ul className="docs-list">
        {recent.map((doc) => {
          const title = documentDisplayTitle(doc, counts);
          const meta = documentRowMeta(doc);
          return (
            <li key={`${doc.id}-${doc.local_id ?? ""}`} className={activeId === doc.id ? "active" : ""}>
              <button
                type="button"
                className="doc-item"
                onClick={() => {
                  onSelect(doc);
                  onClose();
                }}
                aria-current={activeId === doc.id ? "page" : undefined}
              >
                <img className="doc-thumb" src="/images/doc-thumb.svg" alt="" width={28} height={28} />
                <span className="doc-copy">
                  <span className="doc-title">{title}</span>
                  <span className="doc-date">{meta.metaLine}</span>
                </span>
              </button>
              <button
                type="button"
                className="doc-delete"
                title={`Delete ${title}`}
                aria-label={`Delete ${title}`}
                onClick={() => onDelete(doc)}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
      {documents.length === 0 && (
        <p className="docs-empty">Recent documents appear here.</p>
      )}

      <div className="docs-sidebar-footer">
        <button type="button" className="docs-settings" title="Settings" disabled>
          Settings
        </button>
      </div>
    </aside>
  );
}
