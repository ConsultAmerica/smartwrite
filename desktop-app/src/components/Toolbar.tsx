import { useEffect, useRef, useState } from "react";
import type { ToneMode } from "../types";
import "./Toolbar.css";

const REWRITE_MODES: Array<{ mode: ToneMode; label: string }> = [
  { mode: "professional", label: "Professional" },
  { mode: "shorter", label: "Concise" },
  { mode: "friendly", label: "Friendly" },
  { mode: "confident", label: "Confident" },
  { mode: "academic", label: "Academic" },
  { mode: "clearer", label: "Simpler" },
];

const TONE_MODES: Array<{ mode: ToneMode; label: string }> = [
  { mode: "professional", label: "Professional" },
  { mode: "friendly", label: "Friendly" },
  { mode: "confident", label: "Confident" },
  { mode: "formal", label: "Direct" },
  { mode: "casual", label: "Diplomatic" },
  { mode: "clearer", label: "Neutral" },
];

interface Props {
  disabled?: boolean;
  loading?: boolean;
  selectionActive: boolean;
  onPreset: (mode: ToneMode, label: string, instruction?: string) => void;
  onParagraphRewrite: () => void;
  onOpenAI: () => void;
}

export default function Toolbar({
  disabled,
  loading,
  selectionActive,
  onPreset,
  onParagraphRewrite,
  onOpenAI,
}: Props) {
  const [menu, setMenu] = useState<"rewrite" | "tone" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  if (!selectionActive) return null;

  return (
    <div
      ref={rootRef}
      className="editor-toolbar"
      role="toolbar"
      aria-label="Selection writing actions"
    >
      <button
        type="button"
        className="toolbar-btn"
        disabled={disabled || loading}
        onClick={() => onPreset("clearer", "Improve")}
        title="Improve selection"
      >
        {loading ? "Rewriting…" : "Improve"}
      </button>

      <div className="toolbar-menu-wrap">
        <button
          type="button"
          className="toolbar-btn"
          disabled={disabled || loading}
          aria-expanded={menu === "rewrite"}
          onClick={() => setMenu((m) => (m === "rewrite" ? null : "rewrite"))}
          title="Rewrite"
        >
          Rewrite ▾
        </button>
        {menu === "rewrite" && (
          <div className="toolbar-dropdown" role="menu">
            {REWRITE_MODES.map((option) => (
              <button
                key={option.label}
                type="button"
                role="menuitem"
                disabled={disabled || loading}
                onClick={() => {
                  onPreset(option.mode, `Rewrite · ${option.label}`);
                  setMenu(null);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        className="toolbar-btn"
        disabled={disabled || loading}
        onClick={() => onPreset("shorter", "Shorten")}
        title="Shorten selection"
      >
        Shorten
      </button>

      <div className="toolbar-menu-wrap">
        <button
          type="button"
          className="toolbar-btn"
          disabled={disabled || loading}
          aria-expanded={menu === "tone"}
          onClick={() => setMenu((m) => (m === "tone" ? null : "tone"))}
          title="Change tone"
        >
          Tone ▾
        </button>
        {menu === "tone" && (
          <div className="toolbar-dropdown" role="menu">
            {TONE_MODES.map((option) => (
              <button
                key={option.label}
                type="button"
                role="menuitem"
                disabled={disabled || loading}
                onClick={() => {
                  onPreset(option.mode, `${option.label} tone`);
                  setMenu(null);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="toolbar-divider" aria-hidden="true" />

      <button
        type="button"
        className="toolbar-btn toolbar-paragraph"
        disabled={disabled || loading}
        onClick={onParagraphRewrite}
        title="Rewrite paragraph"
      >
        Paragraph
      </button>
      <button
        type="button"
        className="toolbar-btn toolbar-drawer-button"
        disabled={disabled}
        onClick={onOpenAI}
        aria-label="Ask SmartWrite"
        title="Ask SmartWrite (Ctrl/Cmd+K)"
      >
        Ask
      </button>
    </div>
  );
}
