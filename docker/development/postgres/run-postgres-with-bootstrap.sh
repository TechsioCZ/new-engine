#!/usr/bin/env sh
set -eu

postgres_pid=""
bootstrap_marker="${POSTGRES_BOOTSTRAP_MARKER:-/tmp/postgres-role-bootstrap.complete}"

start_postgres() {
  su -c "/usr/local/bin/docker-entrypoint.sh -c file_copy_method=clone" postgres &
  postgres_pid="$!"
}

wait_for_postgres_ready() {
  while true; do
    if pg_isready -h 127.0.0.1 -p "${PGPORT:-5432}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB:-postgres}" >/dev/null 2>&1; then
      return 0
    fi

    if ! kill -0 "$postgres_pid" >/dev/null 2>&1; then
      wait "$postgres_pid"
      return 1
    fi

    sleep 2
  done
}

shutdown_postgres() {
  if [ -n "$postgres_pid" ] && kill -0 "$postgres_pid" >/dev/null 2>&1; then
    kill -TERM "$postgres_pid" >/dev/null 2>&1 || true
    wait "$postgres_pid" || true
  fi
}

trap 'shutdown_postgres' INT TERM

rm -f "$bootstrap_marker"
start_postgres
wait_for_postgres_ready
/usr/local/bin/postgres-role-bootstrap
touch "$bootstrap_marker"
wait "$postgres_pid"
