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
MINIO_MEDUSA_POLICY_CURRENT_PATH="/tmp/minio-medusa-runtime-policy-current.json"

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
  bucket_name="${MINIO_MEDUSA_BUCKET:?MINIO_MEDUSA_BUCKET is required when configuring Medusa identity}"
  bucket_root_arn="arn:aws:s3:::${bucket_name}"
  bucket_object_arn="${bucket_root_arn}/*"

  cat >"$MINIO_MEDUSA_POLICY_PATH" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MedusaBucketMetadataAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetBucketLocation",
        "s3:ListBucket"
      ],
      "Resource": [
        "$bucket_root_arn"
      ]
    },
    {
      "Sid": "MedusaObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "$bucket_object_arn"
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

normalize_policy_file() {
  version=""
  sid_lines=""
  effect_lines=""
  action_lines=""
  resource_lines=""

  while IFS= read -r raw_line; do
    line="$(printf '%s' "$raw_line" | tr -d '[:space:]')"

    case "$line" in
      *\"Version\":\"*)
        value="${line#*\"Version\":\"}"
        version="${value%%\"*}"
        ;;
      *\"Sid\":\"*)
        value="${line#*\"Sid\":\"}"
        value="${value%%\"*}"
        sid_lines="${sid_lines}${value}
"
        ;;
      *\"Effect\":\"*)
        value="${line#*\"Effect\":\"}"
        value="${value%%\"*}"
        effect_lines="${effect_lines}${value}
"
        ;;
      *\"s3:*)
        value="${line#\"}"
        value="${value%%\"*}"
        action_lines="${action_lines}${value}
"
        ;;
      *\"arn:aws:s3:::*)
        value="${line#\"}"
        value="${value%%\"*}"
        resource_lines="${resource_lines}${value}
"
        ;;
    esac
  done <"$1"

  sids="$(printf '%s' "$sid_lines" | sort | tr '\n' ',')"
  effects="$(printf '%s' "$effect_lines" | sort | tr '\n' ',')"
  actions="$(printf '%s' "$action_lines" | sort | tr '\n' ',')"
  resources="$(printf '%s' "$resource_lines" | sort | tr '\n' ',')"

  printf '%s|%s|%s|%s|%s\n' "$version" "$sids" "$effects" "$actions" "$resources"
}

reconcile_medusa_policy() {
  if ! mc admin policy info \
    "$MINIO_BOOTSTRAP_ALIAS" \
    "$MINIO_MEDUSA_POLICY_NAME" \
    --policy-file "$MINIO_MEDUSA_POLICY_CURRENT_PATH" >/dev/null 2>&1; then
    create_medusa_policy
    return 0
  fi

  expected_policy="$(normalize_policy_file "$MINIO_MEDUSA_POLICY_PATH")"
  current_policy="$(normalize_policy_file "$MINIO_MEDUSA_POLICY_CURRENT_PATH")"

  if [ "$expected_policy" = "$current_policy" ]; then
    return 0
  fi

  mc admin policy detach \
    "$MINIO_BOOTSTRAP_ALIAS" \
    "$MINIO_MEDUSA_POLICY_NAME" \
    --user "$MINIO_MEDUSA_ACCESS_KEY" >/dev/null 2>&1 || true

  if ! mc admin policy remove "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_MEDUSA_POLICY_NAME" >/dev/null 2>&1; then
    echo "Failed to remove drifted MinIO policy '$MINIO_MEDUSA_POLICY_NAME'." >&2
    return 1
  fi

  create_medusa_policy
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
  reconcile_medusa_policy
  attach_medusa_policy
}

ensure_medusa_bucket
set_bucket_public_access
bootstrap_medusa_identity

wait "$MINIO_PID"
