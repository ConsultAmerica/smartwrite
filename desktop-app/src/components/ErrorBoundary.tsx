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
    console.error("SmartWrite UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h1>SmartWrite AI failed to load</h1>
          <p>{this.state.error.message}</p>
          <pre>{this.state.error.stack}</pre>
          <button type="button" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
