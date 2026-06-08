import type { HistoryEntry } from "../types";
import { MODE_INFO } from "../constants/modeConfig";
import { formatRelativeTime } from "../utils/textStats";
import "./HistoryPanel.css";

interface Props {
  history: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onRestore?: (entry: HistoryEntry) => void;
}

export default function HistoryPanel({ history, onOpen, onDelete, onRestore }: Props) {
  if (history.length === 0) {
    return <p className="history-empty">No history yet — save a draft to see rewrites here.</p>;
  }

  return (
    <div className="history-panel">
      <ul className="history-timeline">
        {history.map((h) => (
          <li key={h.id} className="history-entry">
            <div className="history-dot" />
            <div className="history-body">
              <button type="button" className="history-open" onClick={() => onOpen(h)}>
                <strong>{h.title}</strong>
                <span>
                  {MODE_INFO[h.mode].label} · Score {h.score} · {formatRelativeTime(h.updated_at)}
                </span>
                <span className="history-snippet">{h.preview}…</span>
              </button>
              <div className="history-actions">
                {onRestore && (
                  <button type="button" className="btn ghost history-restore" onClick={() => onRestore(h)}>
                    Restore
                  </button>
                )}
                <button type="button" className="history-del" onClick={() => onDelete(h.id)} aria-label="Delete">
                  ×
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
