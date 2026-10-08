import { useId } from "react";
import "./Logo.css";

interface Props {
  size?: number;
  showWordmark?: boolean;
}

/** Flat product mark: stylized S with a writing underline — no sparkle. */
export default function Logo({ size = 28, showWordmark = true }: Props) {
  const uid = useId().replace(/:/g, "");
  const bgId = `sw-bg-${uid}`;

  return (
    <div className="brand-logo" aria-label="SmartWrite">
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
          <linearGradient id={bgId} x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F9D8A" />
            <stop offset="1" stopColor="#0B8F7B" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="8" fill={`url(#${bgId})`} />
        <path
          d="M25.2 13.2c-.9-1.1-2.3-1.7-4-1.7-2.8 0-4.6 1.5-4.6 3.5 0 1.8 1.3 2.8 3.8 3.4l1.4.3c1.9.4 2.8 1 2.8 2.2 0 1.4-1.3 2.3-3.3 2.3-1.7 0-3-.6-3.9-1.7l-1.6 1.7c1.3 1.5 3.2 2.3 5.5 2.3 3.3 0 5.5-1.7 5.5-4.1 0-2-1.4-3.1-4-3.7l-1.4-.3c-1.7-.4-2.5-.9-2.5-1.9 0-1.1 1.1-1.9 2.8-1.9 1.3 0 2.4.5 3.1 1.4l1.4-1.8z"
          fill="#fff"
        />
        <path d="M12 29.5h16" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
      </svg>
      {showWordmark && <span className="brand-logo-text">SmartWrite</span>}
    </div>
  );
}
