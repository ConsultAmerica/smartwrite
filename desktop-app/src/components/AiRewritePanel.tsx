import type { AiRewritePreview } from "../types";
import "./AiRewritePanel.css";

interface Props {
  preview: AiRewritePreview | null;
  loading: boolean;
  onReplace: () => void;
  onCopy: () => void;
  onDismiss: () => void;
}

export default function AiRewritePanel({ preview, loading, onReplace, onCopy, onDismiss }: Props) {
  if (!preview && !loading) return null;

  return (
    <section className="ai-rewrite-panel">
      <h3>AI Rewrite</h3>
      {loading && <p className="loading">Generating rewrite…</p>}
      {preview && (
        <>
          <p className="rewrite-mode">{preview.label}</p>
          <div className="rewrite-block">
            <span className="block-label">Original</span>
            <p>{preview.original}</p>
          </div>
          <div className="rewrite-block improved">
            <span className="block-label">Improved</span>
            <p>{preview.improved}</p>
          </div>
          <div className="rewrite-actions">
            <button type="button" className="btn primary" onClick={onReplace} disabled={loading}>
              Replace Text
            </button>
            <button type="button" className="btn secondary" onClick={onCopy}>
              Copy
            </button>
            <button type="button" className="btn ghost" onClick={onDismiss}>
              Dismiss
            </button>
          </div>
        </>
      )}
    </section>
  );
}
