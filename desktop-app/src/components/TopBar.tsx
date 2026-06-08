import { useState } from "react";
import type { Theme, WritingMode } from "../types";
import { MODE_INFO } from "../constants/modeConfig";
import { getTextStats } from "../utils/textStats";
import Logo from "./Logo";
import "./TopBar.css";

interface Props {
  docTitle: string;
  onDocTitleChange: (title: string) => void;
  text: string;
  writingMode: WritingMode;
  theme: Theme;
  onThemeToggle: () => void;
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
  canApplyAll?: boolean;
  onToggleModePane?: () => void;
}

export default function TopBar({
  docTitle,
  onDocTitleChange,
  text,
  writingMode,
  theme,
  onThemeToggle,
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
  canApplyAll,
  onToggleModePane,
}: Props) {
  const stats = getTextStats(text);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <button type="button" className="top-bar-menu hide-desktop" onClick={onToggleModePane} aria-label="Modes">
          ☰
        </button>
        <Logo />
      </div>

      <div className="top-bar-center">
        <input
          className="top-bar-title"
          value={docTitle}
          onChange={(e) => onDocTitleChange(e.target.value)}
          placeholder="Untitled document"
          aria-label="Document title"
        />
      </div>

      <div className="top-bar-right">
        <div className="top-bar-actions hide-mobile">
          <button type="button" className="top-icon-btn" onClick={onUndo} disabled={!canUndo} title="Undo">
            ↶
          </button>
          <button type="button" className="top-icon-btn" onClick={onRedo} disabled={!canRedo} title="Redo">
            ↷
          </button>
        </div>
        <span className="top-bar-stat">{stats.words} words</span>
        <span className="top-bar-mode">{MODE_INFO[writingMode].label}</span>
        <button type="button" className="btn secondary top-bar-check" onClick={onCheckGrammar} disabled={checking}>
          {checking ? "…" : "Check"}
        </button>
        <button type="button" className="btn primary top-bar-save" onClick={onSave} disabled={saving}>
          {saving ? "…" : "Save"}
        </button>
        <div className="top-bar-settings-wrap">
          <button
            type="button"
            className="top-icon-btn"
            onClick={() => setSettingsOpen((o) => !o)}
            title="Settings"
            aria-expanded={settingsOpen}
          >
            ⚙
          </button>
          {settingsOpen && (
            <div className="top-bar-settings-menu">
              {onApplyAll && (
                <button type="button" onClick={onApplyAll} disabled={!canApplyAll}>
                  Apply all fixes
                </button>
              )}
              {onNewDoc && <button type="button" onClick={onNewDoc}>New document</button>}
              {onCopy && <button type="button" onClick={onCopy}>Copy text</button>}
              {onClear && <button type="button" onClick={onClear}>Clear editor</button>}
              <button type="button" onClick={onThemeToggle}>
                {theme === "dark" ? "☀ Light mode" : "☾ Soft dark"}
              </button>
            </div>
          )}
        </div>
        <div className="top-bar-avatar" title="Guest mode">
          G
        </div>
      </div>
    </header>
  );
}
