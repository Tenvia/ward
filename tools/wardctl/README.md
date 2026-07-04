# wardctl

Tiny Python CLI for operating a running Ward instance over HTTP.
Standard library only; installed and run with uv — no NPM anywhere.

Docker remains the primary Ward install path. This tool is a no-NPM
helper for users and design partners who want a terminal workflow
against Ward's HTTP API (the product contract).

## Usage

With uv, from the repo:

```bash
cd tools/wardctl
uv run wardctl health
uv run wardctl tenants
uv run wardctl constrain tenant_globex --reason "demo containment"
uv run wardctl audit
```

Or via uvx from anywhere in the repo:

```bash
uvx --from ./tools/wardctl wardctl health
```

## Configuration

| Env | Meaning | Default |
| --- | --- | --- |
| `WARD_API_URL` | Ward API base URL | `http://localhost:4317` |
| `WARD_CONTROL_TOKEN` | Bearer token for mutating endpoints (constrain/pause/resume) when the API requires control auth | unset |

Example against the user Docker bundle (which enables the demo token):

```bash
WARD_CONTROL_TOKEN=ward-demo-token uv run wardctl constrain tenant_globex --reason "demo"
```

## Status

Prototype. Read endpoints plus constrain/pause/resume. The approval
token flow and workflow-run management are available through the
Control Room and raw HTTP; adding them here is future work.
