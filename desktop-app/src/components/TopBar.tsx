import { useState } from "react";
import type { WritingGoals } from "../constants/writingGoals";
import { getTextStats } from "../utils/textStats";
import { sanitizeDocumentTitle } from "../utils/title";
import type { HistoryEntry, SaveStatus, WritingMode } from "../types";
import WritingGoalsPanel from "./WritingGoalsPanel";
import "./TopBar.css";

interface Props {
  docTitle: string;
  onDocTitleChange: (title: string) => void;
  text: string;
  writingMode: WritingMode;
  goals: WritingGoals;
  onGoalsChange: (goals: WritingGoals, mode: WritingMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onCheckGrammar: () => void;
  onSave: () => void;
  onApplyAll?: () => void;
  onNewDoc?: () => void;
  onClear?: () => void;
  onCopy?: () => void;
  checking: boolean;
  saving: boolean;
  saveStatus: SaveStatus;
  canApplyAll?: boolean;
  onToggleDocs?: () => void;
  onOpenAI: () => void;
  docsCollapsed?: boolean;
  onGoHome?: () => void;
  history?: HistoryEntry[];
  onOpenHistory?: (entry: HistoryEntry) => void;
}

function saveLabel(status: SaveStatus): string {
  if (status === "saved") return "Saved";
  if (status === "saving") return "Saving…";
  if (status === "offline") return "Offline";
  if (status === "error") return "Save failed";
  if (status === "retrying") return "Retrying…";
  return "Unsaved changes";
}

export default function TopBar({
  docTitle,
  onDocTitleChange,
  text,
  writingMode,
  goals,
  onGoalsChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onCheckGrammar,
  onSave,
  onApplyAll,
  onNewDoc,
  onClear,
  onCopy,
  checking,
  saving,
  saveStatus,
  canApplyAll,
  onToggleDocs,
  onOpenAI,
  docsCollapsed,
  onGoHome,
  history = [],
  onOpenHistory,
}: Props) {
  const stats = getTextStats(text);
  const [menuOpen, setMenuOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const displayTitle = sanitizeDocumentTitle(docTitle);

  return (
    <header className="doc-header">
      <div className="doc-header-main">
        <div className="doc-header-left">
          <button
            type="button"
            className="doc-back"
            onClick={onGoHome ?? onToggleDocs}
            title={docsCollapsed ? "Show documents" : "Back to documents"}
            aria-label="Back to documents"
          >
            ← Documents
          </button>
          <div className="doc-title-block">
            <input
              className="doc-title-input"
              value={displayTitle === "Untitled" && !docTitle.trim() ? "" : displayTitle}
              onChange={(e) => onDocTitleChange(e.target.value)}
              placeholder="Untitled"
              aria-label="Document title"
            />
            <p className="doc-header-meta-line">
              <span
                className={`doc-save-meta ${saveStatus}`}
                role="status"
                aria-live="polite"
              >
                {saveLabel(saveStatus)}
              </span>
              <span className="doc-meta-dot" aria-hidden="true">·</span>
              <span>
                {stats.words === 1 ? "1 word" : `${stats.words.toLocaleString()} words`} · {stats.readingLabel} read
              </span>
              {checking && (
                <>
                  <span className="doc-meta-dot" aria-hidden="true">·</span>
                  <span className="doc-checking">Checking your writing…</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="doc-header-actions">
          <div className="doc-header-goals-wrap">
            <button
              type="button"
              className={`doc-action${goalsOpen ? " active" : ""}`}
              onClick={() => setGoalsOpen((o) => !o)}
              aria-expanded={goalsOpen}
            >
              Goals
            </button>
            <WritingGoalsPanel
              open={goalsOpen}
              goals={goals}
              writingMode={writingMode}
              onChange={(nextGoals, mode) => {
                onGoalsChange(nextGoals, mode);
              }}
              onClose={() => setGoalsOpen(false)}
            />
          </div>

          <button
            type="button"
            className="doc-action primary"
            onClick={onSave}
            disabled={saving}
            title="Share / Save (Ctrl/Cmd+S)"
          >
            {saving ? "…" : "Share"}
          </button>

          <div className="doc-menu-wrap">
            <button
              type="button"
              className="doc-action icon"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label="More actions"
              title="More"
            >
              •••
            </button>
            {menuOpen && (
              <div className="doc-menu">
                <button type="button" onClick={onUndo} disabled={!canUndo} title="Ctrl/Cmd+Z">
                  Undo
                </button>
                <button type="button" onClick={onRedo} disabled={!canRedo} title="Ctrl/Cmd+Shift+Z">
                  Redo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCheckGrammar();
                    setMenuOpen(false);
                  }}
                  disabled={checking}
                  title="Ctrl/Cmd+Enter"
                >
                  {checking ? "Checking…" : "Run SmartWrite"}
                </button>
                {onApplyAll && (
                  <button type="button" onClick={onApplyAll} disabled={!canApplyAll}>
                    Apply all fixes
                  </button>
                )}
                {onNewDoc && (
                  <button type="button" onClick={() => { onNewDoc(); setMenuOpen(false); }}>
                    New document
                  </button>
                )}
                {onCopy && (
                  <button type="button" onClick={() => { onCopy(); setMenuOpen(false); }}>
                    Copy text
                  </button>
                )}
                {onClear && (
                  <button type="button" onClick={() => { onClear(); setMenuOpen(false); }}>
                    Clear editor
                  </button>
                )}
                {history.length > 0 && onOpenHistory && (
                  <>
                    <div className="doc-menu-divider" />
                    <p className="doc-menu-label">Version history</p>
                    {history.slice(0, 5).map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          onOpenHistory(entry);
                          setMenuOpen(false);
                        }}
                      >
                        {sanitizeDocumentTitle(entry.title)}
                      </button>
                    ))}
                  </>
                )}
                <div className="doc-menu-divider" />
                <button
                  type="button"
                  onClick={() => {
                    onOpenAI();
                    setMenuOpen(false);
                  }}
                  title="Ctrl/Cmd+K"
                >
                  Ask SmartWrite
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
