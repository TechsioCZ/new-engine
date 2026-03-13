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
  local preview_service_sets_json='{}'

  requested_services_csv="$(zane::csv_from_lookup_in_manifest_order "$lane" requested_lookup)"
  deploy_services_csv="$(zane::csv_from_lookup_in_manifest_order "$lane" deploy_lookup)"
  requested_services_json="$(zane::services_json_from_csv "$requested_services_csv")"
  deploy_services_json="$(zane::services_json_from_csv "$deploy_services_csv")"

  if [[ "$lane" == "preview" ]]; then
    environment_name="$(zane::preview_environment_name "$pr_number")"
    preview_service_sets_json="$(zane::preview_service_sets_json)"
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
      --argjson preview_service_sets "$preview_service_sets_json" \
      '{
        lane: $lane,
        source_services_csv: $services_csv,
        requested_services_csv: $requested_services_csv,
        deploy_services_csv: $deploy_services_csv,
        preview_environment_name: $environment_name,
        preview_cloned_service_ids_csv: ($preview_service_sets.preview_cloned_service_ids_csv // ""),
        preview_excluded_service_ids_csv: ($preview_service_sets.preview_excluded_service_ids_csv // ""),
        pr_number: (if $pr_number == "" then null else ($pr_number | tonumber) end),
        requested_services: $requested_services,
        deploy_services: $deploy_services,
        preview_cloned_services: ($preview_service_sets.preview_cloned_services // []),
        preview_excluded_services: ($preview_service_sets.preview_excluded_services // [])
      }'
  )"

  if [[ -n "$output_json" ]]; then
    zane::write_json_file "$output_json" "$plan_json"
  fi

  ci::gha_output requested_services_csv "$requested_services_csv"
  ci::gha_output deploy_services_csv "$deploy_services_csv"
  ci::gha_output preview_environment_name "$environment_name"
  ci::gha_output preview_cloned_service_ids_csv "$(jq -r '.preview_cloned_service_ids_csv // empty' <<<"$preview_service_sets_json")"
  ci::gha_output preview_excluded_service_ids_csv "$(jq -r '.preview_excluded_service_ids_csv // empty' <<<"$preview_service_sets_json")"
  printf '%s\n' "$plan_json"
}

zane::cmd_resolve_environment() {
  zane::require_common_commands

  local lane=""
  local project_slug="${ZANE_CANONICAL_PROJECT_SLUG:-}"
  local pr_number=""
  local environment_name="${ZANE_PRODUCTION_ENVIRONMENT_NAME:-}"
  local preview_cloned_service_ids_csv=""
  local preview_excluded_service_ids_csv=""
  local preview_service_slug_sets_json='{}'
  local output_json=""
  local base_url="${ZANE_OPERATOR_BASE_URL:-}"
  local api_token="${ZANE_OPERATOR_API_TOKEN:-}"
  local dry_run="false"
  local dry_run_created="false"

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
      --preview-cloned-service-ids-csv)
        preview_cloned_service_ids_csv="${2-}"
        shift 2
        ;;
      --preview-excluded-service-ids-csv)
        preview_excluded_service_ids_csv="${2-}"
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
      --dry-run-created)
        dry_run_created="true"
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
  --preview-cloned-service-ids-csv <csv>
  --preview-excluded-service-ids-csv <csv>
  --base-url <url>
  --api-token <token>
  --output-json <path>
  --dry-run
  --dry-run-created
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
    preview_cloned_service_ids_csv="$(zane::normalize_csv_or_empty "$preview_cloned_service_ids_csv")"
    preview_excluded_service_ids_csv="$(zane::normalize_csv_or_empty "$preview_excluded_service_ids_csv")"
    preview_service_slug_sets_json="$(
      zane::preview_service_slug_sets_json \
        "$preview_cloned_service_ids_csv" \
        "$preview_excluded_service_ids_csv"
    )"
  else
    [[ -n "$environment_name" ]] || ci::die "Main lane requires --environment-name or ZANE_PRODUCTION_ENVIRONMENT_NAME."
  fi

  local response_json
  if [[ "$dry_run" == "true" ]]; then
    response_json="$(jq -cn \
      --arg lane "$lane" \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --arg dry_run_created "$dry_run_created" \
      --argjson preview_service_slug_sets "$preview_service_slug_sets_json" \
      '{lane:$lane, project_slug:$project_slug, environment_name:$environment_name, environment_id:("dry-run:" + $environment_name), created:($dry_run_created == "true"), ready:true, expected_preview_service_slugs:($preview_service_slug_sets.expected_preview_service_slugs // []), excluded_preview_service_slugs:($preview_service_slug_sets.excluded_preview_service_slugs // []), present_service_slugs:($preview_service_slug_sets.expected_preview_service_slugs // []), missing_preview_service_slugs:[], warnings:[]}')"
  else
    local payload
    payload="$(jq -cn \
      --arg lane "$lane" \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --arg pr_number "$pr_number" \
      --argjson preview_service_slug_sets "$preview_service_slug_sets_json" \
      '{
        lane: $lane,
        project_slug: $project_slug,
        environment_name: $environment_name,
        pr_number: (if $pr_number == "" then null else ($pr_number | tonumber) end),
        expected_preview_service_slugs: ($preview_service_slug_sets.expected_preview_service_slugs // []),
        excluded_preview_service_slugs: ($preview_service_slug_sets.excluded_preview_service_slugs // [])
      }')"
    response_json="$(zane::api_request POST "/v1/zane/environments/resolve" "$payload" "$base_url" "$api_token")"
  fi

  [[ -n "$(jq -r '.environment_name // empty' <<<"$response_json")" ]] || ci::die "Environment response missing environment_name."
  [[ -n "$(jq -r '.project_slug // empty' <<<"$response_json")" ]] || ci::die "Environment response missing project_slug."

  if [[ "$(jq -r '.warnings | length // 0' <<<"$response_json")" != "0" ]]; then
    while IFS= read -r warning_message; do
      [[ -n "$warning_message" ]] || continue
      ci::warn "$warning_message"
    done < <(jq -r '.warnings[]?.message // empty' <<<"$response_json")
  fi

  if [[ "$lane" == "preview" && "$(jq -r '.ready // false' <<<"$response_json")" != "true" ]]; then
    ci::die "Preview environment ${environment_name} is missing required cloned services: $(jq -r '(.missing_preview_service_slugs // []) | join(",")' <<<"$response_json")"
  fi

  if [[ -n "$output_json" ]]; then
    zane::write_json_file "$output_json" "$response_json"
  fi

  ci::gha_output environment_name "$(jq -r '.environment_name' <<<"$response_json")"
  ci::gha_output environment_id "$(jq -r '.environment_id // empty' <<<"$response_json")"
  ci::gha_output environment_created "$(jq -r '.created // false' <<<"$response_json")"
  ci::gha_output environment_ready "$(jq -r '.ready // true' <<<"$response_json")"
  ci::gha_output missing_preview_service_slugs_csv "$(jq -r '(.missing_preview_service_slugs // []) | join(",")' <<<"$response_json")"
  ci::gha_output environment_warning_count "$(jq -r '.warnings | length // 0' <<<"$response_json")"
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
          service_slug: .service_slug
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

  ci::gha_output resolved_service_ids_csv "$(jq -r '[.services[].service_id] | join(",")' <<<"$response_json")"
  ci::gha_output target_service_ids_csv "$(jq -r '[.services[].service_id] | join(",")' <<<"$response_json")"
  jq -c '
    walk(
      if type == "object" then
        with_entries(
          if (.key | ascii_downcase | test("password|token|secret|key|url|env")) and (.value | type != "boolean" and type != "number" and type != "null")
          then .value = "***redacted***"
          else .
          end
        )
      else .
      end
    )
  ' <<<"$response_json"
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
  local git_commit_sha=""
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
      --git-commit-sha)
        git_commit_sha="${2-}"
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
      --arg git_commit_sha "$git_commit_sha" \
      --argjson services "$(jq -c '.services // []' "$targets_json")" \
      '{
        project_slug: $project_slug,
        environment_name: $environment_name,
        git_commit_sha: (if $git_commit_sha == "" then null else $git_commit_sha end),
        triggered_service_ids: ($services | map(.service_id)),
        services: ($services | map({service_id, service_slug, service_type, deployment_hash: ("dry-run:deploy:" + .service_slug), status: "HEALTHY"}))
      }')"
  else
    local payload
    payload="$(jq -cn \
      --arg project_slug "$project_slug" \
      --arg environment_name "$environment_name" \
      --arg git_commit_sha "$git_commit_sha" \
      --argjson targets "$(jq -c '.services // []' "$targets_json")" \
      '{
        project_slug:$project_slug,
        environment_name:$environment_name,
        targets:$targets,
        git_commit_sha:(if $git_commit_sha == "" then null else $git_commit_sha end)
      }')"
    response_json="$(zane::api_request POST "/v1/zane/deploy/trigger" "$payload" "$base_url" "$api_token")"
  fi

  if [[ -n "$output_json" ]]; then
    zane::write_json_file "$output_json" "$response_json"
  fi

  ci::gha_output triggered_services_csv "$(jq -r '.triggered_service_ids | join(",")' <<<"$response_json")"
  printf '%s\n' "$response_json"
}
