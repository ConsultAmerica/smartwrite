import "./Logo.css";

interface Props {
  size?: number;
  /** When false, render the app icon only (collapsed rail). */
  showWordmark?: boolean;
  /** @deprecated Tagline is no longer used in the product shell. */
  showTagline?: boolean;
}

const V = "27";

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
  return (
    <div
      className={`brand-logo${showWordmark ? " has-wordmark" : " icon-only"}`}
      aria-label="SmartWrite"
      style={{ ["--logo-size" as string]: `${size}px` }}
    >
      <img
        className="brand-app-icon"
        src={`/images/smartwrite-mark.png?v=${V}`}
        alt=""
        width={showWordmark ? 36 : size}
        height={showWordmark ? 36 : size}
        draggable={false}
      />
      {showWordmark ? (
        <>
          <span className="brand-divider" aria-hidden="true" />
          <img
            className="brand-script"
            src={`/images/smartwrite-script-wordmark.png?v=${V}`}
            alt="SmartWrite"
            draggable={false}
          />
        </>
      ) : null}
    </div>
  );
}
