import { useEffect, useState } from "react";
import type { AiRewritePreview, ToneMode } from "../types";
import "./AiRewriteDrawer.css";

interface Props {
  preview: AiRewritePreview | null;
  replaceLabel: string;
  loading: boolean;
  onRewrite: (mode: ToneMode, label: string) => void;
  onParagraphRewrite: () => void;
  onReplace: () => void;
  onInsertBelow?: () => void;
  onCopy: () => void;
  onDismissPreview: () => void;
  onClose: () => void;
}

const SUGGESTED: Array<{ mode: ToneMode; label: string }> = [
  { mode: "clearer", label: "Improve entire document" },
  { mode: "professional", label: "Make more professional" },
  { mode: "confident", label: "Find weak arguments" },
  { mode: "shorter", label: "Summarize" },
  { mode: "formal", label: "Rewrite introduction" },
];

export default function AiRewriteDrawer({
  preview,
  replaceLabel,
  loading,
  onRewrite,
  onParagraphRewrite,
  onReplace,
  onInsertBelow,
  onCopy,
  onDismissPreview,
  onClose,
}: Props) {
  const [ask, setAsk] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button type="button" className="ai-drawer-backdrop" aria-label="Close Ask SmartWrite" onClick={onClose} />
      <aside
        className="ai-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Ask SmartWrite"
      >
        <header className="ai-drawer-header">
          <div className="ai-drawer-title">
            <img className="ai-drawer-mark" src="/images/ask-panel.svg" alt="" width={40} height={40} />
            <div>
              <h2>Ask SmartWrite</h2>
              <p>Improve selection or document</p>
            </div>
          </div>
          <button type="button" className="ai-drawer-close" onClick={onClose} aria-label="Close panel">
            ×
          </button>
        </header>

        <div className="ai-drawer-body">
          <form
            className="ai-ask-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!ask.trim()) return;
              onRewrite("clearer", ask.trim());
              setAsk("");
            }}
          >
            <input
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="Ask anything about this document"
              aria-label="Ask anything about this document"
            />
            <button type="submit" disabled={!ask.trim() || loading}>Ask</button>
          </form>

          <p className="ai-drawer-label">Suggested</p>
          <div className="ai-drawer-actions">
            {SUGGESTED.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onRewrite(item.mode, item.label)}
                disabled={loading}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              className="ai-paragraph-action"
              onClick={onParagraphRewrite}
              disabled={loading}
            >
              Rewrite paragraph
            </button>
          </div>

          {loading && (
            <div className="ai-drawer-loading" role="status">
              <span className="ai-loading-dot" />
              Rewriting…
            </div>
          )}

          {preview ? (
            <section className="ai-drawer-preview" aria-live="polite">
              <div className="ai-preview-heading">
                <div>
                  <p className="ai-drawer-label">Preview</p>
                  <h3>{preview.label}</h3>
                </div>
                <button type="button" onClick={onDismissPreview} aria-label="Dismiss preview">×</button>
              </div>
              <div className="ai-preview-block">
                <span>Original</span>
                <p>{preview.original}</p>
              </div>
              <div className="ai-preview-block improved">
                <span>Suggested</span>
                <p>{preview.improved}</p>
              </div>
              <div className="ai-preview-footer">
                <button type="button" className="ai-copy" onClick={onDismissPreview}>Cancel</button>
                {onInsertBelow && (
                  <button type="button" className="ai-copy" onClick={onInsertBelow}>
                    Insert below
                  </button>
                )}
                <button type="button" className="ai-replace" onClick={onReplace}>{replaceLabel}</button>
                <button type="button" className="ai-copy" onClick={onCopy}>Copy</button>
              </div>
            </section>
          ) : (
            !loading && (
              <div className="ai-drawer-hint">
                SmartWrite already knows this document. Select text for a focused rewrite, or run a suggested action.
              </div>
            )
          )}
        </div>
      </aside>
    </>
  );
}
