zane::is_transient_operator_unavailability_error() {
  local error_text="${1-}"
  [[ "$error_text" == *"zane-operator request failed before a successful HTTP response"* ]] && return 0
  [[ "$error_text" == *"zane-operator returned non-JSON response"* ]] && return 0
  [[ "$error_text" == *"zane-operator request returned HTTP 502"* ]] && return 0
  [[ "$error_text" == *"zane-operator request returned HTTP 503"* ]] && return 0
  [[ "$error_text" == *"zane-operator request returned HTTP 504"* ]] && return 0
  return 1
}

zane::run_wait_verify() {
  local response_json_name="$1"
  local verify_error_file="$2"
  local dry_run="$3"
  shift 3

  local -a verify_args=("$@")
  local verify_response_json=""

  if [[ "$dry_run" == "true" ]]; then
    verify_args+=(--dry-run)
  fi

  if ! verify_response_json="$(zane::new_engine_ctl verify "${verify_args[@]}" 2>"$verify_error_file")"; then
    return 1
  fi

  printf -v "$response_json_name" '%s' "$verify_response_json"
}

zane::checked_deployment_failure_summary() {
  local response_json="$1"

  jq -r '
    [
      (.checked_deployments // [])[]
      | select((.status | ascii_upcase) == "FAILED" or (.status | ascii_upcase) == "UNHEALTHY" or (.status | ascii_upcase) == "CANCELLED" or (.status | ascii_upcase) == "REMOVED")
      | "\(.service_slug)#\(.deployment_hash)=\(.status)\(if (.status_reason // "") != "" then ": " + .status_reason else "" end)"
    ]
    | join("; ")
  ' <<<"$response_json"
}

zane::checked_deployment_in_progress_count() {
  local response_json="$1"

  jq -r '
    [
      (.checked_deployments // [])[]
      | select((.status | ascii_upcase) != "HEALTHY")
    ]
    | length
  ' <<<"$response_json"
}

zane::checked_deployment_non_healthy_summary() {
  local response_json="$1"

  jq -r '
    [
      (.checked_deployments // [])[]
      | select((.status | ascii_upcase) != "HEALTHY")
      | "\(.service_slug)#\(.deployment_hash)=\(.status)\(if (.status_reason // "") != "" then ": " + .status_reason else "" end)"
    ]
    | join("; ")
  ' <<<"$response_json"
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
  local preview_random_once_secrets_json=""
  local meili_frontend_key=""
  local meili_frontend_env_var=""
  local meili_backend_key=""
  local deployments_json=""
  local output_json=""
  local base_url="${ZANE_OPERATOR_BASE_URL:-}"
  local api_token="${ZANE_OPERATOR_API_TOKEN:-}"
  local dry_run="false"
  local preview_service_slug_sets_json='{}'
  local poll_interval_seconds="$ZANE_DEPLOYMENT_POLL_INTERVAL_SECONDS_DEFAULT"
  local wait_timeout_seconds="$ZANE_DEPLOYMENT_WAIT_TIMEOUT_SECONDS_DEFAULT"
  local tolerate_base_url_unavailable="false"
  local started_at
  local response_json
  local failed_services
  local in_progress_count
  local verify_error_file

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
      --preview-random-once-secrets-json)
        preview_random_once_secrets_json="${2-}"
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
      --tolerate-base-url-unavailable)
        tolerate_base_url_unavailable="true"
        shift
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

  local -a verify_args=(
    --lane "$lane"
    --project-slug "$project_slug"
    --environment-name "$environment_name"
    --requested-services-csv "$requested_services_csv"
    --deploy-services-csv "$deploy_services_csv"
    --triggered-services-csv "$triggered_services_csv"
    --preview-db-name "$preview_db_name"
    --preview-db-user "$preview_db_user"
    --preview-db-password "$preview_db_password"
    --preview-random-once-secrets-json "$preview_random_once_secrets_json"
    --meili-frontend-key "$meili_frontend_key"
    --meili-frontend-env-var "$meili_frontend_env_var"
    --meili-backend-key "$meili_backend_key"
    --deployments-json "$deployments_json"
    --base-url "$base_url"
    --api-token "$api_token"
  )

  started_at="$(date +%s)"
  verify_error_file="$(mktemp)"
  trap "rm -f '$verify_error_file'" RETURN

  while true; do
    : >"$verify_error_file"
    if ! zane::run_wait_verify response_json "$verify_error_file" "$dry_run" "${verify_args[@]}"; then
      local verify_error_text
      verify_error_text="$(cat "$verify_error_file")"
      if [[ "$dry_run" != "true" && "$tolerate_base_url_unavailable" == "true" ]] && zane::is_transient_operator_unavailability_error "$verify_error_text"; then
        if (( $(date +%s) - started_at >= wait_timeout_seconds )); then
          printf '%s\n' "$verify_error_text" >&2
          ci::die "Timed out after ${wait_timeout_seconds}s waiting for zane-operator to become reachable again."
        fi
        sleep "$poll_interval_seconds"
        continue
      fi
      printf '%s\n' "$verify_error_text" >&2
      return 1
    fi

    failed_services="$(zane::checked_deployment_failure_summary "$response_json")"
    if [[ -n "$failed_services" ]]; then
      ci::die "Deploy wait failed for triggered deployments: ${failed_services}"
    fi

    in_progress_count="$(zane::checked_deployment_in_progress_count "$response_json")"
    if [[ "$in_progress_count" == "0" ]]; then
      if [[ -n "$output_json" ]]; then
        zane::write_json_file "$output_json" "$response_json"
      fi
      printf '%s\n' "$response_json"
      return 0
    fi

    if (( $(date +%s) - started_at >= wait_timeout_seconds )); then
      ci::die "Timed out after ${wait_timeout_seconds}s waiting for deployments to become HEALTHY: $(zane::checked_deployment_non_healthy_summary "$response_json")"
    fi

    sleep "$poll_interval_seconds"
  done
}
