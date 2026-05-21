import type { Theme, WritingMode } from "../types";
import "./Header.css";

interface Props {
  theme: Theme;
  onThemeToggle: () => void;
  writingMode: WritingMode;
  onModeChange: (mode: WritingMode) => void;
  backendOnline: boolean;
  onCheckGrammar: () => void;
  onCorrectAll: () => void;
  onSave: () => void;
  checking: boolean;
  correcting: boolean;
  saving: boolean;
  canCorrectAll: boolean;
}

const MODES: { id: WritingMode; label: string }[] = [
  { id: "general", label: "General" },
  { id: "email", label: "Email" },
  { id: "resume", label: "Resume" },
  { id: "healthcare", label: "Healthcare" },
];

export default function Header({
  theme,
  onThemeToggle,
  writingMode,
  onModeChange,
  backendOnline,
  onCheckGrammar,
  onCorrectAll,
  onSave,
  checking,
  correcting,
  saving,
  canCorrectAll,
}: Props) {
  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="logo">✦</span>
        <div>
          <h1>SmartWrite AI</h1>
          <p>Desktop Writing Assistant</p>
        </div>
      </div>

      <nav className="mode-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={writingMode === m.id ? "active" : ""}
            onClick={() => onModeChange(m.id)}
          >
            {m.label}
          </button>
        ))}
      </nav>

      <div className="header-actions">
        <span
          className={`status-dot ${backendOnline ? "online" : "offline"}`}
          title={backendOnline ? "API connected" : "API offline"}
        />
        <button type="button" className="btn ghost" onClick={onThemeToggle} title="Toggle theme">
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <button type="button" className="btn secondary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={onCorrectAll}
          disabled={correcting || !canCorrectAll}
        >
          {correcting ? "Applying…" : "Correct All"}
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={onCheckGrammar}
          disabled={checking}
          title="Check grammar (Ctrl+Enter)"
        >
          {checking ? "Checking…" : "Check Grammar"}
        </button>
      </div>
    </header>
  );
}
