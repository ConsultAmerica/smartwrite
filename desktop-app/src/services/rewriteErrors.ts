export type RewriteErrorCode =
  | "BACKEND_UNAVAILABLE"
  | "BACKEND_UNREACHABLE"
  | "ENDPOINT_MISSING"
  | "AUTH_CONFIGURATION_ERROR"
  | "API_KEY_MISSING"
  | "MODEL_UNAVAILABLE"
  | "MODEL_TIMEOUT"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "INVALID_REQUEST"
  | "CLIENT_ERROR"
  | "SERVER_ERROR"
  | "INTERNAL_ERROR"
  | "UNKNOWN";

export class RewriteServiceError extends Error {
  code: RewriteErrorCode;
  status?: number;

  constructor(code: RewriteErrorCode, message: string, status?: number) {
    super(message);
    this.name = "RewriteServiceError";
    this.code = code;
    this.status = status;
  }
}

export function userFacingRewriteError(err: unknown): {
  title: string;
  message: string;
  code: RewriteErrorCode;
} {
  if (err instanceof RewriteServiceError) {
    switch (err.code) {
      case "BACKEND_UNAVAILABLE":
      case "BACKEND_UNREACHABLE":
        return {
          title: "SmartWrite is temporarily unavailable",
          message: "Your document is safe. Try again in a moment.",
          code: err.code,
        };
      case "MODEL_TIMEOUT":
      case "TIMEOUT":
        return {
          title: "Rewrite took too long",
          message: "Please try again.",
          code: err.code,
        };
      case "RATE_LIMITED":
        return {
          title: "SmartWrite is busy right now",
          message: "Wait a moment and try again.",
          code: err.code,
        };
      case "INVALID_REQUEST":
        return {
          title: "Select some text to rewrite",
          message: "Highlight a passage, then try Improve or Rewrite.",
          code: err.code,
        };
      case "AUTH_CONFIGURATION_ERROR":
      case "API_KEY_MISSING":
      case "MODEL_UNAVAILABLE":
      case "PROVIDER_ERROR":
        return {
          title: "Rewrite is temporarily unavailable",
          message: "Your document is safe. Try again in a moment.",
          code: err.code,
        };
      case "ENDPOINT_MISSING":
        return {
          title: "Rewrite isn’t available",
          message: "Check your API configuration, then try again.",
          code: err.code,
        };
      default:
        return {
          title: "Couldn’t rewrite this text",
          message: "Something went wrong. Try again in a moment.",
          code: err.code,
        };
    }
  }
  return {
    title: "Couldn’t rewrite this text",
    message: "Your document is safe. Try again in a moment.",
    code: "UNKNOWN",
  };
}

export function classifyRewriteFailure(status: number, bodyText: string): RewriteServiceError {
  let parsed: { error?: string; code?: string; message?: string } | null = null;
  try {
    parsed = JSON.parse(bodyText) as { error?: string; code?: string; message?: string };
  } catch {
    parsed = null;
  }

  const code = (parsed?.code || parsed?.error || "").toUpperCase();
  const message = parsed?.message || "";

  if (code === "MODEL_UNAVAILABLE" || /model .* not found/i.test(bodyText)) {
    return new RewriteServiceError(
      "MODEL_UNAVAILABLE",
      message || "The writing service is temporarily unavailable.",
      status
    );
  }
  if (
    code === "AUTH_CONFIGURATION_ERROR" ||
    code === "API_KEY_MISSING" ||
    /api[_ ]?key/i.test(bodyText)
  ) {
    return new RewriteServiceError(
      "AUTH_CONFIGURATION_ERROR",
      message || "Writing service credentials are missing.",
      status
    );
  }
  if (code === "RATE_LIMITED" || status === 429) {
    return new RewriteServiceError("RATE_LIMITED", message || "Rate limited.", status);
  }
  if (code === "MODEL_TIMEOUT" || code === "TIMEOUT" || status === 408 || status === 504) {
    return new RewriteServiceError("MODEL_TIMEOUT", message || "Rewrite timed out.", status);
  }
  if (code === "INVALID_REQUEST" || status === 400) {
    return new RewriteServiceError("INVALID_REQUEST", message || "Invalid rewrite request.", status);
  }
  if (code === "PROVIDER_ERROR") {
    return new RewriteServiceError("PROVIDER_ERROR", message || "Provider error.", status);
  }
  if (status === 404) {
    return new RewriteServiceError("ENDPOINT_MISSING", "Rewrite endpoint not found.", status);
  }
  if (status === 503) {
    return new RewriteServiceError(
      "BACKEND_UNAVAILABLE",
      message || "Backend unavailable.",
      status
    );
  }
  if (status >= 500) {
    return new RewriteServiceError(
      "INTERNAL_ERROR",
      message || "The writing service returned an error.",
      status
    );
  }
  if (status >= 400) {
    return new RewriteServiceError(
      "CLIENT_ERROR",
      message || `Rewrite request failed (${status}).`,
      status
    );
  }
  if (code) {
    return new RewriteServiceError(
      (code as RewriteErrorCode) || "UNKNOWN",
      message || bodyText || "Rewrite failed.",
      status
    );
  }
  return new RewriteServiceError("UNKNOWN", message || bodyText || "Rewrite failed.", status);
}
