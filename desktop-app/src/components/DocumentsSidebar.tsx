import { useMemo } from "react";
import type { Document } from "../types";
import {
  documentDisplayTitle,
  documentRowMeta,
  userFacingDocuments,
} from "../utils/documentList";
import Logo from "./Logo";
import { IconDocs, IconHome, IconTemplates } from "./icons";
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
  const facing = useMemo(() => userFacingDocuments(documents), [documents]);
  const recent = facing.slice(0, 5);

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
            if (collapsed) {
              onCollapse?.();
              return;
            }
            onNavigate?.("home");
            onClose();
          }}
          aria-label={collapsed ? "Expand sidebar" : "Go to home"}
          title={collapsed ? "Expand sidebar" : "Home"}
        >
          <Logo size={36} showWordmark={!collapsed} />
        </button>
        <div className="docs-brand-actions">
          {onCollapse && (
            <button
              type="button"
              className="docs-collapse hide-mobile"
              onClick={onCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? "»" : "«"}
            </button>
          )}
          <button type="button" className="docs-close" onClick={onClose} aria-label="Close documents">
            ×
          </button>
        </div>
      </div>

      <button
        type="button"
        className="docs-create"
        onClick={onNew}
        title="New document"
        aria-label="New document"
      >
        <span aria-hidden="true">+</span>
        <span className="docs-create-label">New document</span>
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
          <IconHome className="docs-nav-icon" size={18} />
          <span className="docs-nav-label">Home</span>
        </button>
        <button
          type="button"
          className={`docs-nav-item${activeNav === "documents" ? " active" : ""}`}
          onClick={() => {
            onNavigate?.("documents");
            onClose();
          }}
        >
          <IconDocs className="docs-nav-icon" size={18} />
          <span className="docs-nav-label">Documents</span>
        </button>
        <button
          type="button"
          className={`docs-nav-item${activeNav === "templates" ? " active" : ""}`}
          onClick={() => {
            onNavigate?.("templates");
            onClose();
          }}
        >
          <IconTemplates className="docs-nav-icon" size={18} />
          <span className="docs-nav-label">Templates</span>
        </button>
      </nav>

      <div className="docs-section-head">
        <span className="docs-section-label">Recent</span>
        {facing.length > 0 && (
          <button
            type="button"
            className="docs-view-all"
            onClick={() => {
              onNavigate?.("documents");
              onClose();
            }}
          >
            View all <span aria-hidden="true">›</span>
          </button>
        )}
      </div>
      <ul className="docs-list">
        {recent.map((doc) => {
          const title = documentDisplayTitle(doc);
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
                <span className="doc-copy">
                  <span className="doc-title">{title}</span>
                  <span className="doc-date">{meta.edited}</span>
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
      {facing.length === 0 && (
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
