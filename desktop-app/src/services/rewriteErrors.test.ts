import { describe, expect, it } from "vitest";
import {
  RewriteServiceError,
  classifyRewriteFailure,
  userFacingRewriteError,
} from "./rewriteErrors";

describe("rewrite error mapping", () => {
  it("maps backend unavailable", () => {
    const facing = userFacingRewriteError(
      new RewriteServiceError("BACKEND_UNAVAILABLE", "down")
    );
    expect(facing.title).toMatch(/temporarily unavailable/i);
    expect(facing.message).toMatch(/document is safe/i);
  });

  it("maps timeout", () => {
    const facing = userFacingRewriteError(new RewriteServiceError("MODEL_TIMEOUT", "slow"));
    expect(facing.title).toMatch(/too long/i);
  });

  it("maps rate limit", () => {
    const facing = userFacingRewriteError(new RewriteServiceError("RATE_LIMITED", "busy"));
    expect(facing.title).toMatch(/busy/i);
  });

  it("maps invalid selection", () => {
    const facing = userFacingRewriteError(new RewriteServiceError("INVALID_REQUEST", "bad"));
    expect(facing.title).toMatch(/select some text/i);
  });

  it("classifies provider auth config without leaking keys", () => {
    const err = classifyRewriteFailure(
      503,
      JSON.stringify({
        success: false,
        code: "AUTH_CONFIGURATION_ERROR",
        message: "Rewrite provider is not configured.",
      })
    );
    expect(err.code).toBe("AUTH_CONFIGURATION_ERROR");
    const facing = userFacingRewriteError(err);
    expect(facing.message.toLowerCase()).not.toContain("sk-");
    expect(facing.message.toLowerCase()).not.toContain("api key");
  });

  it("classifies rewrite failure payload", () => {
    const err = classifyRewriteFailure(
      200,
      JSON.stringify({ success: false, code: "MODEL_TIMEOUT", message: "timed out" })
    );
    expect(err.code).toBe("MODEL_TIMEOUT");
  });
});
