import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { installBetaAnalyticsBridge } from "./services/betaAnalytics";
import { installTelemetryBridge } from "./services/telemetry";
import "./styles/global.css";

installTelemetryBridge();
installBetaAnalyticsBridge();

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
