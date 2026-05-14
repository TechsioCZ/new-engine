#!/bin/sh
set -eu

mode="${1:-start}"
if [ "$#" -gt 0 ]; then
  shift
fi

case "$mode" in
  migrate)
    exec pnpm --filter @nmit/payload payload migrate "$@"
    ;;
  seed)
    exec pnpm --filter @nmit/payload run seed "$@"
    ;;
  generate-importmap)
    exec pnpm --filter @nmit/payload run generate:importmap "$@"
    ;;
  dev|devsafe|start)
    if [ "${PAYLOAD_MIGRATE_ON_STARTUP:-1}" = "1" ]; then
      pnpm --filter @nmit/payload payload migrate
    fi

    if [ "${PAYLOAD_GENERATE_IMPORTMAP_ON_STARTUP:-1}" = "1" ]; then
      pnpm --filter @nmit/payload run generate:importmap
    fi

    if [ "${PAYLOAD_SEED_ON_STARTUP:-1}" = "1" ]; then
      pnpm --filter @nmit/payload run seed
    fi

    exec pnpm --filter @nmit/payload run "$mode" --hostname "${PAYLOAD_HOST:-0.0.0.0}" --port "${PORT:-8083}" "$@"
    ;;
  *)
    exec "$mode" "$@"
    ;;
esac
