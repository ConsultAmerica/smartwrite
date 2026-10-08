import { useEffect, useState } from "react";
import type { AiRewritePreview, ToneMode } from "../types";
import "./ParagraphRewriteControl.css";

const STYLES: Array<{ mode: ToneMode; label: string }> = [
  { mode: "professional", label: "Professional" },
  { mode: "shorter", label: "Concise" },
  { mode: "friendly", label: "Friendly" },
  { mode: "confident", label: "Confident" },
  { mode: "academic", label: "Academic" },
  { mode: "clearer", label: "Simpler" },
];

interface Props {
  visible: boolean;
  loading: boolean;
  preview: AiRewritePreview | null;
  onRewrite: (mode: ToneMode, label: string) => void;
  onReplace: () => void;
  onDismiss: () => void;
}

export default function ParagraphRewriteControl({
  visible,
  loading,
  preview,
  onRewrite,
  onReplace,
  onDismiss,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setOpen(false);
    }
  }, [visible]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onDismiss();
      }
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!visible) return null;

  return (
    <div className="paragraph-rewrite">
      <button
        type="button"
        className="paragraph-rewrite-trigger"
        aria-label="Rewrite paragraph"
        title="Rewrite paragraph"
        onClick={() => setOpen((o) => !o)}
      >
        ✦ Rewrite
      </button>

      {open && (
        <div className="paragraph-rewrite-panel" role="dialog" aria-label="Rewrite paragraph">
          <header>
            <strong>Rewrite paragraph</strong>
            <button type="button" onClick={() => { setOpen(false); onDismiss(); }} aria-label="Close">×</button>
          </header>
          <div className="paragraph-styles">
            {STYLES.map((style) => (
              <button
                key={style.mode}
                type="button"
                disabled={loading}
                onClick={() => onRewrite(style.mode, `Paragraph · ${style.label}`)}
              >
                {style.label}
              </button>
            ))}
          </div>
          {loading && <p className="paragraph-loading shimmer">Improving…</p>}
          {preview && (
            <div className="paragraph-preview">
              <div>
                <span>Original</span>
                <p>{preview.original}</p>
              </div>
              <div className="improved">
                <span>Improved</span>
                <p>{preview.improved}</p>
              </div>
              <button type="button" className="paragraph-replace" onClick={onReplace}>
                Replace paragraph
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
