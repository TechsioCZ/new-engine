#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE_TAG="${PNPM_ENV_IMAGE_TAG:-pnpm-env}"

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 64
fi

# Mount the host store at the same absolute path so installations stay reusable.
STORE_ROOT="${PNPM_TOOLCHAIN_STORE_DIR:-}"
if [[ -z "$STORE_ROOT" ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    STORE_PATH="$(pnpm --dir "$ROOT_DIR" store path)"
    if command -v cygpath >/dev/null 2>&1; then
      STORE_PATH="$(cygpath -u "$STORE_PATH")"
    fi
    STORE_ROOT="$(dirname "$STORE_PATH")"
  elif [[ "$(uname -s)" == "Darwin" ]]; then
    STORE_ROOT="$HOME/Library/pnpm/store"
  elif [[ -n "${LOCALAPPDATA:-}" ]] && command -v cygpath >/dev/null 2>&1; then
    STORE_ROOT="$(cygpath -u "$LOCALAPPDATA")/pnpm/store"
  else
    STORE_ROOT="${XDG_DATA_HOME:-$HOME/.local/share}/pnpm/store"
  fi
fi
if command -v cygpath >/dev/null 2>&1; then
  STORE_ROOT="$(cygpath -u "$STORE_ROOT")"
fi
if [[ "$STORE_ROOT" != /* || "$STORE_ROOT" == "$ROOT_DIR" || "$STORE_ROOT" == "$ROOT_DIR/"* ]]; then
  echo "The toolchain store must be an absolute directory outside the checkout." >&2
  exit 64
fi
mkdir -p "$STORE_ROOT"

docker build -f "$ROOT_DIR/docker/development/pnpm/Dockerfile" -t "$IMAGE_TAG" "$ROOT_DIR"

docker_args=(
  run
  --rm
  -e CI="${CI:-true}"
  -e HOME=/tmp/pnpm-toolchain-home
  -e XDG_CACHE_HOME=/tmp/pnpm-toolchain-cache
  -e "npm_config_store_dir=$STORE_ROOT"
  -v "$STORE_ROOT:$STORE_ROOT"
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
    docker_args+=(-e TERM="${TERM:-xterm-256color}")
    if [[ -z "${NO_COLOR:-}" ]]; then
      docker_args+=(-e FORCE_COLOR="${FORCE_COLOR:-1}")
    fi
  else
    docker_args+=(-i)
  fi
fi

exec docker "${docker_args[@]}" "$IMAGE_TAG" "$@"
