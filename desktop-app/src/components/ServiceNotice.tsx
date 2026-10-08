import type { ServiceStatus } from "../services/api";
import "./ServiceNotice.css";

interface Props {
  status: ServiceStatus;
}

export default function ServiceNotice({ status }: Props) {
  if (status === "online" || status === "checking") return null;
  const message =
    status === "degraded"
      ? "AI rewrite is limited right now. Editing and suggestions still work."
      : "SmartWrite is temporarily unavailable. Editing still works.";
  return (
    <div className={`service-notice service-notice--${status}`} role="status">
      {message}
    </div>
  );
}
