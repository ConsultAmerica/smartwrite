import { useEffect, useRef, useState } from "react";
import type { FeedbackReason } from "../services/betaAnalytics";
import { trackFeedback } from "../services/betaAnalytics";
import "./HelpfulnessPrompt.css";

interface Props {
  target: "rewrite" | "suggestion";
  /** Stable key so the same action isn't polled twice. */
  eventKey: string | null;
  onDone?: () => void;
}

const REASONS: { id: FeedbackReason; label: string }[] = [
  { id: "too_wordy", label: "Too wordy" },
  { id: "changed_meaning", label: "Changed my meaning" },
  { id: "wrong_tone", label: "Wrong tone" },
  { id: "not_accurate", label: "Not accurate" },
  { id: "other", label: "Other" },
];

const SEEN_KEY = "smartwrite-feedback-seen";
const COOLDOWN_KEY = "smartwrite-feedback-cooldown";
const COOLDOWN_MS = 3 * 60 * 1000;

function alreadySeen(key: string): boolean {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const set = raw ? (JSON.parse(raw) as string[]) : [];
    return set.includes(key);
  } catch {
    return false;
  }
}

function markSeen(key: string): void {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const set = raw ? (JSON.parse(raw) as string[]) : [];
    set.push(key);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(set.slice(-80)));
    sessionStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function inCooldown(): boolean {
  try {
    const raw = sessionStorage.getItem(COOLDOWN_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** Tiny optional feedback — once per action key, with cooldown so it rarely interrupts. */
export default function HelpfulnessPrompt({ target, eventKey, onDone }: Props) {
  const [phase, setPhase] = useState<"ask" | "why" | "thanks" | "hidden">("hidden");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!eventKey || alreadySeen(eventKey) || inCooldown()) {
      setPhase("hidden");
      if (eventKey && inCooldown()) onDoneRef.current?.();
      return;
    }
    // Soft delay so we don't interrupt the action itself
    const id = window.setTimeout(() => setPhase("ask"), 600);
    return () => window.clearTimeout(id);
  }, [eventKey]);

  if (phase === "hidden" || !eventKey) return null;

  const finish = () => {
    markSeen(eventKey);
    setPhase("hidden");
    onDone?.();
  };

  return (
    <div className="helpfulness-prompt" role="group" aria-label="Was this helpful?">
      {phase === "ask" && (
        <>
          <span>Was this helpful?</span>
          <button
            type="button"
            aria-label="Helpful"
            onClick={() => {
              trackFeedback(true, target);
              markSeen(eventKey);
              setPhase("thanks");
              window.setTimeout(finish, 900);
            }}
          >
            👍
          </button>
          <button
            type="button"
            aria-label="Not helpful"
            onClick={() => setPhase("why")}
          >
            👎
          </button>
          <button type="button" className="helpfulness-dismiss" onClick={finish} aria-label="Dismiss">
            ×
          </button>
        </>
      )}
      {phase === "why" && (
        <>
          <span>Why?</span>
          {REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className="helpfulness-reason"
              onClick={() => {
                trackFeedback(false, target, r.id);
                markSeen(eventKey);
                setPhase("thanks");
                window.setTimeout(finish, 900);
              }}
            >
              {r.label}
            </button>
          ))}
          <button type="button" className="helpfulness-dismiss" onClick={finish} aria-label="Dismiss">
            ×
          </button>
        </>
      )}
      {phase === "thanks" && <span>Thanks for the feedback.</span>}
    </div>
  );
}
