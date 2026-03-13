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
