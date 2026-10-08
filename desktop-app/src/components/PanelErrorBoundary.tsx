import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  title?: string;
  message?: string;
}

interface State {
  error: Error | null;
}

/** Isolates secondary UI failures so the editor stays available. */
export default class PanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("SmartWrite panel error:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel-error-boundary" role="alert">
          <strong>{this.props.title ?? "Couldn't load this panel"}</strong>
          <p>{this.props.message ?? "Your document is safe."}</p>
          <button type="button" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
