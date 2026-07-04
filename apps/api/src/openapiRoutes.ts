// Serve the committed OpenAPI contract. HTTP/OpenAPI is Ward's
// primary integration contract; the files ship inside the Docker
// image and with the repo, so no tooling is needed to read them.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Express, Request, Response } from "express";

// Search order: bundled copy (Docker image), then repo layout (local dev).
const CANDIDATE_DIRS = [
  process.env.WARD_OPENAPI_DIR,
  "openapi",
  "../../openapi",
].filter((d): d is string => Boolean(d));

function findContract(file: string): string | null {
  for (const dir of CANDIDATE_DIRS) {
    const path = resolve(dir, file);
    if (existsSync(path)) return path;
  }
  return null;
}

export function openapiAvailable(): boolean {
  return findContract("ward.v0.yaml") !== null;
}

export function mountOpenapiRoutes(app: Express): void {
  app.get("/openapi.yaml", (_req: Request, res: Response) => {
    const path = findContract("ward.v0.yaml");
    if (!path) {
      res.status(404).json({
        error: "ward_openapi_not_bundled",
        message: "OpenAPI contract not found in this build. See openapi/ward.v0.yaml in the repo.",
      });
      return;
    }
    res.type("application/yaml").send(readFileSync(path, "utf8"));
  });

  app.get("/openapi.json", (_req: Request, res: Response) => {
    const path = findContract("ward.v0.json");
    if (!path) {
      res.status(404).json({
        error: "ward_openapi_not_bundled",
        message: "OpenAPI JSON not found in this build. See openapi/ward.v0.json in the repo.",
      });
      return;
    }
    res.type("application/json").send(readFileSync(path, "utf8"));
  });
}
