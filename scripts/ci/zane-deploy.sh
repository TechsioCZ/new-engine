#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STACK_MANIFEST_PATH="${STACK_MANIFEST_PATH:-${ROOT_DIR}/config/stack-manifest.yaml}"
# shellcheck source=scripts/ci/lib.sh
source "${ROOT_DIR}/scripts/ci/lib.sh"
# shellcheck source=scripts/lib/stack-manifest.sh
source "${ROOT_DIR}/scripts/lib/stack-manifest.sh"

zane::usage() {
  cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh <command> [options]

Commands:
  plan                   Resolve requested + coupled deploy services from the manifest
  render-env-overrides   Render preview env override payload from prepare outputs
  resolve-environment    Resolve preview/main Zane environment through zane-operator
  resolve-targets        Resolve per-service Zane deploy targets for the environment
  apply-env-overrides    Apply rendered env overrides to target services
  trigger                Trigger deploys for resolved target services
  run-preview            Run preview deploy orchestration end-to-end
  run-main               Run main deploy orchestration end-to-end
  verify                 Verify preview/main deploy contract through zane-operator

Global notes:
  - networked commands use ZANE_OPERATOR_BASE_URL + ZANE_OPERATOR_API_TOKEN unless flags override them
  - --dry-run skips network calls and emits deterministic fake responses for contract validation
  - sensitive env override values are masked before any artifact/output write
EOF
}

ZANE_DEPLOYMENT_POLL_INTERVAL_SECONDS_DEFAULT="${ZANE_DEPLOYMENT_POLL_INTERVAL_SECONDS_DEFAULT:-10}"
ZANE_DEPLOYMENT_WAIT_TIMEOUT_SECONDS_DEFAULT="${ZANE_DEPLOYMENT_WAIT_TIMEOUT_SECONDS_DEFAULT:-900}"

zane::require_common_commands() {
  ci::require_command jq
  ci::require_command curl
}

zane::require_manifest() {
  MANIFEST_PATH="$STACK_MANIFEST_PATH"
  manifest_exists
  manifest_require_parser
}

zane::require_file() {
  local path="$1"
  [[ -f "$path" ]] || ci::die "Required file not found: $path"
}

zane::require_lane() {
  local lane="$1"
  case "$lane" in
    preview|main) ;;
    *) ci::die "Lane must be preview or main." ;;
  esac
}

zane::require_numeric() {
  local value="$1"
  local label="$2"
  [[ "$value" =~ ^[0-9]+$ ]] || ci::die "${label} must be numeric."
}

zane::normalize_csv_or_empty() {
  local value="${1-}"
  ci::normalize_csv "$value"
}

zane::csv_to_lines() {
  local csv="${1-}"
  if [[ -n "$csv" ]]; then
    tr ',' '\n' <<<"$csv"
  fi
}

zane::preview_environment_name() {
  local pr_number="$1"
  local prefix="${ZANE_PREVIEW_ENV_PREFIX:-pr-}"
  printf '%s%s\n' "$prefix" "$pr_number"
}

zane::service_json() {
  local service_id="$1"
  local service_json
  service_json="$(ci_zane_service_json "$service_id")"
  [[ -n "$service_json" ]] || ci::die "Service is not deployable or missing Zane metadata: ${service_id}"
  printf '%s\n' "$service_json"
}

zane::service_allowed_in_lane() {
  local service_json="$1"
  local lane="$2"
  jq -e --arg lane "$lane" '(.deploy_lanes | index($lane)) != null' <<<"$service_json" >/dev/null
}

zane::csv_from_lookup_in_manifest_order() {
  local lane="$1"
  local lookup_name="$2"
  local service_id
  local out=""

  # shellcheck disable=SC2178,SC1083
  declare -n lookup_ref="$lookup_name"

  while IFS= read -r service_id; do
    [[ -n "$service_id" ]] || continue
    if [[ "${lookup_ref[$service_id]:-false}" == "true" ]]; then
      if [[ -n "$out" ]]; then
        out+=",${service_id}"
      else
        out="${service_id}"
      fi
    fi
  done < <(ci_zane_lane_service_ids "$lane")

  printf '%s\n' "$out"
}

zane::services_json_from_csv() {
  local csv="$1"
  local tmp_file
  local service_id

  tmp_file="$(mktemp)"
  trap "rm -f '$tmp_file'" RETURN

  while IFS= read -r service_id; do
    [[ -n "$service_id" ]] || continue
    zane::service_json "$service_id" >>"$tmp_file"
    printf '\n' >>"$tmp_file"
  done < <(zane::csv_to_lines "$csv")

  if [[ ! -s "$tmp_file" ]]; then
    printf '[]\n'
    return 0
  fi

  jq -sc '.' "$tmp_file"
}

zane::plan_stage_numbers() {
  local plan_json="$1"
  zane::require_file "$plan_json"

  jq -r '
    [.deploy_services[]?.deploy_stage // 100]
    | unique
    | sort
    | .[]
  ' "$plan_json"
}

zane::stage_services_csv_from_plan() {
  local plan_json="$1"
  local stage="$2"
  zane::require_file "$plan_json"

  jq -r --argjson stage "$stage" '
    [.deploy_services[] | select((.deploy_stage // 100) == $stage) | .id] | join(",")
  ' "$plan_json"
}

zane::stage_has_service() {
  local plan_json="$1"
  local stage="$2"
  local service_id="$3"
  zane::require_file "$plan_json"

  jq -e --argjson stage "$stage" --arg service_id "$service_id" '
    any(.deploy_services[]?; (.id == $service_id) and ((.deploy_stage // 100) == $stage))
  ' "$plan_json" >/dev/null
}

zane::stage_has_meili_consumers() {
  local plan_json="$1"
  local stage="$2"
  zane::require_file "$plan_json"

  jq -e --argjson stage "$stage" '
    any(.deploy_services[]?; ((.deploy_stage // 100) == $stage) and (((.consumes.meili_frontend_key // false) == true) or ((.consumes.meili_backend_key // false) == true)))
  ' "$plan_json" >/dev/null
}

zane::merge_deployments_json_file() {
  local source_json="$1"
  local dest_json="$2"
  local merged_json

  zane::require_file "$source_json"
  zane::require_file "$dest_json"

  merged_json="$(jq -cn \
    --argjson existing "$(jq -c '.services // []' "$dest_json")" \
    --argjson current "$(jq -c '.services // []' "$source_json")" \
    '{
      services: (($existing + $current) | unique_by(.service_id + ":" + .deployment_hash))
    }')"
  zane::write_json_file "$dest_json" "$merged_json"
}

zane::stage_plan_json() {
  local plan_json="$1"
  local stage="$2"
  zane::require_file "$plan_json"

  jq -c --argjson stage "$stage" '
    . as $plan
    | .deploy_services = [.deploy_services[] | select((.deploy_stage // 100) == $stage)]
    | .deploy_services_csv = ([.deploy_services[].id] | join(","))
  ' "$plan_json"
}

zane::provision_meili_keys() {
  local meili_url="${1-}"
  local meili_master_key="${2-}"

  [[ -n "$meili_url" ]] || ci::die "Meilisearch URL is required for main-lane Meili provisioning."
  [[ -n "$meili_master_key" ]] || ci::die "Meilisearch master key is required for main-lane Meili provisioning."

  local output
  output="$(
    MEILISEARCH_URL="$meili_url" \
    MEILISEARCH_MASTER_KEY="$meili_master_key" \
    bash "${ROOT_DIR}/scripts/ci/provision-meili-keys.sh"
  )"

  local backend_key
  local frontend_key
  local frontend_env_var
  backend_key="$(sed -n 's/^DC_MEILISEARCH_BACKEND_API_KEY=//p' <<<"$output" | tail -n1)"
  frontend_key="$(sed -n 's/^DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY=//p' <<<"$output" | tail -n1)"
  frontend_env_var="$(sed -n 's/^frontend_env_var=//p' <<<"$output" | tail -n1)"

  [[ -n "$backend_key" ]] || ci::die "Failed to parse backend Meili key from provision output."
  [[ -n "$frontend_key" ]] || ci::die "Failed to parse frontend Meili key from provision output."
  [[ -n "$frontend_env_var" ]] || ci::die "Failed to parse frontend Meili env var from provision output."

  MEILISEARCH_URL="$meili_url" \
  MEILISEARCH_MASTER_KEY="$meili_master_key" \
  MEILISEARCH_BACKEND_API_KEY="$backend_key" \
  NEXT_PUBLIC_MEILISEARCH_API_KEY="$frontend_key" \
  bash "${ROOT_DIR}/scripts/ci/verify-meili-keys.sh" >/dev/null

  jq -cn \
    --arg backend_key "$backend_key" \
    --arg frontend_key "$frontend_key" \
    --arg frontend_env_var "$frontend_env_var" \
    '{
      backend_key: $backend_key,
      frontend_key: $frontend_key,
      frontend_env_var: $frontend_env_var
    }'
}

zane::write_json_file() {
  local path="$1"
  local payload="$2"
  printf '%s\n' "$payload" >"$path"
}

zane::api_request() {
  local method="$1"
  local path="$2"
  local payload="${3-}"
  local base_url="$4"
  local api_token="$5"
  local tmp_body
  local http_code
  local safe_body_json
  local curl_args

  [[ -n "$base_url" ]] || ci::die "zane-operator base URL is required."
  [[ -n "$api_token" ]] || ci::die "zane-operator API token is required."

  ci::gha_mask "$base_url"
  ci::gha_mask "$api_token"

  base_url="${base_url%/}"
  tmp_body="$(mktemp)"
  trap "rm -f '$tmp_body'" RETURN

  curl_args=(
    --silent
    --show-error
    --output "$tmp_body"
    --write-out '%{http_code}'
    --connect-timeout 20
    --max-time 20
    -H "Authorization: Bearer ${api_token}"
    -H 'Accept: application/json'
    -H 'Content-Type: application/json'
    -X "$method"
  )

  if [[ "$method" == "GET" ]]; then
    curl_args+=(
      --retry 3
      --retry-all-errors
      --retry-delay 2
    )
  fi

  if [[ -n "$payload" ]]; then
    curl_args+=(--data "$payload")
  fi

  http_code="$(
    curl \
      "${curl_args[@]}" \
      "${base_url}${path}"
  )" || {
    local status=$?
    ci::die "zane-operator request failed before a successful HTTP response (curl exit ${status})."
  }

  if ! jq -e . >/dev/null 2>&1 <"$tmp_body"; then
    ci::die "zane-operator returned non-JSON response (HTTP ${http_code})."
  fi

  safe_body_json="$(jq -c '
    walk(
      if type == "object" then
        with_entries(
          if (.key | ascii_downcase | test("password|token|secret|key|url")) and (.value | type == "string")
          then .value = "***redacted***"
          else .
          end
        )
      else .
      end
    )
  ' <"$tmp_body")"

  if [[ "$http_code" -lt 200 || "$http_code" -ge 300 ]]; then
    ci::die "zane-operator request returned HTTP ${http_code}: ${safe_body_json}"
  fi

  jq -c . <"$tmp_body"
}

zane::cmd_wait_deployments() {
  zane::require_common_commands

  local lane=""
  local project_slug="${ZANE_CANONICAL_PROJECT_SLUG:-}"
  local environment_name=""
  local requested_services_csv=""
  local deploy_services_csv=""
  local triggered_services_csv=""
  local preview_db_name=""
  local preview_db_user=""
  local preview_db_password=""
  local meili_frontend_key=""
  local meili_frontend_env_var=""
  local meili_backend_key=""
  local deployments_json=""
  local output_json=""
  local base_url="${ZANE_OPERATOR_BASE_URL:-}"
  local api_token="${ZANE_OPERATOR_API_TOKEN:-}"
  local dry_run="false"
  local poll_interval_seconds="$ZANE_DEPLOYMENT_POLL_INTERVAL_SECONDS_DEFAULT"
  local wait_timeout_seconds="$ZANE_DEPLOYMENT_WAIT_TIMEOUT_SECONDS_DEFAULT"
  local started_at
  local response_json
  local failed_services
  local in_progress_count

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --lane)
        lane="${2-}"
        shift 2
        ;;
      --project-slug)
        project_slug="${2-}"
        shift 2
        ;;
      --environment-name)
        environment_name="${2-}"
        shift 2
        ;;
      --requested-services-csv)
        requested_services_csv="${2-}"
        shift 2
        ;;
      --deploy-services-csv)
        deploy_services_csv="${2-}"
        shift 2
        ;;
      --triggered-services-csv)
        triggered_services_csv="${2-}"
        shift 2
        ;;
      --preview-db-name)
        preview_db_name="${2-}"
        shift 2
        ;;
      --preview-db-user)
        preview_db_user="${2-}"
        shift 2
        ;;
      --preview-db-password)
        preview_db_password="${2-}"
        shift 2
        ;;
      --meili-frontend-key)
        meili_frontend_key="${2-}"
        shift 2
        ;;
      --meili-frontend-env-var)
        meili_frontend_env_var="${2-}"
        shift 2
        ;;
      --meili-backend-key)
        meili_backend_key="${2-}"
        shift 2
        ;;
      --deployments-json)
        deployments_json="${2-}"
        shift 2
        ;;
      --output-json)
        output_json="${2-}"
        shift 2
        ;;
      --base-url)
        base_url="${2-}"
        shift 2
        ;;
      --api-token)
        api_token="${2-}"
        shift 2
        ;;
      --dry-run)
        dry_run="true"
        shift
        ;;
      --poll-interval-seconds)
        poll_interval_seconds="${2-}"
        shift 2
        ;;
      --wait-timeout-seconds)
        wait_timeout_seconds="${2-}"
        shift 2
        ;;
      *)
        ci::die "Unknown argument for wait-deployments: $1"
        ;;
    esac
  done

  zane::require_lane "$lane"
  [[ -n "$project_slug" ]] || ci::die "Zane canonical project slug is required."
  [[ -n "$environment_name" ]] || ci::die "Environment name is required."
  [[ -n "$deployments_json" ]] || ci::die "--deployments-json is required."
  zane::require_file "$deployments_json"
  zane::require_numeric "$poll_interval_seconds" "Poll interval seconds"
  zane::require_numeric "$wait_timeout_seconds" "Wait timeout seconds"

  started_at="$(date +%s)"

  while true; do
    if [[ "$dry_run" == "true" ]]; then
      response_json="$(
        zane::cmd_verify \
          --lane "$lane" \
          --project-slug "$project_slug" \
          --environment-name "$environment_name" \
          --requested-services-csv "$requested_services_csv" \
          --deploy-services-csv "$deploy_services_csv" \
          --triggered-services-csv "$triggered_services_csv" \
          --preview-db-name "$preview_db_name" \
          --preview-db-user "$preview_db_user" \
          --preview-db-password "$preview_db_password" \
          --meili-frontend-key "$meili_frontend_key" \
          --meili-frontend-env-var "$meili_frontend_env_var" \
          --meili-backend-key "$meili_backend_key" \
          --deployments-json "$deployments_json" \
          --dry-run \
          --base-url "$base_url" \
          --api-token "$api_token"
      )"
    else
      response_json="$(
        zane::cmd_verify \
          --lane "$lane" \
          --project-slug "$project_slug" \
          --environment-name "$environment_name" \
          --requested-services-csv "$requested_services_csv" \
          --deploy-services-csv "$deploy_services_csv" \
          --triggered-services-csv "$triggered_services_csv" \
          --preview-db-name "$preview_db_name" \
          --preview-db-user "$preview_db_user" \
          --preview-db-password "$preview_db_password" \
          --meili-frontend-key "$meili_frontend_key" \
          --meili-frontend-env-var "$meili_frontend_env_var" \
          --meili-backend-key "$meili_backend_key" \
          --deployments-json "$deployments_json" \
          --base-url "$base_url" \
          --api-token "$api_token"
      )"
    fi

    failed_services="$(jq -r '
      [
        (.checked_deployments // [])[]
        | select((.status | ascii_upcase) == "FAILED" or (.status | ascii_upcase) == "UNHEALTHY" or (.status | ascii_upcase) == "CANCELLED" or (.status | ascii_upcase) == "REMOVED")
        | "\(.service_name)=\(.status)\(if (.status_reason // "") != "" then " (" + .status_reason + ")" else "" end)"
      ]
      | join("; ")
    ' <<<"$response_json")"
    if [[ -n "$failed_services" ]]; then
      ci::die "Deploy wait failed for triggered deployments: ${failed_services}"
    fi

    in_progress_count="$(jq -r '
      [
        (.checked_deployments // [])[]
        | select((.status | ascii_upcase) != "HEALTHY")
      ]
      | length
    ' <<<"$response_json")"
    if [[ "$in_progress_count" == "0" ]]; then
      if [[ -n "$output_json" ]]; then
        zane::write_json_file "$output_json" "$response_json"
      fi
      printf '%s\n' "$response_json"
      return 0
    fi

    if (( $(date +%s) - started_at >= wait_timeout_seconds )); then
      ci::die "Timed out after ${wait_timeout_seconds}s waiting for deployments to become HEALTHY: $(jq -r '
        [
          (.checked_deployments // [])[]
          | select((.status | ascii_upcase) != "HEALTHY")
          | "\(.service_name)=\(.status)\(if (.status_reason // "") != "" then " (" + .status_reason + ")" else "" end)"
        ]
        | join("; ")
      ' <<<"$response_json")"
    fi

    sleep "$poll_interval_seconds"
  done
}

zane::cmd_plan() {
  zane::require_manifest

  local lane=""
  local services_csv=""
  local pr_number=""
  local output_json=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --lane)
        lane="${2-}"
        shift 2
        ;;
      --services-csv)
        services_csv="${2-}"
        shift 2
        ;;
      --pr-number)
        pr_number="${2-}"
        shift 2
        ;;
      --output-json)
        output_json="${2-}"
        shift 2
        ;;
      -h|--help)
        cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh plan --lane <preview|main> --services-csv <csv> [options]

Options:
  --pr-number <n>        required for preview lane
  --output-json <path>   write full plan JSON to path
EOF
        return 0
        ;;
      *)
        ci::die "Unknown argument for plan: $1"
        ;;
    esac
  done

  zane::require_lane "$lane"
  services_csv="$(zane::normalize_csv_or_empty "$services_csv")"
  if [[ "$lane" == "preview" ]]; then
    [[ -n "$pr_number" ]] || ci::die "--pr-number is required for preview lane."
    zane::require_numeric "$pr_number" "PR number"
  fi

  declare -A requested_lookup=()
  declare -A deploy_lookup=()
  declare -A queued_lookup=()
  local queue=()
  local service_id
  local service_json
  local coupled_service_id

  while IFS= read -r service_id; do
    [[ -n "$service_id" ]] || continue
    service_json="$(zane::service_json "$service_id")"
    zane::service_allowed_in_lane "$service_json" "$lane" || ci::die "Service ${service_id} is not eligible for lane ${lane}."
    requested_lookup["$service_id"]=true
    if [[ "${queued_lookup[$service_id]:-false}" != "true" ]]; then
      queue+=("$service_id")
      queued_lookup["$service_id"]=true
    fi
  done < <(zane::csv_to_lines "$services_csv")

  while [[ "${#queue[@]}" -gt 0 ]]; do
    service_id="${queue[0]}"
    queue=("${queue[@]:1}")
    if [[ "${deploy_lookup[$service_id]:-false}" == "true" ]]; then
      continue
    fi

    service_json="$(zane::service_json "$service_id")"
    zane::service_allowed_in_lane "$service_json" "$lane" || ci::die "Coupled service ${service_id} is not eligible for lane ${lane}."
    deploy_lookup["$service_id"]=true

    while IFS= read -r coupled_service_id; do
      [[ -n "$coupled_service_id" ]] || continue
      zane::service_json "$coupled_service_id" >/dev/null
      if [[ "${queued_lookup[$coupled_service_id]:-false}" != "true" ]]; then
        queue+=("$coupled_service_id")
        queued_lookup["$coupled_service_id"]=true
      fi
    done < <(ci_zane_coupled_service_ids "$service_id")
  done

  local requested_services_csv
  local deploy_services_csv
  local requested_services_json
  local deploy_services_json
  local environment_name=""

  requested_services_csv="$(zane::csv_from_lookup_in_manifest_order "$lane" requested_lookup)"
  deploy_services_csv="$(zane::csv_from_lookup_in_manifest_order "$lane" deploy_lookup)"
  requested_services_json="$(zane::services_json_from_csv "$requested_services_csv")"
  deploy_services_json="$(zane::services_json_from_csv "$deploy_services_csv")"

  if [[ "$lane" == "preview" ]]; then
    environment_name="$(zane::preview_environment_name "$pr_number")"
  fi

  local plan_json
  plan_json="$(
    jq -cn \
      --arg lane "$lane" \
      --arg services_csv "$services_csv" \
      --arg requested_services_csv "$requested_services_csv" \
      --arg deploy_services_csv "$deploy_services_csv" \
      --arg environment_name "$environment_name" \
      --arg pr_number "$pr_number" \
      --argjson requested_services "$requested_services_json" \
      --argjson deploy_services "$deploy_services_json" \
      '{
        lane: $lane,
        source_services_csv: $services_csv,
        requested_services_csv: $requested_services_csv,
        deploy_services_csv: $deploy_services_csv,
        preview_environment_name: $environment_name,
        pr_number: (if $pr_number == "" then null else ($pr_number | tonumber) end),
        requested_services: $requested_services,
        deploy_services: $deploy_services
      }'
  )"

  if [[ -n "$output_json" ]]; then
    zane::write_json_file "$output_json" "$plan_json"
  fi

  ci::gha_output requested_services_csv "$requested_services_csv"
  ci::gha_output deploy_services_csv "$deploy_services_csv"
  ci::gha_output preview_environment_name "$environment_name"
  printf '%s\n' "$plan_json"
}

zane::cmd_render_env_overrides() {
  zane::require_manifest
  ci::require_command jq

  local lane=""
  local services_csv=""
  local preview_db_name=""
  local preview_db_user=""
  local preview_db_password=""
  local meili_frontend_key=""
  local meili_frontend_env_var=""
  local meili_backend_key=""
  local output_json=""
  local service_id
  local service_json
  local service_name
  local env_json
  local item_json
  local tmp_items

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --lane)
        lane="${2-}"
        shift 2
        ;;
      --services-csv)
        services_csv="${2-}"
        shift 2
        ;;
      --preview-db-name)
        preview_db_name="${2-}"
        shift 2
        ;;
      --preview-db-user)
        preview_db_user="${2-}"
        shift 2
        ;;
      --preview-db-password)
        preview_db_password="${2-}"
        shift 2
        ;;
      --meili-frontend-key)
        meili_frontend_key="${2-}"
        shift 2
        ;;
      --meili-frontend-env-var)
        meili_frontend_env_var="${2-}"
        shift 2
        ;;
      --meili-backend-key)
        meili_backend_key="${2-}"
        shift 2
        ;;
      --output-json)
        output_json="${2-}"
        shift 2
        ;;
      -h|--help)
        cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh render-env-overrides --lane <preview|main> --services-csv <csv> [options]

Options:
  --preview-db-name <name>
  --preview-db-user <user>
  --preview-db-password <password>
  --meili-frontend-key <key>
  --meili-frontend-env-var <env-var>   default: DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY
  --meili-backend-key <key>
  --output-json <path>                 write full JSON with sensitive values to path

Behavior:
  - stdout always prints a redacted JSON payload
  - preview-only values are ignored for main lane
EOF
        return 0
        ;;
      *)
        ci::die "Unknown argument for render-env-overrides: $1"
        ;;
    esac
  done

  zane::require_lane "$lane"
  services_csv="$(zane::normalize_csv_or_empty "$services_csv")"
  meili_frontend_env_var="${meili_frontend_env_var:-DC_N1_NEXT_PUBLIC_MEILISEARCH_API_KEY}"

  ci::gha_mask "$preview_db_password"
  ci::gha_mask "$meili_frontend_key"
  ci::gha_mask "$meili_backend_key"

  tmp_items="$(mktemp)"
  trap "rm -f '$tmp_items'" RETURN

  while IFS= read -r service_id; do
    [[ -n "$service_id" ]] || continue
    service_json="$(zane::service_json "$service_id")"
    service_name="$(jq -r '.service_name' <<<"$service_json")"
    env_json='{}'

    if [[ "$lane" == "preview" ]] && jq -e '.consumes.preview_db == true' <<<"$service_json" >/dev/null; then
      [[ -n "$preview_db_name" ]] || ci::die "Preview DB name is required for service ${service_id}."
      [[ -n "$preview_db_user" ]] || ci::die "Preview DB user is required for service ${service_id}."
      [[ -n "$preview_db_password" ]] || ci::die "Preview DB password is required for service ${service_id}."
      env_json="$(jq -c \
        --arg db_name "$preview_db_name" \
        --arg db_user "$preview_db_user" \
        --arg db_password "$preview_db_password" \
        '. + {
          DC_MEDUSA_APP_DB_NAME: $db_name,
          DC_MEDUSA_APP_DB_USER: $db_user,
          DC_MEDUSA_APP_DB_PASSWORD: $db_password
        }' <<<"$env_json")"
    fi

    if jq -e '.consumes.meili_frontend_key == true' <<<"$service_json" >/dev/null; then
      [[ -n "$meili_frontend_key" ]] || ci::die "Frontend Meili key is required for service ${service_id}."
      env_json="$(jq -c \
        --arg env_var "$meili_frontend_env_var" \
        --arg value "$meili_frontend_key" \
        '. + {($env_var): $value}' <<<"$env_json")"
    fi

    if jq -e '.consumes.meili_backend_key == true' <<<"$service_json" >/dev/null; then
      [[ -n "$meili_backend_key" ]] || ci::die "Backend Meili key is required for service ${service_id}."
      env_json="$(jq -c --arg value "$meili_backend_key" '. + {DC_MEILISEARCH_BACKEND_API_KEY: $value}' <<<"$env_json")"
    fi

    if [[ "$(jq 'length' <<<"$env_json")" -gt 0 ]]; then
      item_json="$(jq -cn \
        --arg service_id "$service_id" \
        --arg service_name "$service_name" \
        --argjson env "$env_json" \
        '{service_id:$service_id, service_name:$service_name, env:$env}')"
      printf '%s\n' "$item_json" >>"$tmp_items"
    fi
  done < <(zane::csv_to_lines "$services_csv")

  local services_json
  if [[ -s "$tmp_items" ]]; then
    services_json="$(jq -sc '.' "$tmp_items")"
  else
    services_json='[]'
  fi

  local full_json
  full_json="$(jq -cn --arg lane "$lane" --argjson services "$services_json" '{lane:$lane, services:$services}')"

  if [[ -n "$output_json" ]]; then
    zane::write_json_file "$output_json" "$full_json"
  fi

  local override_service_ids_csv
  override_service_ids_csv="$(jq -r '[.services[].service_id] | join(",")' <<<"$full_json")"
  ci::gha_output override_service_ids_csv "$override_service_ids_csv"
  ci::gha_output override_service_count "$(jq -r '.services | length' <<<"$full_json")"

  jq -c '
    .services |= map(.env |= with_entries(.value = "***redacted***"))
  ' <<<"$full_json"
}

zane::cmd_resolve_environment() {
  zane::require_common_commands

  local lane=""
  local project_slug="${ZANE_CANONICAL_PROJECT_SLUG:-}"
  local pr_number=""
  local environment_name="${ZANE_PRODUCTION_ENVIRONMENT_NAME:-}"
  local output_json=""
  local base_url="${ZANE_OPERATOR_BASE_URL:-}"
  local api_token="${ZANE_OPERATOR_API_TOKEN:-}"
  local dry_run="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --lane)
        lane="${2-}"
        shift 2
        ;;
      --project-slug)
        project_slug="${2-}"
        shift 2
        ;;
      --pr-number)
        pr_number="${2-}"
        shift 2
        ;;
      --environment-name)
        environment_name="${2-}"
        shift 2
        ;;
      --output-json)
        output_json="${2-}"
        shift 2
        ;;
      --base-url)
        base_url="${2-}"
        shift 2
        ;;
      --api-token)
        api_token="${2-}"
        shift 2
        ;;
      --dry-run)
        dry_run="true"
        shift
        ;;
      -h|--help)
        cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh resolve-environment --lane <preview|main> [options]

Options:
  --project-slug <slug>      default: $ZANE_CANONICAL_PROJECT_SLUG
  --pr-number <n>            required for preview lane unless --environment-name supplied
  --environment-name <name>  preview default: derived from PR number; main default: $ZANE_PRODUCTION_ENVIRONMENT_NAME
  --base-url <url>
  --api-token <token>
  --output-json <path>
  --dry-run
EOF
        return 0
        ;;
      *)
        ci::die "Unknown argument for resolve-environment: $1"
        ;;
    esac
  done

  zane::require_lane "$lane"
  [[ -n "$project_slug" ]] || ci::die "Zane canonical project slug is required."

  if [[ "$lane" == "preview" ]]; then
    if [[ -z "$environment_name" ]]; then
      [[ -n "$pr_number" ]] || ci::die "Preview lane requires --pr-number or --environment-name."
      zane::require_numeric "$pr_number" "PR number"
      environment_name="$(zane::preview_environment_name "$pr_number")"
    fi
  else
    [[ -n "$environment_name" ]] || ci::die "Main lane requires --environment-name or ZANE_PRODUCTION_ENVIRONMENT_NAME."
  fi

  local response_json
  if [[ "$dry_run" == "true" ]]; then
    response_json="$(jq -cn \
      --arg lane "$lane" \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      '{lane:$lane, project_slug:$project_slug, environment_name:$environment_name, environment_id:("dry-run:" + $environment_name), created:false}')"
  else
    local payload
    payload="$(jq -cn \
      --arg lane "$lane" \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --arg pr_number "$pr_number" \
      '{
        lane: $lane,
        project_slug: $project_slug,
        environment_name: $environment_name,
        pr_number: (if $pr_number == "" then null else ($pr_number | tonumber) end)
      }')"
    response_json="$(zane::api_request POST "/v1/zane/environments/resolve" "$payload" "$base_url" "$api_token")"
  fi

  [[ -n "$(jq -r '.environment_name // empty' <<<"$response_json")" ]] || ci::die "Environment response missing environment_name."
  [[ -n "$(jq -r '.project_slug // empty' <<<"$response_json")" ]] || ci::die "Environment response missing project_slug."

  if [[ -n "$output_json" ]]; then
    zane::write_json_file "$output_json" "$response_json"
  fi

  ci::gha_output environment_name "$(jq -r '.environment_name' <<<"$response_json")"
  ci::gha_output environment_id "$(jq -r '.environment_id // empty' <<<"$response_json")"
  ci::gha_output environment_created "$(jq -r '.created // false' <<<"$response_json")"
  printf '%s\n' "$response_json"
}

zane::cmd_resolve_targets() {
  zane::require_common_commands

  local lane=""
  local project_slug="${ZANE_CANONICAL_PROJECT_SLUG:-}"
  local environment_name=""
  local plan_json=""
  local output_json=""
  local base_url="${ZANE_OPERATOR_BASE_URL:-}"
  local api_token="${ZANE_OPERATOR_API_TOKEN:-}"
  local dry_run="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --lane)
        lane="${2-}"
        shift 2
        ;;
      --project-slug)
        project_slug="${2-}"
        shift 2
        ;;
      --environment-name)
        environment_name="${2-}"
        shift 2
        ;;
      --plan-json)
        plan_json="${2-}"
        shift 2
        ;;
      --output-json)
        output_json="${2-}"
        shift 2
        ;;
      --base-url)
        base_url="${2-}"
        shift 2
        ;;
      --api-token)
        api_token="${2-}"
        shift 2
        ;;
      --dry-run)
        dry_run="true"
        shift
        ;;
      -h|--help)
        cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh resolve-targets --lane <preview|main> --environment-name <name> --plan-json <path> [options]
EOF
        return 0
        ;;
      *)
        ci::die "Unknown argument for resolve-targets: $1"
        ;;
    esac
  done

  zane::require_lane "$lane"
  [[ -n "$project_slug" ]] || ci::die "Zane canonical project slug is required."
  [[ -n "$environment_name" ]] || ci::die "Environment name is required."
  [[ -n "$plan_json" ]] || ci::die "--plan-json is required."
  zane::require_file "$plan_json"

  local deploy_services_json
  deploy_services_json="$(jq -c '.deploy_services // []' "$plan_json")"
  local response_json

  if [[ "$dry_run" == "true" ]]; then
    response_json="$(jq -cn \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --argjson services "$deploy_services_json" \
      '{
        project_slug: $project_slug,
        environment_name: $environment_name,
        services: ($services | map({
          service_id: .id,
          service_name: .service_name,
          target_id: ("dry-run:" + .service_name),
          deploy_key_ref: ("dry-run:key:" + .service_name)
        }))
      }')"
  else
    local payload
    payload="$(jq -cn \
      --arg lane "$lane" \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --argjson services "$deploy_services_json" \
      '{lane:$lane, project_slug:$project_slug, environment_name:$environment_name, services:$services}')"
    response_json="$(zane::api_request POST "/v1/zane/deploy/resolve-targets" "$payload" "$base_url" "$api_token")"
  fi

  jq -e '.services | type == "array"' <<<"$response_json" >/dev/null || ci::die "Resolve-targets response missing services array."

  if [[ -n "$output_json" ]]; then
    zane::write_json_file "$output_json" "$response_json"
  fi

  ci::gha_output target_service_ids_csv "$(jq -r '[.services[].service_id] | join(",")' <<<"$response_json")"
  jq -c '.services |= map(with_entries(if (.key | test("deploy|token|key|url")) then .value = "***redacted***" else . end))' <<<"$response_json"
}

zane::cmd_apply_env_overrides() {
  zane::require_common_commands

  local project_slug="${ZANE_CANONICAL_PROJECT_SLUG:-}"
  local environment_name=""
  local targets_json=""
  local env_overrides_json=""
  local output_json=""
  local base_url="${ZANE_OPERATOR_BASE_URL:-}"
  local api_token="${ZANE_OPERATOR_API_TOKEN:-}"
  local dry_run="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-slug)
        project_slug="${2-}"
        shift 2
        ;;
      --environment-name)
        environment_name="${2-}"
        shift 2
        ;;
      --targets-json)
        targets_json="${2-}"
        shift 2
        ;;
      --env-overrides-json)
        env_overrides_json="${2-}"
        shift 2
        ;;
      --output-json)
        output_json="${2-}"
        shift 2
        ;;
      --base-url)
        base_url="${2-}"
        shift 2
        ;;
      --api-token)
        api_token="${2-}"
        shift 2
        ;;
      --dry-run)
        dry_run="true"
        shift
        ;;
      -h|--help)
        cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh apply-env-overrides --environment-name <name> --targets-json <path> --env-overrides-json <path> [options]
EOF
        return 0
        ;;
      *)
        ci::die "Unknown argument for apply-env-overrides: $1"
        ;;
    esac
  done

  [[ -n "$project_slug" ]] || ci::die "Zane canonical project slug is required."
  [[ -n "$environment_name" ]] || ci::die "Environment name is required."
  [[ -n "$targets_json" ]] || ci::die "--targets-json is required."
  [[ -n "$env_overrides_json" ]] || ci::die "--env-overrides-json is required."
  zane::require_file "$targets_json"
  zane::require_file "$env_overrides_json"

  local override_count
  override_count="$(jq -r '.services | length' "$env_overrides_json")"
  local response_json

  if [[ "$override_count" == "0" ]]; then
    response_json="$(jq -cn \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      '{project_slug:$project_slug, environment_name:$environment_name, noop:true, applied_service_ids:[]}' )"
  elif [[ "$dry_run" == "true" ]]; then
    response_json="$(jq -cn \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --argjson env_overrides "$(jq -c '.services' "$env_overrides_json")" \
      '{
        project_slug: $project_slug,
        environment_name: $environment_name,
        noop: false,
        applied_service_ids: ($env_overrides | map(.service_id))
      }')"
  else
    local payload
    payload="$(jq -cn \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --argjson targets "$(jq -c '.services // []' "$targets_json")" \
      --argjson env_overrides "$(jq -c '.services // []' "$env_overrides_json")" \
      '{project_slug:$project_slug, environment_name:$environment_name, targets:$targets, env_overrides:$env_overrides}')"
    response_json="$(zane::api_request POST "/v1/zane/deploy/apply-env-overrides" "$payload" "$base_url" "$api_token")"
  fi

  if [[ -n "$output_json" ]]; then
    zane::write_json_file "$output_json" "$response_json"
  fi

  ci::gha_output applied_service_ids_csv "$(jq -r '.applied_service_ids | join(",")' <<<"$response_json")"
  printf '%s\n' "$response_json"
}

zane::cmd_trigger() {
  zane::require_common_commands

  local project_slug="${ZANE_CANONICAL_PROJECT_SLUG:-}"
  local environment_name=""
  local targets_json=""
  local output_json=""
  local base_url="${ZANE_OPERATOR_BASE_URL:-}"
  local api_token="${ZANE_OPERATOR_API_TOKEN:-}"
  local dry_run="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-slug)
        project_slug="${2-}"
        shift 2
        ;;
      --environment-name)
        environment_name="${2-}"
        shift 2
        ;;
      --targets-json)
        targets_json="${2-}"
        shift 2
        ;;
      --output-json)
        output_json="${2-}"
        shift 2
        ;;
      --base-url)
        base_url="${2-}"
        shift 2
        ;;
      --api-token)
        api_token="${2-}"
        shift 2
        ;;
      --dry-run)
        dry_run="true"
        shift
        ;;
      -h|--help)
        cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh trigger --environment-name <name> --targets-json <path> [options]
EOF
        return 0
        ;;
      *)
        ci::die "Unknown argument for trigger: $1"
        ;;
    esac
  done

  [[ -n "$project_slug" ]] || ci::die "Zane canonical project slug is required."
  [[ -n "$environment_name" ]] || ci::die "Environment name is required."
  [[ -n "$targets_json" ]] || ci::die "--targets-json is required."
  zane::require_file "$targets_json"

  local response_json
  if [[ "$dry_run" == "true" ]]; then
    response_json="$(jq -cn \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --argjson services "$(jq -c '.services // []' "$targets_json")" \
      '{
        project_slug: $project_slug,
        environment_name: $environment_name,
        triggered_service_ids: ($services | map(.service_id)),
        services: ($services | map({service_id, service_name, service_slug, service_type, deployment_hash: ("dry-run:deploy:" + .service_name), status: "HEALTHY"}))
      }')"
  else
    local payload
    payload="$(jq -cn \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --argjson targets "$(jq -c '.services // []' "$targets_json")" \
      '{project_slug:$project_slug, environment_name:$environment_name, targets:$targets}')"
    response_json="$(zane::api_request POST "/v1/zane/deploy/trigger" "$payload" "$base_url" "$api_token")"
  fi

  if [[ -n "$output_json" ]]; then
    zane::write_json_file "$output_json" "$response_json"
  fi

  ci::gha_output triggered_services_csv "$(jq -r '.triggered_service_ids | join(",")' <<<"$response_json")"
  printf '%s\n' "$response_json"
}

zane::cmd_verify() {
  zane::require_common_commands

  local lane=""
  local project_slug="${ZANE_CANONICAL_PROJECT_SLUG:-}"
  local environment_name=""
  local requested_services_csv=""
  local deploy_services_csv=""
  local triggered_services_csv=""
  local preview_db_name=""
  local preview_db_user=""
  local preview_db_password=""
  local meili_frontend_key=""
  local meili_frontend_env_var=""
  local meili_backend_key=""
  local deployments_json=""
  local deployments_json_inline=""
  local output_json=""
  local base_url="${ZANE_OPERATOR_BASE_URL:-}"
  local api_token="${ZANE_OPERATOR_API_TOKEN:-}"
  local dry_run="false"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --lane)
        lane="${2-}"
        shift 2
        ;;
      --project-slug)
        project_slug="${2-}"
        shift 2
        ;;
      --environment-name)
        environment_name="${2-}"
        shift 2
        ;;
      --requested-services-csv)
        requested_services_csv="${2-}"
        shift 2
        ;;
      --deploy-services-csv)
        deploy_services_csv="${2-}"
        shift 2
        ;;
      --triggered-services-csv)
        triggered_services_csv="${2-}"
        shift 2
        ;;
      --preview-db-name)
        preview_db_name="${2-}"
        shift 2
        ;;
      --preview-db-user)
        preview_db_user="${2-}"
        shift 2
        ;;
      --preview-db-password)
        preview_db_password="${2-}"
        shift 2
        ;;
      --meili-frontend-key)
        meili_frontend_key="${2-}"
        shift 2
        ;;
      --meili-frontend-env-var)
        meili_frontend_env_var="${2-}"
        shift 2
        ;;
      --meili-backend-key)
        meili_backend_key="${2-}"
        shift 2
        ;;
      --deployments-json)
        deployments_json="${2-}"
        shift 2
        ;;
      --deployments-json-inline)
        deployments_json_inline="${2-}"
        shift 2
        ;;
      --output-json)
        output_json="${2-}"
        shift 2
        ;;
      --base-url)
        base_url="${2-}"
        shift 2
        ;;
      --api-token)
        api_token="${2-}"
        shift 2
        ;;
      --dry-run)
        dry_run="true"
        shift
        ;;
      -h|--help)
        cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh verify --lane <preview|main> --environment-name <name> [options]
EOF
        return 0
        ;;
      *)
        ci::die "Unknown argument for verify: $1"
        ;;
    esac
  done

  zane::require_lane "$lane"
  [[ -n "$project_slug" ]] || ci::die "Zane canonical project slug is required."
  [[ -n "$environment_name" ]] || ci::die "Environment name is required."
  if [[ -n "$deployments_json" && -n "$deployments_json_inline" ]]; then
    ci::die "Pass only one of --deployments-json or --deployments-json-inline."
  fi

  local env_overrides_json_file
  env_overrides_json_file="$(mktemp)"
  trap "rm -f '$env_overrides_json_file'" RETURN
  zane::cmd_render_env_overrides \
    --lane "$lane" \
    --services-csv "$deploy_services_csv" \
    --preview-db-name "$preview_db_name" \
    --preview-db-user "$preview_db_user" \
    --preview-db-password "$preview_db_password" \
    --meili-frontend-key "$meili_frontend_key" \
    --meili-frontend-env-var "$meili_frontend_env_var" \
    --meili-backend-key "$meili_backend_key" \
    --output-json "$env_overrides_json_file" >/dev/null

  local requested_services_json
  local deploy_services_json
  local triggered_services_json
  requested_services_json="$(jq -c -Rn --arg csv "$(zane::normalize_csv_or_empty "$requested_services_csv")" 'if $csv == "" then [] else ($csv | split(",")) end')"
  deploy_services_json="$(jq -c -Rn --arg csv "$(zane::normalize_csv_or_empty "$deploy_services_csv")" 'if $csv == "" then [] else ($csv | split(",")) end')"
  triggered_services_json="$(jq -c -Rn --arg csv "$(zane::normalize_csv_or_empty "$triggered_services_csv")" 'if $csv == "" then [] else ($csv | split(",")) end')"

  local deployments_json_payload='[]'
  if [[ -n "$deployments_json" ]]; then
    zane::require_file "$deployments_json"
    deployments_json_payload="$(jq -c '.services // []' "$deployments_json")"
  elif [[ -n "$deployments_json_inline" ]]; then
    deployments_json_payload="$(jq -c '.services // []' <<<"$deployments_json_inline")"
  fi

  local response_json
  if [[ "$dry_run" == "true" ]]; then
    response_json="$(jq -cn \
      --arg lane "$lane" \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --argjson requested_service_ids "$requested_services_json" \
      --argjson deploy_service_ids "$deploy_services_json" \
      --argjson triggered_service_ids "$triggered_services_json" \
      --argjson expected_env_overrides "$(jq -c '.services // []' "$env_overrides_json_file")" \
      --argjson deployments "$deployments_json_payload" \
      '{
        lane: $lane,
        project_slug: $project_slug,
        environment_name: $environment_name,
        verified: true,
        requested_service_ids: $requested_service_ids,
        deploy_service_ids: $deploy_service_ids,
        triggered_service_ids: $triggered_service_ids,
        checked_env_override_service_ids: ($expected_env_overrides | map(.service_id)),
        checked_deployment_service_ids: ($deployments | map(.service_id)),
        checked_deployments: ($deployments | map({
          service_id,
          service_name,
          deployment_hash,
          status: (.status // "HEALTHY"),
          status_reason: null
        }))
      }')"
  else
    local payload
    payload="$(jq -cn \
      --arg lane "$lane" \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --argjson requested_service_ids "$requested_services_json" \
      --argjson deploy_service_ids "$deploy_services_json" \
      --argjson triggered_service_ids "$triggered_services_json" \
      --argjson expected_env_overrides "$(jq -c '.services // []' "$env_overrides_json_file")" \
      --argjson deployments "$deployments_json_payload" \
      '{
        lane: $lane,
        project_slug: $project_slug,
        environment_name: $environment_name,
        requested_service_ids: $requested_service_ids,
        deploy_service_ids: $deploy_service_ids,
        triggered_service_ids: $triggered_service_ids,
        expected_env_overrides: $expected_env_overrides,
        deployments: $deployments
      }')"
    response_json="$(zane::api_request POST "/v1/zane/deploy/verify" "$payload" "$base_url" "$api_token")"
  fi

  [[ "$(jq -r '.verified // false' <<<"$response_json")" == "true" ]] || ci::die "Deploy verification failed."

  if [[ -n "$output_json" ]]; then
    zane::write_json_file "$output_json" "$response_json"
  fi

  ci::gha_output verified "$(jq -r '.verified' <<<"$response_json")"
  printf '%s\n' "$response_json"
}

zane::cmd_run_preview() {
  zane::require_common_commands

  local project_slug="${ZANE_CANONICAL_PROJECT_SLUG:-}"
  local pr_number=""
  local services_csv=""
  local preview_db_name=""
  local preview_db_user=""
  local preview_db_password=""
  local meili_frontend_key=""
  local meili_frontend_env_var=""
  local base_url="${ZANE_OPERATOR_BASE_URL:-}"
  local api_token="${ZANE_OPERATOR_API_TOKEN:-}"
  local dry_run="false"
  local dry_run_flags=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-slug)
        project_slug="${2-}"
        shift 2
        ;;
      --pr-number)
        pr_number="${2-}"
        shift 2
        ;;
      --services-csv)
        services_csv="${2-}"
        shift 2
        ;;
      --preview-db-name)
        preview_db_name="${2-}"
        shift 2
        ;;
      --preview-db-user)
        preview_db_user="${2-}"
        shift 2
        ;;
      --preview-db-password)
        preview_db_password="${2-}"
        shift 2
        ;;
      --meili-frontend-key)
        meili_frontend_key="${2-}"
        shift 2
        ;;
      --meili-frontend-env-var)
        meili_frontend_env_var="${2-}"
        shift 2
        ;;
      --base-url)
        base_url="${2-}"
        shift 2
        ;;
      --api-token)
        api_token="${2-}"
        shift 2
        ;;
      --dry-run)
        dry_run="true"
        shift
        ;;
      -h|--help)
        cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh run-preview --project-slug <slug> --pr-number <n> --services-csv <csv> [options]
EOF
        return 0
        ;;
      *)
        ci::die "Unknown argument for run-preview: $1"
        ;;
    esac
  done

  [[ -n "$project_slug" ]] || ci::die "Zane canonical project slug is required."
  [[ -n "$pr_number" ]] || ci::die "--pr-number is required."
  zane::require_numeric "$pr_number" "PR number"
  if [[ "$dry_run" == "true" ]]; then
    dry_run_flags=(--dry-run)
  fi

  local plan_json_file
  local env_overrides_json_file
  local environment_json_file
  local targets_json_file
  local apply_json_file
  local trigger_json_file
  local all_deployments_json_file
  plan_json_file="$(mktemp)"
  env_overrides_json_file="$(mktemp)"
  environment_json_file="$(mktemp)"
  targets_json_file="$(mktemp)"
  apply_json_file="$(mktemp)"
  trigger_json_file="$(mktemp)"
  all_deployments_json_file="$(mktemp)"
  trap "rm -f '$plan_json_file' '$env_overrides_json_file' '$environment_json_file' '$targets_json_file' '$apply_json_file' '$trigger_json_file' '$all_deployments_json_file'" RETURN
  printf '%s\n' '{"services":[]}' >"$all_deployments_json_file"

  zane::cmd_plan --lane preview --services-csv "$services_csv" --pr-number "$pr_number" --output-json "$plan_json_file" >/dev/null
  zane::cmd_render_env_overrides \
    --lane preview \
    --services-csv "$(jq -r '.deploy_services_csv' "$plan_json_file")" \
    --preview-db-name "$preview_db_name" \
    --preview-db-user "$preview_db_user" \
    --preview-db-password "$preview_db_password" \
    --meili-frontend-key "$meili_frontend_key" \
    --meili-frontend-env-var "$meili_frontend_env_var" \
    --output-json "$env_overrides_json_file" >/dev/null
  zane::cmd_resolve_environment \
    --lane preview \
    --project-slug "$project_slug" \
    --pr-number "$pr_number" \
    --environment-name "$(jq -r '.preview_environment_name' "$plan_json_file")" \
    --output-json "$environment_json_file" \
    "${dry_run_flags[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null
  zane::cmd_resolve_targets \
    --lane preview \
    --project-slug "$project_slug" \
    --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
    --plan-json "$plan_json_file" \
    --output-json "$targets_json_file" \
    "${dry_run_flags[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null
  zane::cmd_apply_env_overrides \
    --project-slug "$project_slug" \
    --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
    --targets-json "$targets_json_file" \
    --env-overrides-json "$env_overrides_json_file" \
    --output-json "$apply_json_file" \
    "${dry_run_flags[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null
  zane::cmd_trigger \
    --project-slug "$project_slug" \
    --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
    --targets-json "$targets_json_file" \
    --output-json "$trigger_json_file" \
    "${dry_run_flags[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null
  zane::merge_deployments_json_file "$trigger_json_file" "$all_deployments_json_file"

  ci::gha_output lane "preview"
  ci::gha_output environment_name "$(jq -r '.environment_name' "$environment_json_file")"
  ci::gha_output environment_id "$(jq -r '.environment_id // empty' "$environment_json_file")"
  ci::gha_output environment_created "$(jq -r '.created // false' "$environment_json_file")"
  ci::gha_output requested_services_csv "$(jq -r '.requested_services_csv' "$plan_json_file")"
  ci::gha_output deploy_services_csv "$(jq -r '.deploy_services_csv' "$plan_json_file")"
  ci::gha_output env_override_service_ids_csv "$(jq -r '[.services[].service_id] | join(",")' "$env_overrides_json_file")"
  ci::gha_output triggered_services_csv "$(jq -r '.triggered_service_ids | join(",")' "$trigger_json_file")"
  ci::gha_output deployments_json "$(jq -c '.' "$all_deployments_json_file")"

  jq -cn \
    --arg lane "preview" \
    --arg project_slug "$project_slug" \
    --arg environment_name "$(jq -r '.environment_name' "$environment_json_file")" \
    --arg environment_id "$(jq -r '.environment_id // empty' "$environment_json_file")" \
    --argjson environment_created "$(jq -r '.created // false' "$environment_json_file")" \
    --arg requested_services_csv "$(jq -r '.requested_services_csv' "$plan_json_file")" \
    --arg deploy_services_csv "$(jq -r '.deploy_services_csv' "$plan_json_file")" \
    --arg env_override_service_ids_csv "$(jq -r '[.services[].service_id] | join(",")' "$env_overrides_json_file")" \
    --arg triggered_services_csv "$(jq -r '.triggered_service_ids | join(",")' "$trigger_json_file")" \
    --argjson deployments "$(jq -c '.services // []' "$all_deployments_json_file")" \
    '{
      lane: $lane,
      project_slug: $project_slug,
      environment_name: $environment_name,
      environment_id: $environment_id,
      environment_created: $environment_created,
      requested_services_csv: $requested_services_csv,
      deploy_services_csv: $deploy_services_csv,
      env_override_service_ids_csv: $env_override_service_ids_csv,
      triggered_services_csv: $triggered_services_csv,
      deployments: $deployments
    }'
}

zane::cmd_run_main() {
  zane::require_common_commands

  local project_slug="${ZANE_CANONICAL_PROJECT_SLUG:-}"
  local environment_name="${ZANE_PRODUCTION_ENVIRONMENT_NAME:-}"
  local services_csv=""
  local base_url="${ZANE_OPERATOR_BASE_URL:-}"
  local api_token="${ZANE_OPERATOR_API_TOKEN:-}"
  local meili_url="${MEILISEARCH_URL:-}"
  local meili_master_key="${MEILISEARCH_MASTER_KEY:-}"
  local dry_run="false"
  local dry_run_flags=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-slug)
        project_slug="${2-}"
        shift 2
        ;;
      --environment-name)
        environment_name="${2-}"
        shift 2
        ;;
      --services-csv)
        services_csv="${2-}"
        shift 2
        ;;
      --base-url)
        base_url="${2-}"
        shift 2
        ;;
      --api-token)
        api_token="${2-}"
        shift 2
        ;;
      --meili-url)
        meili_url="${2-}"
        shift 2
        ;;
      --meili-master-key)
        meili_master_key="${2-}"
        shift 2
        ;;
      --dry-run)
        dry_run="true"
        shift
        ;;
      -h|--help)
        cat <<'EOF'
Usage:
  scripts/ci/zane-deploy.sh run-main --project-slug <slug> --environment-name <name> --services-csv <csv> [options]
EOF
        return 0
        ;;
      *)
        ci::die "Unknown argument for run-main: $1"
        ;;
    esac
  done

  [[ -n "$project_slug" ]] || ci::die "Zane canonical project slug is required."
  [[ -n "$environment_name" ]] || ci::die "Main environment name is required."
  if [[ "$dry_run" == "true" ]]; then
    dry_run_flags=(--dry-run)
  fi

  local plan_json_file
  local environment_json_file
  local prepare_needs_json_file
  local stage_plan_json_file
  local env_overrides_json_file
  local targets_json_file
  local apply_json_file
  local trigger_json_file
  local verify_json_file
  local all_deployments_json_file
  plan_json_file="$(mktemp)"
  environment_json_file="$(mktemp)"
  prepare_needs_json_file="$(mktemp)"
  stage_plan_json_file="$(mktemp)"
  env_overrides_json_file="$(mktemp)"
  targets_json_file="$(mktemp)"
  apply_json_file="$(mktemp)"
  trigger_json_file="$(mktemp)"
  verify_json_file="$(mktemp)"
  all_deployments_json_file="$(mktemp)"
  trap "rm -f '$plan_json_file' '$environment_json_file' '$prepare_needs_json_file' '$stage_plan_json_file' '$env_overrides_json_file' '$targets_json_file' '$apply_json_file' '$trigger_json_file' '$verify_json_file' '$all_deployments_json_file'" RETURN
  printf '%s\n' '{"services":[]}' >"$all_deployments_json_file"

  zane::cmd_plan --lane main --services-csv "$services_csv" --output-json "$plan_json_file" >/dev/null
  bash "${ROOT_DIR}/scripts/ci/resolve-prepare-needs.sh" --lane main --services-csv "$(jq -r '.deploy_services_csv' "$plan_json_file")" >"$prepare_needs_json_file"
  zane::cmd_resolve_environment \
    --lane main \
    --project-slug "$project_slug" \
    --environment-name "$environment_name" \
    --output-json "$environment_json_file" \
    "${dry_run_flags[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null

  local meili_required
  local meili_keys_ready="false"
  local meili_backend_key=""
  local meili_frontend_key=""
  local meili_frontend_env_var=""
  local stage
  local stage_services_csv
  local triggered_services_csv=""
  local env_override_service_ids_csv=""

  meili_required="$(jq -r '.requires_meili_keys' "$prepare_needs_json_file")"

  while IFS= read -r stage; do
    [[ -n "$stage" ]] || continue
    stage_services_csv="$(zane::stage_services_csv_from_plan "$plan_json_file" "$stage")"
    [[ -n "$stage_services_csv" ]] || continue

    if [[ "$meili_required" == "true" ]] && [[ "$meili_keys_ready" != "true" ]]; then
      if zane::stage_has_meili_consumers "$plan_json_file" "$stage"; then
        local meili_json
        meili_json="$(zane::provision_meili_keys "$meili_url" "$meili_master_key")"
        meili_backend_key="$(jq -r '.backend_key' <<<"$meili_json")"
        meili_frontend_key="$(jq -r '.frontend_key' <<<"$meili_json")"
        meili_frontend_env_var="$(jq -r '.frontend_env_var' <<<"$meili_json")"
        meili_keys_ready="true"
      fi
    fi

    zane::stage_plan_json "$plan_json_file" "$stage" >"$stage_plan_json_file"
    zane::cmd_render_env_overrides \
      --lane main \
      --services-csv "$stage_services_csv" \
      --meili-frontend-key "$meili_frontend_key" \
      --meili-frontend-env-var "$meili_frontend_env_var" \
      --meili-backend-key "$meili_backend_key" \
      --output-json "$env_overrides_json_file" >/dev/null
    zane::cmd_resolve_targets \
      --lane main \
      --project-slug "$project_slug" \
      --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
      --plan-json "$stage_plan_json_file" \
      --output-json "$targets_json_file" \
      "${dry_run_flags[@]}" \
      --base-url "$base_url" \
      --api-token "$api_token" >/dev/null
    zane::cmd_apply_env_overrides \
      --project-slug "$project_slug" \
      --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
      --targets-json "$targets_json_file" \
      --env-overrides-json "$env_overrides_json_file" \
      --output-json "$apply_json_file" \
      "${dry_run_flags[@]}" \
      --base-url "$base_url" \
      --api-token "$api_token" >/dev/null
    zane::cmd_trigger \
      --project-slug "$project_slug" \
      --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
      --targets-json "$targets_json_file" \
      --output-json "$trigger_json_file" \
      "${dry_run_flags[@]}" \
      --base-url "$base_url" \
      --api-token "$api_token" >/dev/null
    zane::merge_deployments_json_file "$trigger_json_file" "$all_deployments_json_file"
    zane::cmd_wait_deployments \
      --lane main \
      --project-slug "$project_slug" \
      --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
      --requested-services-csv "$stage_services_csv" \
      --deploy-services-csv "$stage_services_csv" \
      --triggered-services-csv "$(jq -r '.triggered_service_ids | join(",")' "$trigger_json_file")" \
      --meili-frontend-key "$meili_frontend_key" \
      --meili-frontend-env-var "$meili_frontend_env_var" \
      --meili-backend-key "$meili_backend_key" \
      --deployments-json "$trigger_json_file" \
      --output-json "$verify_json_file" \
      "${dry_run_flags[@]}" \
      --base-url "$base_url" \
      --api-token "$api_token" >/dev/null

    triggered_services_csv="$(jq -r --arg existing "$triggered_services_csv" --arg current "$(jq -r '.triggered_service_ids | join(",")' "$trigger_json_file")" '
      [($existing | split(",")[]? | select(length > 0)), ($current | split(",")[]? | select(length > 0))]
      | unique
      | join(",")
    ' <<<"{}")"
    env_override_service_ids_csv="$(jq -r --arg existing "$env_override_service_ids_csv" --arg current "$(jq -r '[.services[].service_id] | join(",")' "$env_overrides_json_file")" '
      [($existing | split(",")[]? | select(length > 0)), ($current | split(",")[]? | select(length > 0))]
      | unique
      | join(",")
    ' <<<"{}")"

    if [[ "$meili_required" == "true" ]] && zane::stage_has_service "$plan_json_file" "$stage" "medusa-meilisearch"; then
      local post_meili_json
      post_meili_json="$(zane::provision_meili_keys "$meili_url" "$meili_master_key")"
      meili_backend_key="$(jq -r '.backend_key' <<<"$post_meili_json")"
      meili_frontend_key="$(jq -r '.frontend_key' <<<"$post_meili_json")"
      meili_frontend_env_var="$(jq -r '.frontend_env_var' <<<"$post_meili_json")"
      meili_keys_ready="true"
    fi
  done < <(zane::plan_stage_numbers "$plan_json_file")

  ci::gha_output lane "main"
  ci::gha_output environment_name "$(jq -r '.environment_name' "$environment_json_file")"
  ci::gha_output environment_id "$(jq -r '.environment_id // empty' "$environment_json_file")"
  ci::gha_output environment_created "$(jq -r '.created // false' "$environment_json_file")"
  ci::gha_output requested_services_csv "$(jq -r '.requested_services_csv' "$plan_json_file")"
  ci::gha_output deploy_services_csv "$(jq -r '.deploy_services_csv' "$plan_json_file")"
  ci::gha_output env_override_service_ids_csv "$env_override_service_ids_csv"
  ci::gha_output triggered_services_csv "$triggered_services_csv"
  ci::gha_output deployments_json "$(jq -c '.' "$all_deployments_json_file")"

  jq -cn \
    --arg lane "main" \
    --arg project_slug "$project_slug" \
    --arg environment_name "$(jq -r '.environment_name' "$environment_json_file")" \
    --arg environment_id "$(jq -r '.environment_id // empty' "$environment_json_file")" \
    --argjson environment_created "$(jq -r '.created // false' "$environment_json_file")" \
    --arg requested_services_csv "$(jq -r '.requested_services_csv' "$plan_json_file")" \
    --arg deploy_services_csv "$(jq -r '.deploy_services_csv' "$plan_json_file")" \
    --arg env_override_service_ids_csv "$env_override_service_ids_csv" \
    --arg triggered_services_csv "$triggered_services_csv" \
    --argjson deployments "$(jq -c '.services // []' "$all_deployments_json_file")" \
    '{
      lane: $lane,
      project_slug: $project_slug,
      environment_name: $environment_name,
      environment_id: $environment_id,
      environment_created: $environment_created,
      requested_services_csv: $requested_services_csv,
      deploy_services_csv: $deploy_services_csv,
      env_override_service_ids_csv: $env_override_service_ids_csv,
      triggered_services_csv: $triggered_services_csv,
      deployments: $deployments
    }'
}

main() {
  local command="${1:-}"
  shift || true

  case "$command" in
    plan)
      zane::cmd_plan "$@"
      ;;
    render-env-overrides)
      zane::cmd_render_env_overrides "$@"
      ;;
    resolve-environment)
      zane::cmd_resolve_environment "$@"
      ;;
    resolve-targets)
      zane::cmd_resolve_targets "$@"
      ;;
    apply-env-overrides)
      zane::cmd_apply_env_overrides "$@"
      ;;
    trigger)
      zane::cmd_trigger "$@"
      ;;
    run-preview)
      zane::cmd_run_preview "$@"
      ;;
    run-main)
      zane::cmd_run_main "$@"
      ;;
    verify)
      zane::cmd_verify "$@"
      ;;
    -h|--help|help|"")
      zane::usage
      ;;
    *)
      zane::usage >&2
      ci::die "Unknown command: ${command}"
      ;;
  esac
}

main "$@"
