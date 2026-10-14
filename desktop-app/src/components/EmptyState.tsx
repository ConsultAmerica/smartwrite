import { useState } from "react";
import "./EmptyState.css";

export interface EmptyStarter {
  id: string;
  label: string;
}

interface Props {
  icon?: string;
  title: string;
  message: string;
  onStart?: () => void;
  starters?: EmptyStarter[];
  onStarter?: (id: string) => void;
  onPasteText?: (text: string) => void;
  onFocusEditor?: () => void;
  variant?: "panel" | "hero";
  /** Kept for API compat; hero now uses an inline product preview. */
  imageSrc?: string;
}

export default function EmptyState({
  title,
  message,
  onStart,
  starters,
  onStarter,
  onPasteText,
  onFocusEditor,
  variant = "panel",
}: Props) {
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasting, setPasting] = useState(false);

  const handlePaste = async () => {
    setPasteError(null);
    setPasting(true);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteError("Clipboard is empty — copy text, then try again.");
        onFocusEditor?.();
        return;
      }
      onPasteText?.(text);
    } catch {
      setPasteError("Paste with Ctrl+V (or ⌘V) in the editor — no sign-in needed.");
      onFocusEditor?.();
    } finally {
      setPasting(false);
    }
  };

  return (
    <div className={`empty-state empty-state--${variant}`}>
      <div className="empty-state-inner">
        {variant === "hero" && (
          <div className="empty-hero-art" aria-hidden="true">
            <div className="empty-preview">
              <div className="empty-preview-doc">
                <div className="empty-preview-top">
                  <span>Draft</span>
                  <span className="empty-preview-saved">Saved</span>
                </div>
                <p>
                  The update{" "}
                  <span className="empty-mark grammar">recieved</span> strong
                  feedback.
                </p>
                <p>
                  We will{" "}
                  <span className="empty-mark clarity">go ahead and finalize</span>{" "}
                  next steps.
                </p>
              </div>
              <div className="empty-preview-chip">Clarity · Accept</div>
              <div className="empty-preview-score">
                <span>Score</span>
                <strong>88</strong>
              </div>
            </div>
          </div>
        )}
        <strong>{title}</strong>
        <p>{message}</p>
        <p className="empty-guest-note">No account required — paste and check instantly.</p>

        <div className="empty-primary-actions">
          {onPasteText && (
            <button
              type="button"
              className="empty-paste btn-primary"
              onClick={() => void handlePaste()}
              disabled={pasting}
            >
              {pasting ? "Pasting…" : "Paste text to check"}
            </button>
          )}
          {onStart && (
            <button type="button" className="empty-start btn-secondary" onClick={onStart}>
              Try a sample
            </button>
          )}
        </div>

        {pasteError && <p className="empty-paste-error">{pasteError}</p>}

        {starters && starters.length > 0 && (
          <div className="empty-starters" role="group" aria-label="Starter templates">
            {starters.map((s) => (
              <button key={s.id} type="button" onClick={() => onStarter?.(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
