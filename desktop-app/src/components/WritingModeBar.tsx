import { useEffect, useState, type MouseEvent } from "react";
import type { WritingMode } from "../types";
import { MODE_INFO } from "../constants/modeConfig";
import "./WritingModeBar.css";

interface Props {
  mode: WritingMode;
  onLoadSample: (mode: WritingMode) => void;
}

export default function WritingModeBar({ mode, onLoadSample }: Props) {
  const info = MODE_INFO[mode];
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setFeedback(null);
  }, [mode]);

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLoadSample(mode);
    setFeedback("Sample loaded");
    window.setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div className="writing-mode-bar" key={mode}>
      <div className="writing-mode-bar-inner">
        <span className="mode-pill">{info.label} mode</span>
        <p className="mode-description">{info.description}</p>
        <button
          type="button"
          className="mode-sample-btn"
          onClick={handleClick}
          aria-label={`Load ${info.label} sample text`}
        >
          {feedback ?? `Load ${info.label.toLowerCase()} sample`}
        </button>
      </div>
    </div>
  );
}
