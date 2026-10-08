import "./RewriteErrorDialog.css";

interface Props {
  open: boolean;
  title: string;
  message: string;
  onRetry: () => void;
  onCancel: () => void;
}

export default function RewriteErrorDialog({ open, title, message, onRetry, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="rewrite-error-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="rewrite-error-dialog"
        role="alertdialog"
        aria-labelledby="rewrite-error-title"
        aria-describedby="rewrite-error-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="rewrite-error-title">{title}</h2>
        <p id="rewrite-error-message">{message}</p>
        <div className="rewrite-error-actions">
          <button type="button" className="rewrite-error-retry" onClick={onRetry}>
            Try again
          </button>
          <button type="button" className="rewrite-error-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
