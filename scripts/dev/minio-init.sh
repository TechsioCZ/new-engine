#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_NAME="${PROJECT_NAME:-new-engine}"
COMPOSE_FILE="${REPO_ROOT}/docker-compose.yaml"
MINIO_BOOTSTRAP_ALIAS="${MINIO_BOOTSTRAP_ALIAS:-local}"
MINIO_BOOTSTRAP_URL="${MINIO_BOOTSTRAP_URL:-http://localhost:9004}"
MINIO_RUNTIME_POLICY_NAME="medusa-runtime-object-access"
MINIO_RUNTIME_POLICY_PATH="/tmp/minio-medusa-runtime-policy.json"

require_container() {
  local service_name="$1"
  local container_id

  container_id="$(docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps -q "$service_name" || true)"
  if [[ -z "$container_id" ]]; then
    echo "${service_name} container is not running. Start the stack first (for example: mise run dev)." >&2
    exit 1
  fi

  printf '%s\n' "$container_id"
}

read_container_env() {
  local container_id="$1"
  local env_name="$2"

  docker exec "$container_id" printenv "$env_name" 2>/dev/null || true
}

require_value() {
  local label="$1"
  local value="$2"

  if [[ -n "$value" ]]; then
    return 0
  fi

  echo "Missing required MinIO runtime setting '$label'. Check the running compose env, then rerun this helper." >&2
  exit 1
}

resolve_runtime_value() {
  local label="$1"
  local bootstrap_source_label="$2"
  local bootstrap_source_value="$3"
  local consumer_source_label="$4"
  local consumer_source_value="$5"
  local resolved_value="${bootstrap_source_value:-$consumer_source_value}"

  if [[ -n "$bootstrap_source_value" && -n "$consumer_source_value" && "$bootstrap_source_value" != "$consumer_source_value" ]]; then
    echo "MinIO runtime contract mismatch for '$label': ${bootstrap_source_label}='${bootstrap_source_value}' but ${consumer_source_label}='${consumer_source_value}'. Align the compose env values before rerunning this helper." >&2
    exit 1
  fi

  require_value "$label" "$resolved_value"
  printf '%s\n' "$resolved_value"
}

write_runtime_policy() {
  local minio_container="$1"
  local bucket_name="$2"

  docker exec \
    -e MINIO_MEDUSA_BUCKET="$bucket_name" \
    -e MINIO_RUNTIME_POLICY_PATH="$MINIO_RUNTIME_POLICY_PATH" \
    "$minio_container" \
    sh -eu -c 'cat >"$MINIO_RUNTIME_POLICY_PATH" <<EOF
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
        "arn:aws:s3:::$MINIO_MEDUSA_BUCKET"
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
        "arn:aws:s3:::$MINIO_MEDUSA_BUCKET/*"
      ]
    }
  ]
}
EOF'
}

main() {
  local minio_container backend_container root_user root_password
  local minio_access_key minio_secret_key minio_bucket
  local backend_access_key backend_secret_key backend_bucket
  local access_key secret_key bucket_name bucket_ref

  minio_container="$(require_container medusa-minio)"
  backend_container="$(require_container medusa-be)"

  root_user="$(read_container_env "$minio_container" MINIO_ROOT_USER)"
  root_password="$(read_container_env "$minio_container" MINIO_ROOT_PASSWORD)"
  minio_access_key="$(read_container_env "$minio_container" MINIO_MEDUSA_ACCESS_KEY)"
  minio_secret_key="$(read_container_env "$minio_container" MINIO_MEDUSA_SECRET_KEY)"
  minio_bucket="$(read_container_env "$minio_container" MINIO_MEDUSA_BUCKET)"
  backend_access_key="$(read_container_env "$backend_container" MINIO_ACCESS_KEY)"
  backend_secret_key="$(read_container_env "$backend_container" MINIO_SECRET_KEY)"
  backend_bucket="$(read_container_env "$backend_container" MINIO_BUCKET)"

  require_value "MINIO_ROOT_USER" "$root_user"
  require_value "MINIO_ROOT_PASSWORD" "$root_password"
  access_key="$(resolve_runtime_value MINIO_ACCESS_KEY MINIO_MEDUSA_ACCESS_KEY "$minio_access_key" MINIO_ACCESS_KEY "$backend_access_key")"
  secret_key="$(resolve_runtime_value MINIO_SECRET_KEY MINIO_MEDUSA_SECRET_KEY "$minio_secret_key" MINIO_SECRET_KEY "$backend_secret_key")"
  bucket_name="$(resolve_runtime_value MINIO_BUCKET MINIO_MEDUSA_BUCKET "$minio_bucket" MINIO_BUCKET "$backend_bucket")"
  bucket_ref="$MINIO_BOOTSTRAP_ALIAS/$bucket_name"

  echo "Configuring MinIO runtime fallback for bucket '$bucket_name' and key '$access_key'."

  docker exec "$minio_container" mc alias set "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_BOOTSTRAP_URL" "$root_user" "$root_password" >/dev/null
  docker exec "$minio_container" mc mb --ignore-existing "$bucket_ref" >/dev/null

  if ! docker exec "$minio_container" mc anonymous set download "$bucket_ref" >/dev/null; then
    echo "Failed to configure anonymous read access for bucket '$bucket_name'." >&2
    exit 1
  fi

  write_runtime_policy "$minio_container" "$bucket_name"

  docker exec "$minio_container" mc admin policy detach "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_RUNTIME_POLICY_NAME" --user "$access_key" >/dev/null 2>&1 || true
  docker exec "$minio_container" mc admin policy remove "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_RUNTIME_POLICY_NAME" >/dev/null 2>&1 || true
  docker exec "$minio_container" mc admin user remove "$MINIO_BOOTSTRAP_ALIAS" "$access_key" >/dev/null 2>&1 || true

  if ! docker exec "$minio_container" mc admin user add "$MINIO_BOOTSTRAP_ALIAS" "$access_key" "$secret_key" >/dev/null; then
    echo "Failed to provision MinIO runtime user '$access_key'. Remove any conflicting legacy access key for that name, then rerun this helper." >&2
    exit 1
  fi

  if ! docker exec "$minio_container" mc admin policy create "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_RUNTIME_POLICY_NAME" "$MINIO_RUNTIME_POLICY_PATH" >/dev/null; then
    echo "Failed to create MinIO policy '$MINIO_RUNTIME_POLICY_NAME'." >&2
    exit 1
  fi

  if ! docker exec "$minio_container" mc admin policy attach "$MINIO_BOOTSTRAP_ALIAS" "$MINIO_RUNTIME_POLICY_NAME" --user "$access_key" >/dev/null; then
    echo "Failed to attach policy '$MINIO_RUNTIME_POLICY_NAME' to '$access_key'." >&2
    exit 1
  fi

  echo "MinIO runtime fallback completed."
}

main "$@"
