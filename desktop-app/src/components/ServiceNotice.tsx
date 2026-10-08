import type { ServiceStatus } from "../services/api";
import "./ServiceNotice.css";

interface Props {
  status: ServiceStatus;
}

export default function ServiceNotice({ status }: Props) {
  if (status === "online" || status === "checking") return null;
  return (
    <div className={`service-notice service-notice--${status}`} role="status">
      SmartWrite is temporarily unavailable. Editing still works.
    </div>
  );
}
