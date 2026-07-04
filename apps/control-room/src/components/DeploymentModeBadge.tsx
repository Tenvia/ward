import type { DeploymentMode } from "../types";

export function DeploymentModeBadge({ mode }: { mode: DeploymentMode }) {
  return <span className="chip mode">{mode}</span>;
}
