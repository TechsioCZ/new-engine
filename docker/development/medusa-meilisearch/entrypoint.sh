#!/bin/sh
set -eu

# Allow Medusa-style env to drive Meilisearch without duplicating variables.
if [ -z "${MEILI_MASTER_KEY:-}" ] && [ -n "${MEILISEARCH_API_KEY:-}" ]; then
  export MEILI_MASTER_KEY="${MEILISEARCH_API_KEY}"
fi

if [ "$#" -eq 0 ]; then
  set -- /bin/meilisearch
fi

exec "$@"
