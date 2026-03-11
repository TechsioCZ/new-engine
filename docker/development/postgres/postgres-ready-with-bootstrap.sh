#!/usr/bin/env sh
set -eu

bootstrap_marker="${POSTGRES_BOOTSTRAP_MARKER:-/tmp/postgres-role-bootstrap.complete}"

pg_isready -h 127.0.0.1 -p "${PGPORT:-5432}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB:-postgres}" >/dev/null 2>&1
test -f "$bootstrap_marker"
