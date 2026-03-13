zane::run_main_stage_core() {
  local plan_json_file="$1"
  local stage="$2"
  local project_slug="$3"
  local environment_json_file="$4"
  local meili_frontend_key="$5"
  local meili_frontend_env_var="$6"
  local meili_backend_key="$7"
  local git_commit_sha="$8"
  local stage_plan_json_file="$9"
  local env_overrides_json_file="${10}"
  local filtered_env_overrides_json_file="${11}"
  local targets_json_file="${12}"
  local filtered_targets_json_file="${13}"
  local adopted_deployments_json_file="${14}"
  local apply_json_file="${15}"
  local trigger_json_file="${16}"
  local stage_deployments_json_file="${17}"
  local verify_json_file="${18}"
  local all_deployments_json_file="${19}"
  local base_url="${20}"
  local api_token="${21}"
  local dry_run_flags_name="${22}"

  declare -n dry_run_flags_ref="$dry_run_flags_name"

  local stage_services_csv=""
  local wait_flags=()
  stage_services_csv="$(zane::stage_services_csv_from_plan "$plan_json_file" "$stage")"
  [[ -n "$stage_services_csv" ]] || return 0

  zane::stage_plan_json "$plan_json_file" "$stage" >"$stage_plan_json_file"
  zane::new_engine_ctl \
    render-env-overrides \
    --lane main \
    --services-csv "$stage_services_csv" \
    --meili-frontend-key "$meili_frontend_key" \
    --meili-frontend-env-var "$meili_frontend_env_var" \
    --meili-backend-key "$meili_backend_key" \
    --output-json "$env_overrides_json_file" >/dev/null
  zane::new_engine_ctl \
    resolve-targets \
    --lane main \
    --project-slug "$project_slug" \
    --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
    --plan-json "$stage_plan_json_file" \
    --output-json "$targets_json_file" \
    "${dry_run_flags_ref[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null
  zane::filter_targets_for_git_commit \
    "$targets_json_file" \
    "$env_overrides_json_file" \
    "$git_commit_sha" \
    "$filtered_targets_json_file" \
    "$filtered_env_overrides_json_file" \
    "$adopted_deployments_json_file"
  zane::merge_deployments_json_file "$adopted_deployments_json_file" "$all_deployments_json_file"
  if [[ "$(jq -r '.services | length' "$filtered_targets_json_file")" == "0" && "$(jq -r '.services | length' "$adopted_deployments_json_file")" == "0" ]]; then
    return 0
  fi
  if [[ "$(jq -r '.services | length' "$filtered_targets_json_file")" != "0" ]]; then
    zane::new_engine_ctl \
      apply-env-overrides \
      --project-slug "$project_slug" \
      --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
      --targets-json "$filtered_targets_json_file" \
      --env-overrides-json "$filtered_env_overrides_json_file" \
      --output-json "$apply_json_file" \
      "${dry_run_flags_ref[@]}" \
      --base-url "$base_url" \
      --api-token "$api_token" >/dev/null
    zane::cmd_trigger \
      --project-slug "$project_slug" \
      --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
      --targets-json "$filtered_targets_json_file" \
      --git-commit-sha "$git_commit_sha" \
      --output-json "$trigger_json_file" \
      "${dry_run_flags_ref[@]}" \
      --base-url "$base_url" \
      --api-token "$api_token" >/dev/null
    zane::merge_deployments_json_file "$trigger_json_file" "$all_deployments_json_file"
  else
    printf '%s\n' '{"triggered_service_ids":[],"services":[]}' >"$trigger_json_file"
  fi
  zane::write_empty_deployments_json_file "$stage_deployments_json_file"
  zane::merge_deployments_json_file "$adopted_deployments_json_file" "$stage_deployments_json_file"
  zane::merge_deployments_json_file "$trigger_json_file" "$stage_deployments_json_file"
  if zane::stage_has_service "$plan_json_file" "$stage" "zane-operator"; then
    wait_flags+=(--tolerate-base-url-unavailable)
  fi
  if ! zane::cmd_wait_deployments \
    --lane main \
    --project-slug "$project_slug" \
    --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
    --requested-services-csv "$stage_services_csv" \
    --deploy-services-csv "$stage_services_csv" \
    --triggered-services-csv "$(zane::json_file_csv "$trigger_json_file" '.triggered_service_ids // [] | join(",")')" \
    --meili-frontend-key "$meili_frontend_key" \
    --meili-frontend-env-var "$meili_frontend_env_var" \
    --meili-backend-key "$meili_backend_key" \
    --deployments-json "$stage_deployments_json_file" \
    --output-json "$verify_json_file" \
    "${wait_flags[@]}" \
    "${dry_run_flags_ref[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null; then
    ci::die "Main deploy stage ${stage} failed for services: ${stage_services_csv}"
  fi
}

zane::emit_main_run_result() {
  local project_slug="$1"
  local environment_json_file="$2"
  local plan_json_file="$3"
  local env_override_service_ids_csv="$4"
  local triggered_services_csv="$5"
  local skipped_services_csv="$6"
  local all_deployments_json_file="$7"

  ci::gha_output lane "main"
  ci::gha_output environment_name "$(jq -r '.environment_name' "$environment_json_file")"
  ci::gha_output environment_id "$(jq -r '.environment_id // empty' "$environment_json_file")"
  ci::gha_output environment_created "$(jq -r '.created // false' "$environment_json_file")"
  ci::gha_output requested_services_csv "$(jq -r '.requested_services_csv' "$plan_json_file")"
  ci::gha_output deploy_services_csv "$(jq -r '.deploy_services_csv' "$plan_json_file")"
  ci::gha_output env_override_service_ids_csv "$env_override_service_ids_csv"
  ci::gha_output triggered_services_csv "$triggered_services_csv"
  ci::gha_output skipped_services_csv "$skipped_services_csv"
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
    --arg skipped_services_csv "$skipped_services_csv" \
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
      skipped_services_csv: $skipped_services_csv,
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
  local meili_backend_key="${MEILI_BACKEND_KEY:-}"
  local meili_frontend_key="${MEILI_FRONTEND_KEY:-}"
  local meili_frontend_env_var="${MEILI_FRONTEND_ENV_VAR:-}"
  local git_commit_sha=""
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
      --meili-backend-key)
        meili_backend_key="${2-}"
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
      --git-commit-sha)
        git_commit_sha="${2-}"
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
  local stage_plan_json_file
  local env_overrides_json_file
  local filtered_env_overrides_json_file
  local targets_json_file
  local filtered_targets_json_file
  local adopted_deployments_json_file
  local apply_json_file
  local trigger_json_file
  local stage_deployments_json_file
  local verify_json_file
  local all_deployments_json_file
  zane::allocate_temp_file_vars \
    plan_json_file \
    environment_json_file \
    stage_plan_json_file \
    env_overrides_json_file \
    filtered_env_overrides_json_file \
    targets_json_file \
    filtered_targets_json_file \
    adopted_deployments_json_file \
    apply_json_file \
    trigger_json_file \
    stage_deployments_json_file \
    verify_json_file \
    all_deployments_json_file
  zane::install_temp_file_cleanup_trap \
    plan_json_file \
    environment_json_file \
    stage_plan_json_file \
    env_overrides_json_file \
    filtered_env_overrides_json_file \
    targets_json_file \
    filtered_targets_json_file \
    adopted_deployments_json_file \
    apply_json_file \
    trigger_json_file \
    stage_deployments_json_file \
    verify_json_file \
    all_deployments_json_file
  zane::write_empty_deployments_json_file "$all_deployments_json_file"

  zane::new_engine_ctl \
    plan \
    --lane main \
    --services-csv "$services_csv" \
    --output-json "$plan_json_file" >/dev/null
  zane::new_engine_ctl \
    resolve-environment \
    --lane main \
    --project-slug "$project_slug" \
    --environment-name "$environment_name" \
    --output-json "$environment_json_file" \
    "${dry_run_flags[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null

  local stage
  local stage_services_csv
  local triggered_services_csv=""
  local env_override_service_ids_csv=""
  local skipped_services_csv=""

  while IFS= read -r stage; do
    [[ -n "$stage" ]] || continue
    stage_services_csv="$(zane::stage_services_csv_from_plan "$plan_json_file" "$stage")"
    [[ -n "$stage_services_csv" ]] || continue

    zane::run_main_stage_core \
      "$plan_json_file" \
      "$stage" \
      "$project_slug" \
      "$environment_json_file" \
      "$meili_frontend_key" \
      "$meili_frontend_env_var" \
      "$meili_backend_key" \
      "$git_commit_sha" \
      "$stage_plan_json_file" \
      "$env_overrides_json_file" \
      "$filtered_env_overrides_json_file" \
      "$targets_json_file" \
      "$filtered_targets_json_file" \
      "$adopted_deployments_json_file" \
      "$apply_json_file" \
      "$trigger_json_file" \
      "$stage_deployments_json_file" \
      "$verify_json_file" \
      "$all_deployments_json_file" \
      "$base_url" \
      "$api_token" \
      dry_run_flags

    skipped_services_csv="$(zane::merge_csv_from_json_file \
      "$skipped_services_csv" \
      "$filtered_targets_json_file" \
      '.skipped_services | map(.service_id) | join(",")')"
    triggered_services_csv="$(zane::merge_csv_from_json_file \
      "$triggered_services_csv" \
      "$trigger_json_file" \
      '.triggered_service_ids // [] | join(",")')"
    env_override_service_ids_csv="$(zane::merge_csv_from_json_file \
      "$env_override_service_ids_csv" \
      "$filtered_env_overrides_json_file" \
      '[.services[].service_id] | join(",")')"
  done < <(zane::plan_stage_numbers "$plan_json_file")

  zane::emit_main_run_result \
    "$project_slug" \
    "$environment_json_file" \
    "$plan_json_file" \
    "$env_override_service_ids_csv" \
    "$triggered_services_csv" \
    "$skipped_services_csv" \
    "$all_deployments_json_file"
}
