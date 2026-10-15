import { useState } from "react";
import { assetUrl } from "../utils/assets";
import "./Logo.css";

interface Props {
  size?: number;
  /** When false, render the app icon only (collapsed rail). */
  showWordmark?: boolean;
  /** @deprecated Tagline is no longer used in the product shell. */
  showTagline?: boolean;
}

const V = "28";

/**
 * Brand system:
 * - Expanded: SW icon | script wordmark
 * - Collapsed: SW icon only
 * - Favicon/app icon: SW monogram
 * Script artwork is branding-only — never used as UI type.
 */
export default function Logo({
  size = 36,
  showWordmark = true,
}: Props) {
  const [markFailed, setMarkFailed] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const iconPx = showWordmark ? 36 : size;

  return (
    <div
      className={`brand-logo${showWordmark ? " has-wordmark" : " icon-only"}`}
      aria-label="SmartWrite"
      style={{ ["--logo-size" as string]: `${size}px` }}
    >
      {markFailed ? (
        <span className="brand-app-icon brand-app-icon-fallback" aria-hidden="true">
          S
        </span>
      ) : (
        <img
          className="brand-app-icon"
          src={`${assetUrl("images/smartwrite-mark.png")}?v=${V}`}
          alt=""
          width={iconPx}
          height={iconPx}
          draggable={false}
          onError={() => setMarkFailed(true)}
        />
      )}
      {showWordmark ? (
        <>
          <span className="brand-divider" aria-hidden="true" />
          {scriptFailed ? (
            <span className="brand-script-fallback">SmartWrite</span>
          ) : (
            <img
              className="brand-script"
              src={`${assetUrl("images/smartwrite-script-wordmark.png")}?v=${V}`}
              alt="SmartWrite"
              draggable={false}
              onError={() => setScriptFailed(true)}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
