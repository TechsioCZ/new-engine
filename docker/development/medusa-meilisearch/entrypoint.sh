#!/bin/sh
set -eu

if [ "$#" -eq 0 ]; then
  set -- /bin/meilisearch
fi

exec "$@"
