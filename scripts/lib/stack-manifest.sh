#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST_PATH="${STACK_MANIFEST_PATH:-${ROOT_DIR}/config/stack-manifest.yaml}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command not found: $1" >&2
    exit 1
  }
}

manifest_exists() {
  [[ -f "$MANIFEST_PATH" ]] || {
    echo "Missing stack manifest: $MANIFEST_PATH" >&2
    exit 1
  }
}

manifest_eval() {
  yq eval -o=json '.' "$MANIFEST_PATH" | jq "$@"
}

manifest_require_parser() {
  case "$MANIFEST_PATH" in
    *.yaml|*.yml)
      require_cmd yq
      require_cmd jq
      yq eval -o=json '.' "$MANIFEST_PATH" >/dev/null 2>&1 || {
        echo "Unsupported yq implementation on PATH." >&2
        echo "Install repo tools with 'mise install' so scripts use mikefarah/yq and jq." >&2
        exit 1
      }
      ;;
    *)
      echo "Unsupported stack manifest format: $MANIFEST_PATH" >&2
      echo "Only YAML manifests are supported." >&2
      exit 1
      ;;
  esac
}

compose_services_for_phase() {
  local phase="$1"
  local default_only="${2:-false}"

  manifest_eval -r \
    --arg phase "$phase" \
    --argjson default_only "$default_only" \
    '
      [
        .services[]
        | select(.compose_service != null)
        | select(.local.phase == $phase)
        | select(($default_only | not) or (.local.enabled_by_default == true))
        | .compose_service
      ] | join(" ")
    '
}

service_by_id() {
  local service_id="$1"

  manifest_eval -c --arg id "$service_id" '.services[] | select(.id == $id)'
}

ci_services_json() {
  manifest_eval -c '.services'
}

ci_ignore_globs() {
  manifest_eval -r '.ci.ignore_path_globs[]'
}

ci_global_runtime_globs() {
  manifest_eval -r '.ci.global_runtime_path_globs[]'
}

ci_global_runtime_service_ids() {
  manifest_eval -r '.ci.global_runtime_service_ids[]'
}

ci_prepare_service_ids() {
  local requirement="$1"

  manifest_eval -r \
    --arg requirement "$requirement" \
    '
      .services[]
      | select(.ci.prepare[$requirement] == true)
      | .id
    '
}

usage() {
  cat <<'EOF'
Usage: scripts/lib/stack-manifest.sh <command> [options]

Commands:
  compose-services --phase <phase> [--default-only]
  service --id <service-id>
  ci-services-json
  ci-ignore-globs
  ci-global-runtime-globs
  ci-global-runtime-service-ids
  ci-prepare-service-ids --requirement <preview_db|meili_keys>
EOF
}

main() {
  local command="${1:-}"
  shift || true

  manifest_exists
  manifest_require_parser

  case "$command" in
    compose-services)
      local phase=""
      local default_only="false"
      while [[ $# -gt 0 ]]; do
        case "$1" in
          --phase)
            phase="${2:-}"
            shift 2
            ;;
          --default-only)
            default_only="true"
            shift
            ;;
          *)
            usage >&2
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
        esac
      done
      [[ -n "$phase" ]] || {
        echo "--phase is required" >&2
        exit 1
      }
      compose_services_for_phase "$phase" "$default_only"
      ;;
    service)
      [[ "${1:-}" == "--id" ]] || {
        echo "service requires --id <service-id>" >&2
        exit 1
      }
      [[ -n "${2:-}" ]] || {
        echo "service requires --id <service-id>" >&2
        exit 1
      }
      service_by_id "$2"
      ;;
    ci-services-json)
      ci_services_json
      ;;
    ci-ignore-globs)
      ci_ignore_globs
      ;;
    ci-global-runtime-globs)
      ci_global_runtime_globs
      ;;
    ci-global-runtime-service-ids)
      ci_global_runtime_service_ids
      ;;
    ci-prepare-service-ids)
      [[ "${1:-}" == "--requirement" ]] || {
        echo "ci-prepare-service-ids requires --requirement <preview_db|meili_keys>" >&2
        exit 1
      }
      [[ -n "${2:-}" ]] || {
        echo "ci-prepare-service-ids requires --requirement <preview_db|meili_keys>" >&2
        exit 1
      }
      ci_prepare_service_ids "$2"
      ;;
    -h|--help|help|"")
      usage
      ;;
    *)
      usage >&2
      echo "Unknown command: $command" >&2
      exit 1
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
