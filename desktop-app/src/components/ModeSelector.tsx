import type { WritingMode } from "../types";
import { MODE_INFO, MODE_ORDER } from "../constants/modeConfig";
import "./ModeSelector.css";

interface Props {
  mode: WritingMode;
  onChange: (mode: WritingMode) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function ModeSelector({ mode, onChange, mobileOpen, onCloseMobile }: Props) {
  return (
    <aside className={`mode-selector ${mobileOpen ? "open" : ""}`}>
      <div className="mode-selector-head">
        <h2>Writing mode</h2>
        <p>Rules & tone defaults</p>
      </div>
      <nav className="mode-pills" aria-label="Writing modes">
        {MODE_ORDER.map((m) => {
          const info = MODE_INFO[m];
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              className={`mode-pill ${active ? "active" : ""}`}
              onClick={() => {
                onChange(m);
                onCloseMobile?.();
              }}
            >
              <span className="mode-pill-icon">{info.icon}</span>
              <span className="mode-pill-label">{info.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
