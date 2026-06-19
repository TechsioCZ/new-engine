#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE_TAG="${PNPM_ENV_IMAGE_TAG:-pnpm-env}"

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 64
fi

docker build -f "$ROOT_DIR/docker/development/pnpm/Dockerfile" -t "$IMAGE_TAG" "$ROOT_DIR"

docker_args=(
  run
  --rm
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0
  -e CI="${CI:-true}"
  -e HOME=/tmp/pnpm-toolchain-home
  -e XDG_CACHE_HOME=/tmp/pnpm-toolchain-cache
  -v "$ROOT_DIR:$ROOT_DIR"
  -w "$ROOT_DIR"
)

case "$(uname -s 2>/dev/null || true)" in
  MINGW* | MSYS* | CYGWIN*)
    ;;
  *)
    if [[ "${PNPM_TOOLCHAIN_DOCKER_USER:-host}" == "host" ]] && command -v id >/dev/null 2>&1; then
      docker_args+=(--user "$(id -u):$(id -g)")
    fi
    ;;
esac

if [[ "${PNPM_TOOLCHAIN_TTY:-0}" == "1" ]]; then
  if [[ -t 0 && -t 1 ]]; then
    docker_args+=(-it)
  else
    docker_args+=(-i)
  fi
fi

exec docker "${docker_args[@]}" "$IMAGE_TAG" "$@"
