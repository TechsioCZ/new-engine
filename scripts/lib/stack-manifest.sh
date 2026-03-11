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
        | select(($default_only | not) or ((.local.enabled_by_default // true) == true))
        | .compose_service
      ] | join(" ")
    '
}

service_by_id() {
  local service_id="$1"

  manifest_eval -c \
    --arg id "$service_id" \
    '
      .services[]
      | select(.id == $id)
      | . as $service
      | {
          id,
          compose_service,
          kind,
          nx_projects: (.nx_projects // []),
          local: {
            phase: $service.local.phase,
            enabled_by_default: (if ($service.local | has("enabled_by_default")) then $service.local.enabled_by_default else true end),
            wait_healthy: (if ($service.local | has("wait_healthy")) then $service.local.wait_healthy else true end)
          },
          ci: (
            ($service.ci // {})
            | .prepare = (.prepare // {})
            | if .zane != null then
                .zane = (
                  .zane
                  | .deploy_lanes = (.deploy_lanes // [])
                  | .deploy_stage = (.deploy_stage // 100)
                  | .consumes = (.consumes // {})
                  | .coupled_service_ids = (.coupled_service_ids // [])
                )
              else
                .
              end
          )
        }
    '
}

schema_template() {
  cat <<'EOF'
# Sparse stack manifest schema template.
# Omit optional keys when the default value is correct.
#
# Omission defaults:
# - local.enabled_by_default: true
# - local.wait_healthy: true
# - nx_projects: []
# - ci.prepare.preview_db: false
# - ci.prepare.meili_keys: false
# - ci.zane.consumes.preview_db: false
# - ci.zane.consumes.meili_frontend_key: false
# - ci.zane.consumes.meili_backend_key: false
# - ci.zane.coupled_service_ids: []
# - ci.zane.deploy_stage: 100
#
# Keep explicit:
# - local.phase
# - ci.deployable
# - ci.affected_path_globs
# - ci.zane.service_name
# - ci.zane.deploy_lanes

ci:
  ignore_path_globs:
    - "plans/**"
  global_runtime_rules:
    - path_globs:
        - ".dockerignore"
      service_ids:
        - "medusa-be"
        - "n1"

services:
  - id: "example-service"
    compose_service: "example-service"
    kind: "backend" # example: infra|backend|frontend|operator
    # optional when not backed by Nx:
    # nx_projects:
    #   - "example-service"
    local:
      phase: "backend" # required: resources|backend|frontend|operator
      # enabled_by_default: false   # optional; default true
      # wait_healthy: false         # optional; default true
    ci:
      deployable: true
      affected_path_globs:
        - "docker/development/example-service/**"
      prepare:
        # preview_db: true          # optional; default false
        # meili_keys: true          # optional; default false
      zane:
        service_name: "example-service"
        deploy_lanes: ["preview", "main"]
        # deploy_stage: 20              # optional; default 100
        consumes:
          # preview_db: true            # optional; default false
          # meili_frontend_key: true    # optional; default false
          # meili_backend_key: true     # optional; default false
        # coupled_service_ids:          # optional; default []
        #   - "another-service"
EOF
}

ci_services_json() {
  manifest_eval -c '.services'
}

ci_ignore_globs() {
  manifest_eval -r '.ci.ignore_path_globs[]'
}

ci_global_runtime_globs() {
  manifest_eval -r '
    if (.ci.global_runtime_rules // [] | length) > 0 then
      .ci.global_runtime_rules[].path_globs[]
    else
      .ci.global_runtime_path_globs[]
    end
  '
}

ci_global_runtime_service_ids() {
  manifest_eval -r '
    if (.ci.global_runtime_rules // [] | length) > 0 then
      .ci.global_runtime_rules[].service_ids[]
    else
      .ci.global_runtime_service_ids[]
    end
  '
}

ci_global_runtime_rules_json() {
  manifest_eval -c '
    if (.ci.global_runtime_rules // [] | length) > 0 then
      (.ci.global_runtime_rules // [])
    else
      [{
        path_globs: (.ci.global_runtime_path_globs // []),
        service_ids: (.ci.global_runtime_service_ids // [])
      }]
    end
  '
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

ci_deployable_service_ids() {
  manifest_eval -r '
    .services[]
    | select(.ci.deployable == true)
    | .id
  '
}

ci_zane_service_json() {
  local service_id="$1"

  manifest_eval -c \
    --arg id "$service_id" \
    '
      .services[]
      | select(.id == $id)
      | select(.ci.deployable == true)
      | {
          id,
          service_name: .ci.zane.service_name,
          deploy_lanes: (.ci.zane.deploy_lanes // []),
          deploy_stage: (.ci.zane.deploy_stage // 100),
          consumes: (.ci.zane.consumes // {}),
          coupled_service_ids: (.ci.zane.coupled_service_ids // [])
        }
    '
}

ci_zane_service_name() {
  local service_id="$1"

  manifest_eval -r \
    --arg id "$service_id" \
    '
      .services[]
      | select(.id == $id)
      | select(.ci.deployable == true)
      | .ci.zane.service_name // empty
    '
}

ci_zane_lane_service_ids() {
  local lane="$1"

  manifest_eval -r \
    --arg lane "$lane" \
    '
      .services[]
      | select(.ci.deployable == true)
      | select(((.ci.zane.deploy_lanes // []) | index($lane)) != null)
      | .id
    '
}

ci_zane_coupled_service_ids() {
  local service_id="$1"

  manifest_eval -r \
    --arg id "$service_id" \
    '
      .services[]
      | select(.id == $id)
      | select(.ci.deployable == true)
      | .ci.zane.coupled_service_ids[]?
    '
}

usage() {
  cat <<'EOF'
Usage: scripts/lib/stack-manifest.sh <command> [options]

Commands:
  compose-services --phase <phase> [--default-only]
  service --id <service-id>
  schema-template
  ci-services-json
  ci-ignore-globs
  ci-global-runtime-globs
  ci-global-runtime-service-ids
  ci-global-runtime-rules
  ci-prepare-service-ids --requirement <preview_db|meili_keys>
  ci-deployable-service-ids
  ci-zane-service --id <service-id>
  ci-zane-service-name --id <service-id>
  ci-zane-lane-service-ids --lane <preview|main>
  ci-zane-coupled-service-ids --id <service-id>
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
    schema-template)
      schema_template
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
    ci-global-runtime-rules)
      ci_global_runtime_rules_json
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
    ci-deployable-service-ids)
      ci_deployable_service_ids
      ;;
    ci-zane-service)
      [[ "${1:-}" == "--id" ]] || {
        echo "ci-zane-service requires --id <service-id>" >&2
        exit 1
      }
      [[ -n "${2:-}" ]] || {
        echo "ci-zane-service requires --id <service-id>" >&2
        exit 1
      }
      ci_zane_service_json "$2"
      ;;
    ci-zane-service-name)
      [[ "${1:-}" == "--id" ]] || {
        echo "ci-zane-service-name requires --id <service-id>" >&2
        exit 1
      }
      [[ -n "${2:-}" ]] || {
        echo "ci-zane-service-name requires --id <service-id>" >&2
        exit 1
      }
      ci_zane_service_name "$2"
      ;;
    ci-zane-lane-service-ids)
      [[ "${1:-}" == "--lane" ]] || {
        echo "ci-zane-lane-service-ids requires --lane <preview|main>" >&2
        exit 1
      }
      [[ -n "${2:-}" ]] || {
        echo "ci-zane-lane-service-ids requires --lane <preview|main>" >&2
        exit 1
      }
      ci_zane_lane_service_ids "$2"
      ;;
    ci-zane-coupled-service-ids)
      [[ "${1:-}" == "--id" ]] || {
        echo "ci-zane-coupled-service-ids requires --id <service-id>" >&2
        exit 1
      }
      [[ -n "${2:-}" ]] || {
        echo "ci-zane-coupled-service-ids requires --id <service-id>" >&2
        exit 1
      }
      ci_zane_coupled_service_ids "$2"
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
