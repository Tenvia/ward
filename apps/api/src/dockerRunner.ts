// Docker workflow runner — DEV-ONLY PROTOTYPE, disabled by default.
//
// Enable with WARD_ENABLE_DOCKER_RUNNER=true. Safety rules:
//   - only images on the WARD_DOCKER_ALLOWED_IMAGES allowlist run
//   - hard timeout (WARD_DOCKER_RUN_TIMEOUT_MS, default 30s), after
//     which the container is killed
//   - no host mounts, no privileged mode, no extra capabilities
//   - one container per run, named ward-<runId>, removed on exit
//
// This shells out to the local docker CLI, which means the Ward API
// host needs Docker and the daemon running. That is acceptable for a
// dev prototype only; a production runner needs a proper isolation
// and scheduling story. Not production-ready. See docs/DOCKER_RUNBOOK.md.
import { spawn } from "node:child_process";
import { config } from "./config.js";
import type { WorkflowRun } from "./types.js";

export type DockerRunnerStatus = "disabled" | "prototype";

export function dockerRunnerStatus(): DockerRunnerStatus {
  return config.enableDockerRunner ? "prototype" : "disabled";
}

export interface DockerRunResult {
  exitCode: number;
  outputTail: string;
}

export async function startDockerRun(run: WorkflowRun): Promise<DockerRunResult> {
  if (!config.enableDockerRunner) {
    throw new Error(
      "Docker runner is disabled (dev-only prototype). " +
        "Set WARD_ENABLE_DOCKER_RUNNER=true to enable it locally. " +
        `Run ${run.id} was not started.`
    );
  }
  const image = run.image;
  if (!image || !config.dockerAllowedImages.includes(image)) {
    throw new Error(
      `Image "${image ?? "(none)"}" is not on the Docker runner allowlist ` +
        `[${config.dockerAllowedImages.join(", ")}]. Run ${run.id} was not started.`
    );
  }

  const args = [
    "run",
    "--rm",
    "--name",
    `ward-${run.id}`,
    "-e",
    `WARD_TENANT_ID=${run.tenantId}`,
    "-e",
    `WARD_BASE_URL=http://host.docker.internal:${config.port}`,
    image,
    ...(run.command ?? []),
  ];

  return new Promise<DockerRunResult>((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    const collect = (chunk: Buffer) => {
      output = (output + chunk.toString()).slice(-4000);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);

    const timer = setTimeout(() => {
      spawn("docker", ["kill", `ward-${run.id}`], { stdio: "ignore" });
      reject(
        new Error(
          `Docker run ${run.id} exceeded ${config.dockerRunTimeoutMs}ms and was killed. ` +
            `Output tail: ${output.trim().slice(-500)}`
        )
      );
    }, config.dockerRunTimeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to invoke docker CLI: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const exitCode = code ?? -1;
      if (exitCode === 0) {
        resolve({ exitCode, outputTail: output.trim().slice(-1000) });
      } else {
        reject(
          new Error(
            `Docker run ${run.id} exited with code ${exitCode}. ` +
              `Output tail: ${output.trim().slice(-500)}`
          )
        );
      }
    });
  });
}

// Best-effort kill for operator cancellation of an in-flight run.
export function killDockerRun(runId: string): void {
  spawn("docker", ["kill", `ward-${runId}`], { stdio: "ignore" });
}
