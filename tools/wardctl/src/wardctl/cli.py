"""wardctl: operate a running Ward instance over HTTP.

Standard library only. This is a no-NPM helper for users and design
partners; Docker remains the primary Ward install path, and HTTP is
the product contract this CLI speaks.

Environment:
  WARD_API_URL        Ward API base URL (default http://localhost:4317)
  WARD_CONTROL_TOKEN  Bearer token for mutating control endpoints
                      (required only when the Ward API runs with
                      WARD_REQUIRE_CONTROL_TOKEN=true)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_API = "http://localhost:4317"


def _base_url() -> str:
    return os.environ.get("WARD_API_URL", DEFAULT_API).rstrip("/")


def _request(method: str, path: str, body: dict | None = None) -> tuple[int, dict | list | None]:
    url = f"{_base_url()}{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if body is not None:
        req.add_header("content-type", "application/json")
    token = os.environ.get("WARD_CONTROL_TOKEN", "")
    if token:
        req.add_header("authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode() or "null")
    except urllib.error.HTTPError as err:
        try:
            payload = json.loads(err.read().decode() or "null")
        except json.JSONDecodeError:
            payload = None
        return err.code, payload
    except urllib.error.URLError as err:
        print(f"error: Ward API unreachable at {_base_url()} ({err.reason})", file=sys.stderr)
        sys.exit(2)


def _print(payload: object) -> None:
    print(json.dumps(payload, indent=2))


def _transition(action: str, tenant_id: str, actor: str, reason: str) -> int:
    status, payload = _request(
        "POST",
        f"/ward/tenants/{tenant_id}/{action}",
        {"actor": actor, "reason": reason},
    )
    _print(payload)
    if status == 401:
        print(
            "hint: this endpoint requires WARD_CONTROL_TOKEN when the API "
            "runs with WARD_REQUIRE_CONTROL_TOKEN=true",
            file=sys.stderr,
        )
    return 0 if status == 200 else 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="wardctl",
        description="Operate a running Ward instance over HTTP (prototype helper).",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("health", help="show Ward health")
    sub.add_parser("tenants", help="list tenants")
    tenant = sub.add_parser("tenant", help="show one tenant")
    tenant.add_argument("tenant_id")
    sub.add_parser("audit", help="show the audit trail")
    sub.add_parser("runs", help="list workflow runs")

    for action in ("constrain", "pause", "resume"):
        p = sub.add_parser(action, help=f"{action} a tenant (needs control token if auth is on)")
        p.add_argument("tenant_id")
        p.add_argument("--actor", default="wardctl")
        p.add_argument("--reason", default=f"{action} via wardctl")

    args = parser.parse_args(argv)

    if args.command == "health":
        status, payload = _request("GET", "/health")
        _print(payload)
        return 0 if status == 200 else 1
    if args.command == "tenants":
        status, payload = _request("GET", "/ward/tenants")
        _print(payload)
        return 0 if status == 200 else 1
    if args.command == "tenant":
        status, payload = _request("GET", f"/ward/tenants/{args.tenant_id}")
        _print(payload)
        return 0 if status == 200 else 1
    if args.command == "audit":
        status, payload = _request("GET", "/ward/audit")
        _print(payload)
        return 0 if status == 200 else 1
    if args.command == "runs":
        status, payload = _request("GET", "/ward/workflow-runs")
        _print(payload)
        return 0 if status == 200 else 1
    return _transition(args.command, args.tenant_id, args.actor, args.reason)


if __name__ == "__main__":
    sys.exit(main())
