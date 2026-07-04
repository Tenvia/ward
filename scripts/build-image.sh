#!/usr/bin/env bash
# Build the Ward API image (API + bundled Control Room + OpenAPI).
#
#   ./scripts/build-image.sh local       # -> ward-api:local, never pushes
#   ./scripts/build-image.sh multiarch   # prepared multi-arch build, never pushes
#
# Publishing happens only via .github/workflows/docker-image.yml on a
# version tag or manual dispatch — never from this script.
set -euo pipefail

cd "$(dirname "$0")/.."

MODE="${1:-local}"
IMAGE_NAME="${WARD_IMAGE_NAME:-ghcr.io/10via/ward-api}"
TAG="${WARD_IMAGE_TAG:-dev}"

case "$MODE" in
  local)
    echo "Building ward-api:local (single arch, no push)..."
    docker build -f apps/api/Dockerfile -t ward-api:local .
    echo "Built ward-api:local"
    echo "Try it:"
    echo "  docker run --rm -p 4317:4317 -e WARD_REQUIRE_CONTROL_TOKEN=true -e WARD_CONTROL_TOKEN=demo-token ward-api:local"
    ;;
  multiarch)
    echo "Multi-arch build (linux/amd64, linux/arm64) — NO PUSH."
    echo "Image name: $IMAGE_NAME:$TAG"
    if ! docker buildx version >/dev/null 2>&1; then
      echo "docker buildx is required for multi-arch. Aborting." >&2
      exit 1
    fi
    # push=false: validates the multi-arch build without publishing.
    # The real publish path is the GitHub Actions workflow.
    docker buildx build \
      --platform linux/amd64,linux/arm64 \
      -f apps/api/Dockerfile \
      -t "$IMAGE_NAME:$TAG" \
      --output type=image,push=false \
      . || {
        echo "" >&2
        echo "If this failed with a driver error, create a builder first:" >&2
        echo "  docker buildx create --use" >&2
        exit 1
      }
    echo "Multi-arch build completed (not pushed)."
    ;;
  *)
    echo "Usage: $0 [local|multiarch]" >&2
    exit 2
    ;;
esac
