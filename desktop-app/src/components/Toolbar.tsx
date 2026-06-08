import type { ToneMode } from "../types";
import "./Toolbar.css";

export interface ToolbarPreset {
  mode: ToneMode;
  label: string;
}

const PRESETS: ToolbarPreset[] = [
  { mode: "shorter", label: "Shorter" },
  { mode: "clearer", label: "Clearer" },
  { mode: "formal", label: "More Formal" },
  { mode: "friendly", label: "Friendlier" },
  { mode: "resume", label: "Bullet Points" },
];

interface Props {
  disabled?: boolean;
  loading?: boolean;
  onPreset: (mode: ToneMode, label: string) => void;
}

export default function Toolbar({ disabled, loading, onPreset }: Props) {
  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Rewrite presets">
      {PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          className="toolbar-btn"
          disabled={disabled || loading}
          onClick={() => onPreset(p.mode, p.label)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
