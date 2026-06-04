import type { Theme } from "../types";
import { getTextStats, formatRelativeTime } from "../utils/textStats";
import "./Header.css";

interface Props {
  theme: Theme;
  onThemeToggle: () => void;
  backendOnline: boolean;
  onCheckGrammar: () => void;
  onCorrectAll: () => void;
  onSave: () => void;
  onClear: () => void;
  onCopy: () => void;
  onDownload?: () => void;
  onToggleSidebar?: () => void;
  checking: boolean;
  correcting: boolean;
  saving: boolean;
  canCorrectAll: boolean;
  text: string;
  overallScore?: number;
  modeLabel: string;
  lastEdited?: string | null;
}
export default function Header({
  theme,
  onThemeToggle,
  backendOnline,
  onCheckGrammar,
  onCorrectAll,
  onSave,
  onClear,
  onCopy,
  onDownload,
  onToggleSidebar,
  checking,
  correcting,
  saving,
  canCorrectAll,
  text,
  overallScore,
  modeLabel,
  lastEdited,
}: Props) {
  const stats = getTextStats(text);

  return (
    <header className="app-header">
      <button type="button" className="mobile-menu btn ghost hide-desktop" onClick={onToggleSidebar} aria-label="Menu">
        ☰
      </button>

      <div className="header-stats hide-mobile">
        <span>{stats.words} words</span>
        <span className="dot">·</span>
        <span>{stats.characters} chars</span>
        <span className="dot">·</span>
        <span>{stats.readingTime}</span>
        {overallScore != null && (
          <>
            <span className="dot">·</span>
            <span className="header-score">Score {overallScore}</span>
          </>
        )}
        {lastEdited && (
          <>
            <span className="dot">·</span>
            <span className="header-edited">{formatRelativeTime(lastEdited)}</span>
          </>
        )}
      </div>

      <div className="header-mode hide-mobile">{modeLabel} mode</div>

      <div className="header-actions">
        <span
          className={`status-dot ${backendOnline ? "online" : "offline"}`}
          title={backendOnline ? "API connected" : "API offline — local analysis available"}
        />
        <button type="button" className="btn ghost" onClick={onThemeToggle} title="Toggle theme">
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <button type="button" className="btn ghost hide-mobile" onClick={onCopy} title="Copy text">
          Copy
        </button>
        {onDownload && (
          <button type="button" className="btn ghost hide-mobile" onClick={onDownload} title="Download as TXT">
            Download
          </button>
        )}
        <button type="button" className="btn ghost hide-mobile" onClick={onClear} title="Clear editor">
          Clear
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={onSave}
          disabled={saving}
          title="Save draft (Ctrl+S)"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={onCorrectAll}
          disabled={correcting || !canCorrectAll}
        >
          {correcting ? "Applying…" : "Apply All"}
        </button>
        <button type="button" className="btn primary" onClick={onCheckGrammar} disabled={checking} title="Ctrl+Enter">
          {checking ? "Checking…" : "Check Grammar"}
        </button>
      </div>
    </header>
  );
}
