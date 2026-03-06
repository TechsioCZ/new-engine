#!/bin/sh
set -eu

MINIO_BOOTSTRAP_ALIAS="${MINIO_BOOTSTRAP_ALIAS:-local}"
MINIO_BOOTSTRAP_URL="${MINIO_BOOTSTRAP_URL:-http://127.0.0.1:9004}"
MINIO_START_TIMEOUT_SECONDS="${MINIO_START_TIMEOUT_SECONDS:-60}"
MINIO_BUCKET_METADATA_ZIP_PATH="${MINIO_BUCKET_METADATA_ZIP_PATH:-/config/local-bucket-metadata.zip}"
MINIO_BUCKET_METADATA_IMPORTED_MARKER="${MINIO_BUCKET_METADATA_IMPORTED_MARKER:-/data/.minio-bucket-metadata-imported}"
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"

if [ "$#" -eq 0 ]; then
  set -- server /data --console-address :9003 --address :9004
fi

minio "$@" &
MINIO_PID=$!

on_term() {
  kill "$MINIO_PID" 2>/dev/null || true
}
trap on_term INT TERM

wait_for_minio() {
  elapsed=0

  while ! mc alias set "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_BOOTSTRAP_URL" \
    "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required (or fallback via MINIO_ACCESS_KEY)}" \
    "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required (or fallback via MINIO_SECRET_KEY)}" >/dev/null 2>&1; do
    if ! kill -0 "$MINIO_PID" 2>/dev/null; then
      wait "$MINIO_PID"
      return 1
    fi

    elapsed=$((elapsed + 1))
    if [ "$elapsed" -ge "$MINIO_START_TIMEOUT_SECONDS" ]; then
      echo "MinIO bootstrap timed out after ${MINIO_START_TIMEOUT_SECONDS}s while waiting for readiness." >&2
      return 1
    fi

    sleep 1
  done
}

wait_for_minio

if [ -n "${MINIO_ACCESS_KEY:-}" ] && [ -n "${MINIO_SECRET_KEY:-}" ]; then
  if ! mc admin accesskey info "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_ACCESS_KEY" >/dev/null 2>&1; then
    mc admin accesskey create \
      --access-key "$MINIO_ACCESS_KEY" \
      --secret-key "$MINIO_SECRET_KEY" \
      "$MINIO_BOOTSTRAP_ALIAS"
  fi
fi

if [ "${MINIO_BUCKET_METADATA_IMPORT_ENABLED:-1}" = "1" ] && [ -f "$MINIO_BUCKET_METADATA_ZIP_PATH" ]; then
  marker_dir="${MINIO_BUCKET_METADATA_IMPORTED_MARKER%/*}"
  if [ "$marker_dir" = "$MINIO_BUCKET_METADATA_IMPORTED_MARKER" ]; then
    marker_dir="."
  fi
  mkdir -p "$marker_dir"

  if [ ! -f "$MINIO_BUCKET_METADATA_IMPORTED_MARKER" ]; then
    mc admin cluster bucket import "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_BUCKET_METADATA_ZIP_PATH"
    touch "$MINIO_BUCKET_METADATA_IMPORTED_MARKER"
  fi
fi

wait "$MINIO_PID"
