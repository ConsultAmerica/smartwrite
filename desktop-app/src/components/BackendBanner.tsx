import "./BackendBanner.css";

interface Props {
  online: boolean;
  apiUrl: string;
}

export default function BackendBanner({ online, apiUrl }: Props) {
  if (online) return null;

  return (
    <div className="backend-banner" role="alert">
      <strong>Backend offline</strong>
      <span>
        Start the API at {apiUrl} — run <code>scripts\start-backend.cmd</code> or{" "}
        <code>npm run dev</code> from the project root.
      </span>
    </div>
  );
}
