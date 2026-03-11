#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STACK_MANIFEST_PATH="${STACK_MANIFEST_PATH:-${ROOT_DIR}/config/stack-manifest.yaml}"
# shellcheck source=scripts/ci/lib.sh
source "${ROOT_DIR}/scripts/ci/lib.sh"
# shellcheck source=scripts/lib/stack-manifest.sh
source "${ROOT_DIR}/scripts/lib/stack-manifest.sh"

usage() {
  cat <<'EOF'
Usage:
  scripts/ci/resolve-affected-services.sh [options]

Options:
  --base-sha <sha>       base revision for diff (default: $BASE_SHA)
  --head-sha <sha>       head revision for diff (default: $HEAD_SHA or HEAD)
  -h, --help             Show this help

Outputs:
  - projects_csv
  - services_csv
  - has_<service>
  - changed_files_count

Behavior:
  - Writes outputs to $GITHUB_OUTPUT when available
  - Prints a compact JSON summary to stdout
EOF
}

ci::require_command git
ci::require_command jq
ci::require_command pnpm

base_sha="${BASE_SHA:-}"
head_sha="${HEAD_SHA:-HEAD}"
nx_isolate_plugins="${NX_RESOLVE_AFFECTED_ISOLATE_PLUGINS:-true}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-sha)
      base_sha="${2-}"
      shift 2
      ;;
    --head-sha)
      head_sha="${2-}"
      shift 2
      ;;
    --nx-isolate-plugins)
      nx_isolate_plugins="${2-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      ci::die "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$base_sha" ]] || ci::die "Base SHA is required (use --base-sha or BASE_SHA)."
[[ -n "$head_sha" ]] || ci::die "Head SHA is required (use --head-sha or HEAD_SHA)."
MANIFEST_PATH="$STACK_MANIFEST_PATH"
manifest_exists
manifest_require_parser

cd "$ROOT_DIR"
git rev-parse --verify "${base_sha}^{commit}" >/dev/null 2>&1 || ci::die "Invalid base SHA: $base_sha"
git rev-parse --verify "${head_sha}^{commit}" >/dev/null 2>&1 || ci::die "Invalid head SHA: $head_sha"

matches_any_glob() {
  local value="$1"
  shift || true
  local pattern

  for pattern in "$@"; do
    [[ -n "$pattern" ]] || continue
    case "$value" in
      $pattern)
        return 0
        ;;
    esac
  done

  return 1
}

changed_files=()
while IFS= read -r path; do
  [[ -n "$path" ]] || continue
  changed_files+=("$path")
done < <(git diff --name-only "$base_sha" "$head_sha")

ignore_globs=()
while IFS= read -r pattern; do
  [[ -n "$pattern" ]] || continue
  ignore_globs+=("$pattern")
done < <(manifest_eval -r '.ci.ignore_path_globs[]')

relevant_changed_files=()
for path in "${changed_files[@]}"; do
  if matches_any_glob "$path" "${ignore_globs[@]}"; then
    continue
  fi
  relevant_changed_files+=("$path")
done

nx_affected_projects_json="[]"
nx_status="ok"
set +e
nx_affected_projects_json="$(
  NX_DAEMON=false \
  NX_ISOLATE_PLUGINS="${nx_isolate_plugins}" \
  pnpm exec nx show projects --affected --json --base="$base_sha" --head="$head_sha" 2>/tmp/resolve-affected-nx.err
)"
nx_exit_code=$?
set -e
if [[ "$nx_exit_code" -ne 0 ]]; then
  nx_status="fallback"
  nx_affected_projects_json="[]"
fi

declare -A nx_project_flags=()
while IFS= read -r project_name; do
  [[ -n "$project_name" ]] || continue
  nx_project_flags["$project_name"]=true
done < <(jq -r '.[]' <<<"$nx_affected_projects_json")

declare -A service_flags=()
services_in_order=()
while IFS= read -r service_id; do
  [[ -n "$service_id" ]] || continue
  service_flags["$service_id"]=false
  services_in_order+=("$service_id")
done < <(manifest_eval -r '.services[].id')

while IFS= read -r runtime_rule_json; do
  [[ -n "$runtime_rule_json" ]] || continue

  runtime_rule_triggered=false
  runtime_rule_globs=()
  while IFS= read -r pattern; do
    [[ -n "$pattern" ]] || continue
    runtime_rule_globs+=("$pattern")
  done < <(jq -r '.path_globs[]?' <<<"$runtime_rule_json")

  for path in "${relevant_changed_files[@]}"; do
    if matches_any_glob "$path" "${runtime_rule_globs[@]}"; then
      runtime_rule_triggered=true
      break
    fi
  done

  if [[ "$runtime_rule_triggered" != "true" ]]; then
    continue
  fi

  while IFS= read -r service_id; do
    [[ -n "$service_id" ]] || continue
    service_flags["$service_id"]=true
  done < <(jq -r '.service_ids[]?' <<<"$runtime_rule_json")
done < <(manifest_eval -c '
  if (.ci.global_runtime_rules // [] | length) > 0 then
    (.ci.global_runtime_rules // [])[]
  else
    {
      path_globs: (.ci.global_runtime_path_globs // []),
      service_ids: (.ci.global_runtime_service_ids // [])
    }
  end
')

if [[ "$nx_status" == "fallback" ]]; then
  while IFS= read -r fallback_service_id; do
    [[ -n "$fallback_service_id" ]] || continue
    service_flags["$fallback_service_id"]=true
  done < <(manifest_eval -r '.services[] | select(((.nx_projects // []) | length) > 0) | .id')
fi

while IFS= read -r service_json; do
  [[ -n "$service_json" ]] || continue

  service_id="$(jq -r '.id' <<<"$service_json")"
  affected=false

  while IFS= read -r nx_project; do
    [[ -n "$nx_project" ]] || continue
    if [[ "${nx_project_flags[$nx_project]:-false}" == "true" ]]; then
      affected=true
      break
    fi
  done < <(jq -r '.nx_projects[]?' <<<"$service_json")

  if [[ "$affected" == "false" ]]; then
    path_globs=()
    while IFS= read -r pattern; do
      [[ -n "$pattern" ]] || continue
      path_globs+=("$pattern")
    done < <(jq -r '.ci.affected_path_globs[]?' <<<"$service_json")

    for path in "${relevant_changed_files[@]}"; do
      if matches_any_glob "$path" "${path_globs[@]}"; then
        affected=true
        break
      fi
    done
  fi

  if [[ "$affected" == "true" ]]; then
    service_flags["$service_id"]=true
  fi
done < <(manifest_eval -c '.services[]')

services_csv=""
for service_id in "${services_in_order[@]}"; do
  if [[ "${service_flags[$service_id]}" == "true" ]]; then
    if [[ -n "$services_csv" ]]; then
      services_csv+=",${service_id}"
    else
      services_csv="${service_id}"
    fi
  fi
done

projects_csv="$(jq -r 'join(",")' <<<"$nx_affected_projects_json")"

ci::gha_output projects_csv "$projects_csv"
ci::gha_output services_csv "$services_csv"
ci::gha_output changed_files_count "${#changed_files[@]}"
ci::gha_output nx_status "$nx_status"

for service_id in "${services_in_order[@]}"; do
  output_key="has_${service_id//-/_}"
  ci::gha_output "$output_key" "${service_flags[$service_id]}"
done

changed_files_json="$(printf '%s\n' "${changed_files[@]:-}" | jq -Rsc 'split("\n") | map(select(length > 0))')"
relevant_changed_files_json="$(printf '%s\n' "${relevant_changed_files[@]:-}" | jq -Rsc 'split("\n") | map(select(length > 0))')"

jq -cn \
  --arg base_sha "$base_sha" \
  --arg head_sha "$head_sha" \
  --arg projects_csv "$projects_csv" \
  --arg services_csv "$services_csv" \
  --arg nx_status "$nx_status" \
  --argjson changed_files "$changed_files_json" \
  --argjson relevant_changed_files "$relevant_changed_files_json" \
  --argjson has_medusa_be "${service_flags[medusa-be]}" \
  --argjson has_n1 "${service_flags[n1]}" \
  --argjson has_medusa_db "${service_flags[medusa-db]}" \
  --argjson has_medusa_minio "${service_flags[medusa-minio]}" \
  --argjson has_medusa_meilisearch "${service_flags[medusa-meilisearch]}" \
  --argjson has_medusa_valkey "${service_flags[medusa-valkey]}" \
  --argjson has_zane_operator "${service_flags[zane-operator]}" \
  '{
    base_sha: $base_sha,
    head_sha: $head_sha,
    projects_csv: $projects_csv,
    services_csv: $services_csv,
    nx_status: $nx_status,
    changed_files: $changed_files,
    relevant_changed_files: $relevant_changed_files,
    flags: {
      medusa_be: $has_medusa_be,
      n1: $has_n1,
      medusa_db: $has_medusa_db,
      medusa_minio: $has_medusa_minio,
      medusa_meilisearch: $has_medusa_meilisearch,
      medusa_valkey: $has_medusa_valkey,
      zane_operator: $has_zane_operator
    }
  }'
