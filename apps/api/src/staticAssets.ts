// Serve the built Control Room from the API process so users get one
// container, one port, no NPM. Assets are produced by a Docker build
// stage (see apps/api/Dockerfile) or by a contributor UI build; if
// they are missing, GET / explains what to do instead of 404ing.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import express from "express";
import type { Express, Request, Response } from "express";

const UI_DIR = resolve(process.env.WARD_UI_DIR ?? "ui");

export function uiAvailable(): boolean {
  return existsSync(resolve(UI_DIR, "index.html"));
}

export function mountStaticUi(app: Express): void {
  if (uiAvailable()) {
    app.use(express.static(UI_DIR));
    // Single-page app: anything that is not an API route falls back to
    // index.html. API routes are mounted before this.
    app.get("/", (_req: Request, res: Response) => {
      res.sendFile(resolve(UI_DIR, "index.html"));
    });
    console.log(`Control Room UI served from ${UI_DIR}`);
    return;
  }
  app.get("/", (_req: Request, res: Response) => {
    res.status(200).json({
      service: "ward-api",
      controlRoom: "not bundled in this build",
      message:
        "Ward API is running, but no Control Room assets were found. " +
        "Use the Docker bundle (docker compose -f docker-compose.user.yml up --build), " +
        "which builds the UI into the image, or run the contributor dev server " +
        "(cd apps/control-room && npm run dev).",
      health: "/health",
      api: "/ward/tenants",
    });
  });
}
