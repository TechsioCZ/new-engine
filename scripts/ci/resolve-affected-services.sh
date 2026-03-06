#!/usr/bin/env bash
set -euo pipefail

base_sha="${BASE_SHA:-${NX_BASE:-}}"
head_sha="${HEAD_SHA:-${NX_HEAD:-HEAD}}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      base_sha="${2:-}"
      shift 2
      ;;
    --head)
      head_sha="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$base_sha" ]]; then
  base_sha="origin/master"
fi

if ! git rev-parse --verify "$base_sha" >/dev/null 2>&1; then
  if [[ "$base_sha" == origin/* ]]; then
    fallback_ref="${base_sha#origin/}"
    if git rev-parse --verify "$fallback_ref" >/dev/null 2>&1; then
      base_sha="$fallback_ref"
    fi
  fi
fi

if ! git rev-parse --verify "$base_sha" >/dev/null 2>&1; then
  echo "Unable to resolve BASE_SHA: $base_sha" >&2
  exit 1
fi

if ! git rev-parse --verify "$head_sha" >/dev/null 2>&1; then
  echo "Unable to resolve HEAD_SHA: $head_sha" >&2
  exit 1
fi

projects_json="$(pnpm exec nx show projects --affected --json --base="$base_sha" --head="$head_sha")"
projects_csv="$(printf '%s' "$projects_json" | node -e 'let input=""; process.stdin.on("data", c => input += c); process.stdin.on("end", () => { const projects = input.trim() ? JSON.parse(input) : []; if (!Array.isArray(projects)) { throw new Error("Expected array from nx show projects --json"); } process.stdout.write(projects.join(",")); });')"

contains_project() {
  local project="$1"
  [[ ",${projects_csv}," == *",${project},"* ]]
}

declare -A selected=()

if contains_project "n1"; then
  selected["n1"]=1
fi
if contains_project "medusa-be"; then
  selected["medusa-be"]=1
fi
if contains_project "zane-operator"; then
  selected["zane-operator"]=1
fi

changed_files="$(git diff --name-only "$base_sha" "$head_sha" || true)"

while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  case "$path" in
    docker/development/n1/*)
      selected["n1"]=1
      ;;
    docker/development/medusa-be/*)
      selected["medusa-be"]=1
      ;;
    docker/development/medusa-minio/*)
      selected["medusa-minio"]=1
      ;;
    docker/development/medusa-meilisearch/*)
      selected["medusa-meilisearch"]=1
      ;;
    docker/development/medusa-valkey/*)
      selected["medusa-valkey"]=1
      ;;
    docker/development/postgres/*)
      selected["medusa-db"]=1
      ;;
    docker/development/zane-operator/*|apps/zane-operator/*)
      selected["zane-operator"]=1
      ;;
    docker-compose.zane.yaml|docker-compose.swarm.yaml)
      selected["n1"]=1
      selected["medusa-be"]=1
      selected["medusa-minio"]=1
      selected["medusa-meilisearch"]=1
      selected["medusa-valkey"]=1
      ;;
  esac
done <<< "$changed_files"

services_sorted=()
if ((${#selected[@]} > 0)); then
  mapfile -t services_sorted < <(printf '%s\n' "${!selected[@]}" | sort -u)
fi

services_csv=""
if ((${#services_sorted[@]} > 0)); then
  IFS=,
  services_csv="${services_sorted[*]}"
  unset IFS
fi

has_service() {
  local service="$1"
  if [[ ",${services_csv}," == *",${service},"* ]]; then
    echo "true"
  else
    echo "false"
  fi
}

changed_files_count="0"
if [[ -n "$changed_files" ]]; then
  changed_files_count="$(printf '%s\n' "$changed_files" | sed '/^$/d' | wc -l | tr -d ' ')"
fi

echo "base_sha=$base_sha"
echo "head_sha=$head_sha"
echo "projects_csv=$projects_csv"
echo "services_csv=$services_csv"

echo "has_n1=$(has_service n1)"
echo "has_medusa_be=$(has_service medusa-be)"
echo "has_medusa_minio=$(has_service medusa-minio)"
echo "has_medusa_meilisearch=$(has_service medusa-meilisearch)"
echo "has_medusa_valkey=$(has_service medusa-valkey)"
echo "has_medusa_db=$(has_service medusa-db)"
echo "has_zane_operator=$(has_service zane-operator)"

echo "changed_files_count=$changed_files_count"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "base_sha=$base_sha"
    echo "head_sha=$head_sha"
    echo "projects_csv=$projects_csv"
    echo "services_csv=$services_csv"
    echo "has_n1=$(has_service n1)"
    echo "has_medusa_be=$(has_service medusa-be)"
    echo "has_medusa_minio=$(has_service medusa-minio)"
    echo "has_medusa_meilisearch=$(has_service medusa-meilisearch)"
    echo "has_medusa_valkey=$(has_service medusa-valkey)"
    echo "has_medusa_db=$(has_service medusa-db)"
    echo "has_zane_operator=$(has_service zane-operator)"
    echo "changed_files_count=$changed_files_count"
  } >> "$GITHUB_OUTPUT"
fi
