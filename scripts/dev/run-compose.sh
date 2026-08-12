#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

case "$(uname -s 2>/dev/null || true)" in
  Linux*)
    default_uid="$(id -u)"
    default_gid="$(id -g)"
    ;;
  *)
    # Docker Desktop translates bind-mount ownership. Use the node image's
    # existing account instead of leaking a host-specific macOS/Windows ID.
    default_uid=1000
    default_gid=1000
    ;;
esac

export DC_DEV_UID="${DC_DEV_UID:-$default_uid}"
export DC_DEV_GID="${DC_DEV_GID:-$default_gid}"

cd "$ROOT_DIR"
exec docker compose \
  -f docker-compose.yaml \
  -f docker-compose.dev-user.yaml \
  -p "${PROJECT_NAME:-new-engine}" \
  "$@"
