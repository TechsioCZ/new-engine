#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
ENV_TEMPLATE="${ROOT_DIR}/.env.docker"

usage() {
  cat <<'EOF'
Usage:
  scripts/dev/init-local-stack.sh

Initializes a fresh local checkout by:
1. ensuring the package-manager version pinned by package.json is available
2. creating .env from .env.docker when missing
3. validating required superadmin credentials in .env
4. preparing local Postgres bind-mount folders for the postgres runtime user
5. installing repo dependencies
6. starting resources
7. running migrations, starting the backend, creating the Medusa user, and seeding initial data
EOF
}

trim() {
  local value="$1"

  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    value="${value:1:-1}"
  elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
    value="${value:1:-1}"
  fi

  printf '%s' "$value"
}

get_env_value() {
  local var_name="$1"
  local line value

  if [[ ! -f "$ENV_FILE" ]]; then
    printf '%s' ""
    return 0
  fi

  line="$(grep -E "^${var_name}=" "$ENV_FILE" | tail -n1 || true)"
  if [[ -z "$line" ]]; then
    printf '%s' ""
    return 0
  fi

  value="${line#*=}"
  trim "$value"
}

copy_env_if_missing() {
  if [[ -f "$ENV_FILE" ]]; then
    return 0
  fi

  if [[ ! -f "$ENV_TEMPLATE" ]]; then
    echo "Missing ${ENV_TEMPLATE}. Cannot initialize local env." >&2
    exit 1
  fi

  cp "$ENV_TEMPLATE" "$ENV_FILE"
  echo "Created ${ENV_FILE} from ${ENV_TEMPLATE}."
}

validate_superadmin_credentials() {
  local email password

  email="$(get_env_value DC_SUPERADMIN_EMAIL)"
  password="$(get_env_value DC_SUPERADMIN_PASSWORD)"

  if [[ -z "$email" || "$email" != *"@"* ]]; then
    cat >&2 <<'EOF'
DC_SUPERADMIN_EMAIL is missing or invalid in .env.
Fill DC_SUPERADMIN_EMAIL with the Medusa admin email, save .env, and rerun `mise run dev:init`.
EOF
    exit 1
  fi

  if [[ -z "$password" ]]; then
    cat >&2 <<'EOF'
DC_SUPERADMIN_PASSWORD is missing in .env.
Fill DC_SUPERADMIN_PASSWORD with the Medusa admin password, save .env, and rerun `mise run dev:init`.
EOF
    exit 1
  fi
}

resolve_postgres_volume_root() {
  local configured_path

  configured_path="$(get_env_value DC_POSTGRES_VOLUME_DATA)"
  if [[ -z "$configured_path" ]]; then
    configured_path="./.docker_data/db18"
  fi

  if [[ "$configured_path" == /* ]]; then
    printf '%s\n' "$configured_path"
    return 0
  fi

  printf '%s\n' "${ROOT_DIR}/${configured_path#./}"
}

prepare_postgres_bind_mount() {
  local volume_root pgdata_parent

  volume_root="$(resolve_postgres_volume_root)"
  pgdata_parent="${volume_root}/18"

  mkdir -p "$volume_root"
  chmod 0777 "$volume_root"

  if [[ ! -d "$pgdata_parent" ]]; then
    mkdir -p "$pgdata_parent"
    chmod 0777 "$pgdata_parent"
  elif [[ -O "$pgdata_parent" ]]; then
    chmod 0777 "$pgdata_parent"
  fi

  echo "Prepared Postgres bind-mount path: ${pgdata_parent} (Postgres creates the final docker leaf)"
}

resolve_pnpm_spec() {
  node -e '
const fs = require("node:fs")
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))
const packageManager = pkg.packageManager

if (typeof packageManager !== "string" || !packageManager.startsWith("pnpm@")) {
  console.error("package.json must define packageManager as pnpm@<version>.")
  process.exit(1)
}

process.stdout.write(packageManager)
'
}

ensure_pnpm() {
  local current_version pnpm_spec pnpm_version

  if ! command -v node >/dev/null 2>&1; then
    echo "Node is required before pnpm can be bootstrapped. Run this through mise: \`mise run dev:init\`." >&2
    exit 1
  fi

  pnpm_spec="$(resolve_pnpm_spec)"
  pnpm_version="${pnpm_spec#pnpm@}"

  if command -v pnpm >/dev/null 2>&1; then
    current_version="$(pnpm --version)"
    if [[ "$current_version" == "$pnpm_version" ]]; then
      return 0
    fi

    echo "Found pnpm ${current_version}; installing pinned ${pnpm_spec} for the active Node toolchain."
  else
    echo "pnpm is missing; installing pinned ${pnpm_spec} for the active Node toolchain."
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required to install ${pnpm_spec}, but npm was not found on PATH." >&2
    exit 1
  fi

  npm install --global "$pnpm_spec"
  hash -r

  current_version="$(pnpm --version)"
  if [[ "$current_version" != "$pnpm_version" ]]; then
    echo "Expected pnpm ${pnpm_version}, but PATH resolves pnpm ${current_version} after installation." >&2
    exit 1
  fi
}

main() {
  local superadmin_email superadmin_password

  if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    usage
    exit 0
  fi

  copy_env_if_missing
  validate_superadmin_credentials
  prepare_postgres_bind_mount

  superadmin_email="$(get_env_value DC_SUPERADMIN_EMAIL)"
  superadmin_password="$(get_env_value DC_SUPERADMIN_PASSWORD)"

  cd "$ROOT_DIR"

  ensure_pnpm
  mise run dev:install
  mise run dev:resources
  mise run dev:backend
  EMAIL="$superadmin_email" PASSWORD="$superadmin_password" mise run dev:medusa:user:create
  mise run dev:medusa:seed

  cat <<'EOF'
Local initialization completed.
Next step: run `mise run dev` to bring the full local stack to steady state.
EOF
}

main "$@"
