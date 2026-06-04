import { downloadDocxSimple, downloadTextFile } from "../services/scoring";
import { diffWords, DiffText } from "../utils/textDiff";
import "./BeforeAfterPanel.css";

interface Props {
  original: string;
  improved: string;
  onReplace: () => void;
  onCopy: () => void;
  onDismiss: () => void;
}

export default function BeforeAfterPanel({ original, improved, onReplace, onCopy, onDismiss }: Props) {
  if (!improved) return null;

  const diff = diffWords(original, improved);

  return (
    <section className="before-after panel-card">
      <div className="ba-head">
        <h3>Before & After</h3>
        <button type="button" className="btn ghost" onClick={onDismiss}>
          Close
        </button>
      </div>
      <div className="ba-grid">
        <div className="ba-col">
          <span className="ba-label">Original</span>
          <p>
            {original ? <DiffText parts={diff.original} /> : "—"}
          </p>
        </div>
        <div className="ba-col improved">
          <span className="ba-label">Improved</span>
          <p>
            <DiffText parts={diff.improved} />
          </p>
        </div>
      </div>
      <div className="ba-actions">
        <button type="button" className="btn primary" onClick={onReplace}>
          Replace Original
        </button>
        <button type="button" className="btn secondary" onClick={onCopy}>
          Copy Improved
        </button>
        <button type="button" className="btn secondary" onClick={() => downloadTextFile("smartwrite-improved.txt", improved)}>
          Download TXT
        </button>
        <button type="button" className="btn secondary" onClick={() => downloadDocxSimple("smartwrite-improved.doc", improved)}>
          Download DOC
        </button>
      </div>
    </section>
  );
}
