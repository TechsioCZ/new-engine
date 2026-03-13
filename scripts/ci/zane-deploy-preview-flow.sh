zane::run_preview_stage_core() {
  local runtime_plan_json_file="$1"
  local stage="$2"
  local project_slug="$3"
  local environment_json_file="$4"
  local preview_db_name="$5"
  local preview_db_user="$6"
  local preview_db_password="$7"
  local preview_random_once_secrets_json="$8"
  local meili_backend_key="$9"
  local meili_frontend_key="${10}"
  local meili_frontend_env_var="${11}"
  local stage_plan_json_file="${12}"
  local env_overrides_json_file="${13}"
  local targets_json_file="${14}"
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
  stage_services_csv="$(zane::stage_services_csv_from_plan "$runtime_plan_json_file" "$stage")"
  [[ -n "$stage_services_csv" ]] || return 0

  zane::stage_plan_json "$runtime_plan_json_file" "$stage" >"$stage_plan_json_file"
  zane::new_engine_ctl \
    render-env-overrides \
    --lane preview \
    --services-csv "$stage_services_csv" \
    --preview-db-name "$preview_db_name" \
    --preview-db-user "$preview_db_user" \
    --preview-db-password "$preview_db_password" \
    --preview-random-once-secrets-json "$preview_random_once_secrets_json" \
    --meili-backend-key "$meili_backend_key" \
    --meili-frontend-key "$meili_frontend_key" \
    --meili-frontend-env-var "$meili_frontend_env_var" \
    --output-json "$env_overrides_json_file" >/dev/null
  zane::new_engine_ctl \
    resolve-targets \
    --lane preview \
    --project-slug "$project_slug" \
    --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
    --plan-json "$stage_plan_json_file" \
    --output-json "$targets_json_file" \
    "${dry_run_flags_ref[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null
  zane::new_engine_ctl \
    apply-env-overrides \
    --project-slug "$project_slug" \
    --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
    --targets-json "$targets_json_file" \
    --env-overrides-json "$env_overrides_json_file" \
    --output-json "$apply_json_file" \
    "${dry_run_flags_ref[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null
  zane::cmd_trigger \
    --project-slug "$project_slug" \
    --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
    --targets-json "$targets_json_file" \
    --output-json "$trigger_json_file" \
    "${dry_run_flags_ref[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null
  zane::write_empty_deployments_json_file "$stage_deployments_json_file"
  zane::merge_deployments_json_file "$trigger_json_file" "$stage_deployments_json_file"
  zane::merge_deployments_json_file "$trigger_json_file" "$all_deployments_json_file"

  if ! zane::cmd_wait_deployments \
    --lane preview \
    --project-slug "$project_slug" \
    --environment-name "$(jq -r '.environment_name' "$environment_json_file")" \
    --requested-services-csv "$stage_services_csv" \
    --deploy-services-csv "$stage_services_csv" \
    --triggered-services-csv "$(zane::json_file_csv "$trigger_json_file" '.triggered_service_ids // [] | join(",")')" \
    --preview-db-name "$preview_db_name" \
    --preview-db-user "$preview_db_user" \
    --preview-db-password "$preview_db_password" \
    --preview-random-once-secrets-json "$preview_random_once_secrets_json" \
    --meili-backend-key "$meili_backend_key" \
    --meili-frontend-key "$meili_frontend_key" \
    --meili-frontend-env-var "$meili_frontend_env_var" \
    --deployments-json "$stage_deployments_json_file" \
    --output-json "$verify_json_file" \
    "${dry_run_flags_ref[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null; then
    ci::die "Preview deploy stage ${stage} failed for services: ${stage_services_csv}"
  fi
}

zane::emit_preview_run_result() {
  local project_slug="$1"
  local environment_json_file="$2"
  local plan_json_file="$3"
  local runtime_plan_json_file="$4"
  local env_override_service_ids_csv="$5"
  local triggered_services_csv="$6"
  local preview_random_once_secrets_json="$7"
  local meili_backend_key="$8"
  local meili_frontend_key="$9"
  local meili_frontend_env_var="${10}"
  local meili_keys_provisioned="${11}"
  local all_deployments_json_file="${12}"

  ci::gha_output lane "preview"
  ci::gha_mask "$meili_backend_key"
  ci::gha_mask "$meili_frontend_key"
  ci::gha_output environment_name "$(jq -r '.environment_name' "$environment_json_file")"
  ci::gha_output environment_id "$(jq -r '.environment_id // empty' "$environment_json_file")"
  ci::gha_output environment_created "$(jq -r '.created // false' "$environment_json_file")"
  ci::gha_output environment_ready "$(jq -r '.ready // true' "$environment_json_file")"
  ci::gha_output environment_warning_count "$(jq -r '.warnings | length // 0' "$environment_json_file")"
  ci::gha_output requested_services_csv "$(jq -r '.requested_services_csv' "$plan_json_file")"
  ci::gha_output deploy_services_csv "$(jq -r '.deploy_services_csv' "$runtime_plan_json_file")"
  ci::gha_output preview_cloned_service_ids_csv "$(jq -r '.preview_cloned_service_ids_csv' "$runtime_plan_json_file")"
  ci::gha_output preview_excluded_service_ids_csv "$(jq -r '.preview_excluded_service_ids_csv' "$runtime_plan_json_file")"
  ci::gha_output env_override_service_ids_csv "$env_override_service_ids_csv"
  ci::gha_output triggered_services_csv "$triggered_services_csv"
  ci::gha_output preview_random_once_secrets_json "$preview_random_once_secrets_json"
  ci::gha_output meili_backend_key "$meili_backend_key"
  ci::gha_output meili_frontend_key "$meili_frontend_key"
  ci::gha_output meili_frontend_env_var "$meili_frontend_env_var"
  ci::gha_output meili_keys_provisioned "$meili_keys_provisioned"
  ci::gha_output deployments_json "$(jq -c '.' "$all_deployments_json_file")"

  jq -cn \
    --arg lane "preview" \
    --arg project_slug "$project_slug" \
    --arg environment_name "$(jq -r '.environment_name' "$environment_json_file")" \
    --arg environment_id "$(jq -r '.environment_id // empty' "$environment_json_file")" \
    --argjson environment_created "$(jq -r '.created // false' "$environment_json_file")" \
    --argjson environment_ready "$(jq -r '.ready // true' "$environment_json_file")" \
    --arg preview_cloned_service_ids_csv "$(jq -r '.preview_cloned_service_ids_csv' "$runtime_plan_json_file")" \
    --arg preview_excluded_service_ids_csv "$(jq -r '.preview_excluded_service_ids_csv' "$runtime_plan_json_file")" \
    --argjson environment_warnings "$(jq -c '.warnings // []' "$environment_json_file")" \
    --arg requested_services_csv "$(jq -r '.requested_services_csv' "$plan_json_file")" \
    --arg deploy_services_csv "$(jq -r '.deploy_services_csv' "$runtime_plan_json_file")" \
    --arg env_override_service_ids_csv "$env_override_service_ids_csv" \
    --arg triggered_services_csv "$triggered_services_csv" \
    --arg meili_frontend_env_var "$meili_frontend_env_var" \
    --arg meili_keys_provisioned "$meili_keys_provisioned" \
    --argjson deployments "$(jq -c '.services // []' "$all_deployments_json_file")" \
    '{
      lane: $lane,
      project_slug: $project_slug,
      environment_name: $environment_name,
      environment_id: $environment_id,
      environment_created: $environment_created,
      environment_ready: $environment_ready,
      preview_cloned_service_ids_csv: $preview_cloned_service_ids_csv,
      preview_excluded_service_ids_csv: $preview_excluded_service_ids_csv,
      environment_warnings: $environment_warnings,
      requested_services_csv: $requested_services_csv,
      deploy_services_csv: $deploy_services_csv,
      env_override_service_ids_csv: $env_override_service_ids_csv,
      triggered_services_csv: $triggered_services_csv,
      meili_frontend_env_var: $meili_frontend_env_var,
      meili_keys_provisioned: ($meili_keys_provisioned == "true"),
      deployments: $deployments
    }'
}

zane::cmd_run_preview() {
  zane::require_common_commands
  zane::require_stack_inputs

  local project_slug="${ZANE_CANONICAL_PROJECT_SLUG:-}"
  local pr_number=""
  local services_csv=""
  local preview_db_name=""
  local preview_db_user=""
  local preview_db_password=""
  local meili_backend_key="${MEILI_BACKEND_KEY:-}"
  local meili_frontend_key=""
  local meili_frontend_env_var=""
  local preview_random_once_secrets_json=""
  local base_url="${ZANE_OPERATOR_BASE_URL:-}"
  local api_token="${ZANE_OPERATOR_API_TOKEN:-}"
  local dry_run="false"
  local dry_run_created="false"
  local dry_run_flags=()
  local resolve_environment_flags=()

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
      --dry-run-created)
        dry_run_created="true"
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
  if [[ "$dry_run_created" == "true" ]]; then
    resolve_environment_flags=(--dry-run-created)
  fi

  local plan_json_file
  local runtime_plan_json_file
  local stage_plan_json_file
  local env_overrides_json_file
  local environment_json_file
  local targets_json_file
  local apply_json_file
  local trigger_json_file
  local stage_deployments_json_file
  local verify_json_file
  local all_deployments_json_file
  local meili_provision_json_file
  zane::allocate_temp_file_vars \
    plan_json_file \
    runtime_plan_json_file \
    stage_plan_json_file \
    env_overrides_json_file \
    environment_json_file \
    targets_json_file \
    apply_json_file \
    trigger_json_file \
    stage_deployments_json_file \
    verify_json_file \
    all_deployments_json_file \
    meili_provision_json_file
  zane::install_temp_file_cleanup_trap \
    plan_json_file \
    runtime_plan_json_file \
    stage_plan_json_file \
    env_overrides_json_file \
    environment_json_file \
    targets_json_file \
    apply_json_file \
    trigger_json_file \
    stage_deployments_json_file \
    verify_json_file \
    all_deployments_json_file \
    meili_provision_json_file
  zane::write_empty_deployments_json_file "$all_deployments_json_file"
  zane::write_default_meili_provision_json_file "$meili_provision_json_file"

  zane::new_engine_ctl \
    plan \
    --lane preview \
    --services-csv "$services_csv" \
    --pr-number "$pr_number" \
    --output-json "$plan_json_file" >/dev/null
  zane::new_engine_ctl \
    resolve-environment \
    --lane preview \
    --project-slug "$project_slug" \
    --pr-number "$pr_number" \
    --environment-name "$(jq -r '.preview_environment_name' "$plan_json_file")" \
    --preview-cloned-service-ids-csv "$(jq -r '.preview_cloned_service_ids_csv' "$plan_json_file")" \
    --preview-excluded-service-ids-csv "$(jq -r '.preview_excluded_service_ids_csv' "$plan_json_file")" \
    "${resolve_environment_flags[@]}" \
    --output-json "$environment_json_file" \
    "${dry_run_flags[@]}" \
    --base-url "$base_url" \
    --api-token "$api_token" >/dev/null

  if [[ "$(jq -r '.created // false' "$environment_json_file")" == "true" ]]; then
    jq -c '
      .deploy_services = (.preview_cloned_services // [])
      | .deploy_services_csv = (.preview_cloned_service_ids_csv // "")
    ' "$plan_json_file" >"$runtime_plan_json_file"
    preview_random_once_secrets_json="$(zane::generate_preview_random_once_secrets_json)"
    ci::gha_mask "$preview_random_once_secrets_json"
  else
    cp "$plan_json_file" "$runtime_plan_json_file"
  fi

  local stage
  local stage_services_csv
  local env_override_service_ids_csv=""
  local triggered_services_csv=""
  local meili_keys_provisioned="false"
  local meili_service_id=""
  local meili_service_slug=""
  meili_service_id="$(stack_inputs_runtime_provider_source_service_id "$ZANE_SEARCH_CREDENTIALS_PROVIDER_ID")"
  [[ -n "$meili_service_id" ]] || ci::die "Missing source_service_id for provider ${ZANE_SEARCH_CREDENTIALS_PROVIDER_ID}."
  meili_service_slug="$(ci_zane_service_slug "$meili_service_id")"
  [[ -n "$meili_service_slug" ]] || ci::die "Missing service_slug for provider source service ${meili_service_id}."

  while IFS= read -r stage; do
    [[ -n "$stage" ]] || continue
    stage_services_csv="$(zane::stage_services_csv_from_plan "$runtime_plan_json_file" "$stage")"
    [[ -n "$stage_services_csv" ]] || continue

    zane::run_preview_stage_core \
      "$runtime_plan_json_file" \
      "$stage" \
      "$project_slug" \
      "$environment_json_file" \
      "$preview_db_name" \
      "$preview_db_user" \
      "$preview_db_password" \
      "$preview_random_once_secrets_json" \
      "$meili_backend_key" \
      "$meili_frontend_key" \
      "$meili_frontend_env_var" \
      "$stage_plan_json_file" \
      "$env_overrides_json_file" \
      "$targets_json_file" \
      "$apply_json_file" \
      "$trigger_json_file" \
      "$stage_deployments_json_file" \
      "$verify_json_file" \
      "$all_deployments_json_file" \
      "$base_url" \
      "$api_token" \
      dry_run_flags

    triggered_services_csv="$(zane::merge_csv_from_json_file \
      "$triggered_services_csv" \
      "$trigger_json_file" \
      '.triggered_service_ids // [] | join(",")')"
    env_override_service_ids_csv="$(zane::merge_csv_from_json_file \
      "$env_override_service_ids_csv" \
      "$env_overrides_json_file" \
      '[.services[].service_id] | join(",")')"

    if [[ "$(jq -r '.created // false' "$environment_json_file")" == "true" ]] && zane::stage_has_service "$runtime_plan_json_file" "$stage" "$meili_service_id"; then
      zane::provision_preview_meili_keys \
        "$project_slug" \
        "$(jq -r '.environment_name' "$environment_json_file")" \
        "$meili_service_slug" \
        "$base_url" \
        "$api_token" \
        "$dry_run" >"$meili_provision_json_file"
      meili_backend_key="$(jq -r '.backend_key' "$meili_provision_json_file")"
      meili_frontend_key="$(jq -r '.frontend_key' "$meili_provision_json_file")"
      meili_frontend_env_var="$(jq -r '.frontend_env_var' "$meili_provision_json_file")"
      meili_keys_provisioned="true"
    fi
  done < <(zane::plan_stage_numbers "$runtime_plan_json_file")

  zane::emit_preview_run_result \
    "$project_slug" \
    "$environment_json_file" \
    "$plan_json_file" \
    "$runtime_plan_json_file" \
    "$env_override_service_ids_csv" \
    "$triggered_services_csv" \
    "$preview_random_once_secrets_json" \
    "$meili_backend_key" \
    "$meili_frontend_key" \
    "$meili_frontend_env_var" \
    "$meili_keys_provisioned" \
    "$all_deployments_json_file"
}
