import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("SmartWrite UI error:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const isDev = Boolean(import.meta.env?.DEV);
      return (
        <div className="error-boundary" role="alert">
          <h1>Something went wrong</h1>
          <p>SmartWrite hit an unexpected error. Your drafts are still saved locally.</p>
          {isDev && <p className="error-boundary-detail">{this.state.error.message}</p>}
          <button type="button" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
