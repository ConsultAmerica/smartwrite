import type { HistoryEntry, SidebarView, WritingMode } from "../types";
import { DOCUMENT_TEMPLATES } from "../constants/templates";
import { MODE_INFO, MODE_ORDER } from "../constants/modeConfig";
import "./AppSidebar.css";

interface Props {
  view: SidebarView;
  onViewChange: (view: SidebarView) => void;
  writingMode: WritingMode;
  onModeChange: (mode: WritingMode) => void;
  history: HistoryEntry[];
  onOpenHistory: (entry: HistoryEntry) => void;
  onDeleteHistory: (id: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onNewDoc: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function AppSidebar({
  view,
  onViewChange,
  writingMode,
  onModeChange,
  history,
  onOpenHistory,
  onDeleteHistory,
  onSelectTemplate,
  onNewDoc,
  mobileOpen,
  onCloseMobile,
}: Props) {
  return (
    <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="sidebar-brand">
        <span className="sidebar-logo">✦</span>
        <div>
          <strong>SmartWrite AI</strong>
          <span>Writing Assistant</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {(
          [
            ["editor", "✎ Editor"],
            ["templates", "📄 Templates"],
            ["history", "🕐 History"],
            ["settings", "⚙ Settings"],
          ] as [SidebarView, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={view === id ? "active" : ""}
            onClick={() => {
              onViewChange(id);
              onCloseMobile?.();
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {view === "editor" && (
        <div className="sidebar-section">
          <h4>Writing modes</h4>
          <div className="mode-list">
            {MODE_ORDER.map((mode) => (
              <button
                key={mode}
                type="button"
                className={writingMode === mode ? "active" : ""}
                onClick={() => onModeChange(mode)}
              >
                <span>{MODE_INFO[mode].icon}</span>
                {MODE_INFO[mode].label}
              </button>
            ))}
          </div>
          <button type="button" className="sidebar-new" onClick={onNewDoc}>
            + New document
          </button>
        </div>
      )}

      {view === "templates" && (
        <div className="sidebar-section scroll">
          <h4>Templates</h4>
          {DOCUMENT_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="template-item"
              onClick={() => {
                onSelectTemplate(t.id);
                onViewChange("editor");
                onCloseMobile?.();
              }}
            >
              <strong>{t.title}</strong>
              <span>{t.description}</span>
            </button>
          ))}
        </div>
      )}

      {view === "history" && (
        <div className="sidebar-section scroll">
          <h4>Recent drafts</h4>
          {history.length === 0 && <p className="sidebar-empty">No history yet — save a draft to see it here.</p>}
          {history.map((h) => (
            <div key={h.id} className="history-item">
              <button type="button" onClick={() => onOpenHistory(h)}>
                <strong>{h.title}</strong>
                <span>{MODE_INFO[h.mode].label} · Score {h.score}</span>
                <span className="history-preview">{h.preview}…</span>
              </button>
              <button type="button" className="history-del" onClick={() => onDeleteHistory(h.id)} aria-label="Delete">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {view === "settings" && (
        <div className="sidebar-section scroll">
          <h4>Account</h4>
          <p className="sidebar-hint">Guest mode — drafts saved locally in your browser.</p>
          <div className="auth-placeholder">
            <button type="button" className="btn secondary" disabled title="Coming soon">
              Sign in
            </button>
            <button type="button" className="btn ghost" disabled title="Coming soon">
              Sign up
            </button>
          </div>

          <h4 className="sidebar-subhead">Pricing</h4>
          <div className="sidebar-card">
            <strong>Free</strong>
            <span>Grammar check, 6 writing modes, local drafts</span>
          </div>
          <div className="sidebar-card muted-card">
            <strong>Pro</strong>
            <span>Coming soon — cloud sync, team workspace, advanced AI rewrites</span>
          </div>

          <h4 className="sidebar-subhead">Help & FAQ</h4>
          <details className="sidebar-faq">
            <summary>How do I check my writing?</summary>
            <p>Paste text, pick a mode, and click Check Grammar or press Ctrl+Enter.</p>
          </details>
          <details className="sidebar-faq">
            <summary>What are writing modes?</summary>
            <p>Each mode applies different rules — email, resume, academic, healthcare, and business.</p>
          </details>
          <details className="sidebar-faq">
            <summary>Where are drafts saved?</summary>
            <p>Guest drafts are stored in your browser. Use Save to add them to History.</p>
          </details>
          <details className="sidebar-faq">
            <summary>Is my text sent to AI?</summary>
            <p>Analysis uses rule-based checks offline. AI rewrites require the backend when connected.</p>
          </details>
        </div>
      )}
    </aside>
  );
}
