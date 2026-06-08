import "./Logo.css";

interface Props {
  size?: number;
  showWordmark?: boolean;
}

export default function Logo({ size = 32, showWordmark = true }: Props) {
  return (
    <div className="brand-logo" aria-label="SmartWrite AI">
      <svg
        className="brand-logo-icon"
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sw-logo-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0d9488" />
            <stop offset="1" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill="url(#sw-logo-grad)" />
        <path
          d="M12 28V12h10.5c3.2 0 5.5 1.8 5.5 4.6 0 2.1-1.2 3.6-3.1 4.2 2.4.5 3.9 2.2 3.9 4.8 0 3.1-2.6 4.4-6.2 4.4H12zm4.2-14.2v4.3h5.8c1.5 0 2.4-.7 2.4-2.1 0-1.4-.9-2.2-2.5-2.2h-5.7zm0 8.3v4.5h6.4c1.8 0 2.8-.8 2.8-2.3 0-1.5-1-2.2-2.9-2.2h-6.3z"
          fill="#fff"
        />
        <path
          d="M27.5 11.5l2 1.2-7.5 12.8-2-1.2 7.5-12.8z"
          fill="#fff"
          opacity="0.9"
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
