import "./Logo.css";

interface Props {
  size?: number;
  showWordmark?: boolean;
}

export default function Logo({ size = 36, showWordmark = true }: Props) {
  return (
    <div className="brand-logo" aria-label="SmartWrite AI">
      <svg
        className="brand-logo-icon"
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sw-bg" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6b84f8" />
            <stop offset="0.5" stopColor="#4a6cf7" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#sw-bg)" />
        <rect x="13" y="11" width="18" height="24" rx="3" fill="#fff" />
        <path d="M16 17h12M16 21h12M16 25h8" stroke="#4a6cf7" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M27 29l10-10 2.5 2.5L29.5 31.5 27 32l.5-2.5z"
          fill="#3d5ce0"
        />
        <circle cx="35" cy="13" r="2.5" fill="#fff" fillOpacity="0.9" />
        <path
          d="M35 9.5v7M31.5 13h7"
          stroke="#fff"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark && (
        <div className="brand-logo-text">
          <strong>SmartWrite</strong>
          <span>AI</span>
        </div>
      )}
    </div>
  );
}
