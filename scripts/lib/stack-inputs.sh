#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STACK_INPUTS_PATH="${STACK_INPUTS_PATH:-${ROOT_DIR}/config/stack-inputs.yaml}"

stack_inputs_require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command not found: $1" >&2
    exit 1
  }
}

stack_inputs_exists() {
  [[ -f "$STACK_INPUTS_PATH" ]] || {
    echo "Missing stack inputs contract: $STACK_INPUTS_PATH" >&2
    exit 1
  }
}

stack_inputs_require_parser() {
  case "$STACK_INPUTS_PATH" in
    *.yaml|*.yml)
      stack_inputs_require_cmd yq
      stack_inputs_require_cmd jq
      yq eval -o=json '.' "$STACK_INPUTS_PATH" >/dev/null 2>&1 || {
        echo "Unsupported yq implementation on PATH." >&2
        echo "Install repo tools with 'mise install' so scripts use mikefarah/yq and jq." >&2
        exit 1
      }
      ;;
    *)
      echo "Unsupported stack inputs format: $STACK_INPUTS_PATH" >&2
      echo "Only YAML files are supported." >&2
      exit 1
      ;;
  esac
}

stack_inputs_eval() {
  yq eval -o=json '.' "$STACK_INPUTS_PATH" | jq "$@"
}

stack_inputs_secret_json() {
  local secret_id="$1"

  stack_inputs_eval -c \
    --arg secret_id "$secret_id" \
    '
      .secret_materialization.secrets[]
      | select(.secret_id == $secret_id)
      | .persist_to = (.persist_to // "zane_env")
    '
}

stack_inputs_preview_random_once_secret_ids() {
  stack_inputs_eval -r '
    .secret_materialization.secrets[]
    | select(.scope == "preview")
    | select(.lifecycle == "random_once")
    | .secret_id
  '
}

stack_inputs_preview_random_once_secrets_json() {
  stack_inputs_eval -c '
    [
      .secret_materialization.secrets[]
      | select(.scope == "preview")
      | select(.lifecycle == "random_once")
      | .persist_to = (.persist_to // "zane_env")
      | {
          secret_id,
          scope,
          lifecycle,
          materializer,
          persist_to,
          generator: (.generator // {}),
          targets: (.targets // [])
        }
    ]
  '
}

stack_inputs_runtime_provider_json() {
  local provider_id="$1"

  stack_inputs_eval -c \
    --arg provider_id "$provider_id" \
    '
      .runtime_providers.providers[]
      | select(.provider_id == $provider_id)
      | .status = (.status // "active")
      | .materializer = (.materializer // "zane_operator")
    '
}

stack_inputs_runtime_provider_ids() {
  local status_filter="${1:-}"

  if [[ -n "$status_filter" ]]; then
    stack_inputs_eval -r \
      --arg status_filter "$status_filter" \
      '
        .runtime_providers.providers[]
        | select((.status // "active") == $status_filter)
        | .provider_id
      '
  else
    stack_inputs_eval -r '
      .runtime_providers.providers[]
      | .provider_id
    '
  fi
}

stack_inputs_runtime_provider_output_envs_json() {
  local provider_id="$1"

  stack_inputs_eval -c \
    --arg provider_id "$provider_id" \
    '
      [
        .runtime_providers.providers[]
        | select(.provider_id == $provider_id)
        | .outputs[]?
        | {
            output_id,
            output_kind: (.output_kind // "secret"),
            target_envs: (.target_envs // [])
          }
      ]
    '
}

stack_inputs_runtime_provider_source_service_id() {
  local provider_id="$1"

  stack_inputs_eval -r \
    --arg provider_id "$provider_id" \
    '
      .runtime_providers.providers[]
      | select(.provider_id == $provider_id)
      | .source_service_id // empty
    '
}

stack_inputs_runtime_provider_target_env_var() {
  local provider_id="$1"
  local output_id="$2"
  local service_id="$3"

  stack_inputs_eval -r \
    --arg provider_id "$provider_id" \
    --arg output_id "$output_id" \
    --arg service_id "$service_id" \
    '
      .runtime_providers.providers[]
      | select(.provider_id == $provider_id)
      | .outputs[]?
      | select(.output_id == $output_id)
      | .target_envs[]?
      | select(.service_id == $service_id)
      | .env_var // empty
    ' \
    | head -n 1
}
