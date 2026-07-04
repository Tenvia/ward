// Minimal shared-token auth for mutating control endpoints.
// Prototype boundary, not production RBAC: one static bearer token,
// no roles, no rotation, no per-operator identity. Disabled by
// default (WARD_REQUIRE_CONTROL_TOKEN=true to enable). Read endpoints
// stay open in Phase 1.
import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config.js";

function tokenMatches(candidate: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(config.controlToken);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export function requireControlAuth(req: Request, res: Response, next: NextFunction): void {
  if (!config.requireControlToken) {
    next();
    return;
  }
  if (!config.controlToken) {
    res.status(503).json({
      error: "ward_control_auth_misconfigured",
      message:
        "WARD_REQUIRE_CONTROL_TOKEN=true but WARD_CONTROL_TOKEN is empty; " +
        "refusing all control mutations until a token is configured.",
    });
    return;
  }
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!tokenMatches(token)) {
    res.status(401).json({
      error: "ward_control_unauthorized",
      message: "Missing or invalid control token. Send: Authorization: Bearer <WARD_CONTROL_TOKEN>",
    });
    return;
  }
  next();
}

export function controlAuthStatus(): string {
  if (config.requireControlToken) {
    return config.controlToken
      ? "required (shared bearer token; prototype, not production RBAC)"
      : "MISCONFIGURED: required but no token set; control mutations refused";
  }
  return "DISABLED - control endpoints are unauthenticated (set WARD_REQUIRE_CONTROL_TOKEN=true and WARD_CONTROL_TOKEN)";
}
