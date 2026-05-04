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
    generate_importmap_default=0
    if [ "$mode" = "dev" ] || [ "$mode" = "devsafe" ]; then
      generate_importmap_default=1
    fi

    if [ "${PAYLOAD_GENERATE_IMPORTMAP_ON_STARTUP:-$generate_importmap_default}" = "1" ]; then
      pnpm --filter @nmit/payload run generate:importmap
    fi

    exec pnpm --filter @nmit/payload run "$mode" --hostname "${PAYLOAD_HOST:-0.0.0.0}" --port "${PORT:-8083}" "$@"
    ;;
  *)
    exec "$mode" "$@"
    ;;
esac
