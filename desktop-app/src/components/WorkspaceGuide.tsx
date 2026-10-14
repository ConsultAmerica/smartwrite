import "./WorkspaceGuide.css";

interface Props {
  onNew: () => void;
  onBrowseTemplates: () => void;
  onTryDemo: () => void;
}

const STEPS = [
  {
    title: "Paste or type",
    body: "Drop any draft in — no account wall.",
    icon: (
      <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4.5 3.75A1.75 1.75 0 0 1 6.25 2h5.19c.46 0 .9.18 1.23.51l2.82 2.82c.33.33.51.77.51 1.23v9.69A1.75 1.75 0 0 1 14.25 18H6.25A1.75 1.75 0 0 1 4.5 16.25v-12.5Zm7.06.35H11.5v1.9c0 .41.34.75.75.75h1.9l-2.59-2.65ZM6.25 3.5a.25.25 0 0 0-.25.25v12.5c0 .14.11.25.25.25h8a.25.25 0 0 0 .25-.25V8h-2.25A1.75 1.75 0 0 1 10.25 6.25V3.5H6.25Z"
        />
      </svg>
    ),
  },
  {
    title: "See underlines",
    body: "Color marks for spelling, clarity, tone, and style.",
    icon: (
      <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
        <path
          fill="currentColor"
          d="M3.5 4.75c0-.41.34-.75.75-.75h11.5a.75.75 0 0 1 0 1.5H4.25a.75.75 0 0 1-.75-.75Zm0 4c0-.41.34-.75.75-.75h11.5a.75.75 0 0 1 0 1.5H4.25a.75.75 0 0 1-.75-.75Zm.75 3.25a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5H4.25Zm-.75 5.1c0-.28.22-.5.5-.5h12a.5.5 0 0 1 0 1H4a.5.5 0 0 1-.5-.5Z"
        />
      </svg>
    ),
  },
  {
    title: "Fix in one click",
    body: "Hover a mark, learn why, and apply the fix.",
    icon: (
      <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.28 5.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L3.72 9.28a.75.75 0 0 1 1.06-1.06l3.72 3.72 6.72-6.72a.75.75 0 0 1 1.06 0Z"
        />
      </svg>
    ),
  },
] as const;

const HEALTH = [
  { label: "Correctness", status: "Ready" },
  { label: "Clarity", status: "Ready" },
  { label: "Tone", status: "Professional" },
  { label: "Style", status: "Clear" },
] as const;

export default function WorkspaceGuide({ onNew, onBrowseTemplates, onTryDemo }: Props) {
  return (
    <aside className="workspace-guide" aria-label="Getting started">
      <header className="guide-header">
        <h2>Getting started</h2>
        <p>Writing checks as you type.</p>
      </header>

      <section className="guide-card guide-live" aria-label="Live writing check">
        <div className="guide-live-head">
          <span className="guide-live-dot" aria-hidden="true" />
          <strong>Live writing check</strong>
        </div>
        <ul className="guide-health">
          {HEALTH.map((row) => (
            <li key={row.label}>
              <span>{row.label}</span>
              <em>{row.status}</em>
            </li>
          ))}
        </ul>
      </section>

      <section className="guide-card guide-example" aria-label="Example underlines">
        <p className="guide-example-text">
          Your writing gets{" "}
          <span className="guide-u grammar">checkd</span> for{" "}
          <span className="guide-u clarity">clarity and tone</span> as you type.
        </p>
        <ul className="guide-example-key" aria-hidden="true">
          <li className="grammar">Grammar</li>
          <li className="clarity">Clarity</li>
        </ul>
      </section>

      <section className="guide-section" aria-labelledby="guide-how-heading">
        <h3 id="guide-how-heading">How it works</h3>
        <ol className="guide-steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <button
                type="button"
                className="guide-step"
                onClick={index === 0 ? onNew : onTryDemo}
              >
                <span className="guide-step-icon" aria-hidden="true">
                  {step.icon}
                </span>
                <span className="guide-step-copy">
                  <strong>{step.title}</strong>
                  <span>{step.body}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section className="guide-section guide-colors" aria-label="Suggestion colors">
        <h3>Suggestion colors</h3>
        <ul className="guide-key">
          <li className="grammar">Grammar</li>
          <li className="clarity">Clarity</li>
          <li className="tone">Tone</li>
          <li className="style">Style</li>
        </ul>
      </section>

      <button type="button" className="guide-demo" onClick={onTryDemo}>
        <span>
          Try interactive demo
          <span aria-hidden="true"> →</span>
        </span>
        <small>See underlines and one-click fixes</small>
      </button>

      <button type="button" className="guide-browse" onClick={onBrowseTemplates}>
        Browse templates
      </button>
    </aside>
  );
}
