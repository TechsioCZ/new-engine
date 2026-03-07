#!/bin/sh
set -eu

MINIO_BOOTSTRAP_ALIAS="local"
MINIO_BOOTSTRAP_URL="http://127.0.0.1:9004"
MINIO_START_TIMEOUT_SECONDS=60
MINIO_ROOT_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minioadmin}"
MINIO_MEDUSA_ACCESS_KEY="${MINIO_MEDUSA_ACCESS_KEY:-}"
MINIO_MEDUSA_SECRET_KEY="${MINIO_MEDUSA_SECRET_KEY:-}"
MINIO_MEDUSA_BUCKET="${MINIO_MEDUSA_BUCKET:-}"
MINIO_MEDUSA_POLICY_NAME="medusa-runtime-object-access"
MINIO_MEDUSA_POLICY_PATH="/tmp/minio-medusa-runtime-policy.json"

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
    "${MINIO_ROOT_USER:?MINIO_ROOT_USER is required}" \
    "${MINIO_ROOT_PASSWORD:?MINIO_ROOT_PASSWORD is required}" >/dev/null 2>&1; do
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

ensure_medusa_bucket() {
  bucket_ref="$MINIO_BOOTSTRAP_ALIAS/${MINIO_MEDUSA_BUCKET:?MINIO_MEDUSA_BUCKET is required}"

  if ! mc mb --ignore-existing "$bucket_ref" >/dev/null 2>&1; then
    if ! mc stat "$bucket_ref" >/dev/null 2>&1; then
      echo "Failed to ensure MinIO bucket '$MINIO_MEDUSA_BUCKET'." >&2
      return 1
    fi
  fi
}

set_bucket_public_access() {
  bucket_ref="$MINIO_BOOTSTRAP_ALIAS/${MINIO_MEDUSA_BUCKET:?MINIO_MEDUSA_BUCKET is required}"

  if mc anonymous set download "$bucket_ref" >/dev/null 2>&1; then
    return 0
  fi
  echo "Failed to configure anonymous read access for bucket '$MINIO_MEDUSA_BUCKET'." >&2
  return 1
}

create_medusa_policy() {
  bucket_arn="arn:aws:s3:::${MINIO_MEDUSA_BUCKET:?MINIO_MEDUSA_BUCKET is required when configuring Medusa identity}/*"

  cat >"$MINIO_MEDUSA_POLICY_PATH" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MedusaObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:AbortMultipartUpload"
      ],
      "Resource": [
        "$bucket_arn"
      ]
    }
  ]
}
EOF

  if mc admin policy info "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_MEDUSA_POLICY_NAME" >/dev/null 2>&1; then
    return 0
  fi

  if mc admin policy create "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_MEDUSA_POLICY_NAME" "$MINIO_MEDUSA_POLICY_PATH" >/dev/null 2>&1; then
    return 0
  fi
  echo "Failed to create MinIO policy '$MINIO_MEDUSA_POLICY_NAME'." >&2
  return 1
}

attach_medusa_policy() {
  if mc admin policy attach "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_MEDUSA_POLICY_NAME" --user "$MINIO_MEDUSA_ACCESS_KEY" >/dev/null 2>&1; then
    return 0
  fi
  echo "Failed to attach policy '$MINIO_MEDUSA_POLICY_NAME' to '$MINIO_MEDUSA_ACCESS_KEY'." >&2
  return 1
}

bootstrap_medusa_identity() {
  : "${MINIO_MEDUSA_ACCESS_KEY:?MINIO_MEDUSA_ACCESS_KEY is required}"
  : "${MINIO_MEDUSA_SECRET_KEY:?MINIO_MEDUSA_SECRET_KEY is required}"
  : "${MINIO_MEDUSA_BUCKET:?MINIO_MEDUSA_BUCKET is required}"

  if ! mc admin user info "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_MEDUSA_ACCESS_KEY" >/dev/null 2>&1; then
    if ! mc admin user add "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_MEDUSA_ACCESS_KEY" "$MINIO_MEDUSA_SECRET_KEY" >/dev/null 2>&1; then
      if ! mc admin accesskey info "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_MEDUSA_ACCESS_KEY" >/dev/null 2>&1; then
        echo "Failed to provision MinIO identity for '$MINIO_MEDUSA_ACCESS_KEY'." >&2
        return 1
      fi
    fi
  fi

  create_medusa_policy
  attach_medusa_policy
}

ensure_medusa_bucket
set_bucket_public_access
bootstrap_medusa_identity

wait "$MINIO_PID"
