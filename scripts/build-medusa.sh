#!/bin/bash
#
# Medusa Build Script
# Used by both Docker and Zerops to ensure consistent build behavior.
#
# Features:
# - Cleans up unused apps/libs for smaller build
# - Installs dependencies
# - Sets placeholder secrets for build-time validation (real secrets are runtime-only)
# - Detects silent build failures by validating expected output
# - Creates production-only node_modules deployment
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_LOG="/tmp/medusa-build.log"
EXPECTED_OUTPUT="apps/medusa-be/.medusa/server/medusa-config.js"

# Colors for output (disabled if not a terminal)
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  CYAN='\033[0;36m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  CYAN=''
  NC=''
fi

log_info() {
  echo -e "${GREEN}[BUILD]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_time() {
  echo -e "${CYAN}[TIME]${NC} $1"
}

run_with_low_priority() {
  if command -v nice >/dev/null 2>&1; then
    nice -n "${MEDUSA_BUILD_NICE_LEVEL:-19}" "$@"
    return
  fi

  "$@"
}

# Timing helper
step_start() {
  STEP_START_TIME=$SECONDS
}

step_end() {
  local elapsed=$((SECONDS - STEP_START_TIME))
  log_time "$1 completed in ${elapsed}s"
}

TOTAL_START_TIME=$SECONDS

cd "$PROJECT_ROOT"

log_info "Starting Medusa build pipeline..."
log_info "Working directory: $PROJECT_ROOT"

# ============================================
# Step 1: Clean up unused apps/libs
# ============================================
step_start
log_info "Step 1/5: Cleaning up unused apps and libs..."

# Remove all apps except medusa-be and its workspace plugin dependencies, and remove all libs
find apps -maxdepth 1 -mindepth 1 -type d \
  ! -name 'medusa-be' \
  ! -name 'medusa-symmy-plugin' \
  ! -name 'medusa-order-dashboard-plugin' \
  -exec rm -rf {} + || true
rm -rf libs || true

# Clean existing node_modules and .medusa to ensure fresh build
rm -rf \
  node_modules \
  apps/medusa-be/node_modules \
  apps/medusa-be/.medusa \
  apps/medusa-symmy-plugin/node_modules \
  apps/medusa-symmy-plugin/.medusa \
  apps/medusa-order-dashboard-plugin/node_modules \
  apps/medusa-order-dashboard-plugin/.medusa || true

step_end "Cleanup"

# ============================================
# Step 2: Install dependencies
# ============================================
step_start
log_info "Step 2/5: Installing dependencies..."
pnpm install --filter=medusa-be...
step_end "Install"

# ============================================
# Step 3: Build Medusa
# ============================================
step_start
log_info "Step 3/5: Building Medusa..."

# Use placeholder secrets for build-time validation only.
# Medusa validates these exist but doesn't use them cryptographically during build.
# Real secrets MUST be provided at runtime via environment variables.
export JWT_SECRET="${JWT_SECRET:-build-placeholder}"
export COOKIE_SECRET="${COOKIE_SECRET:-build-placeholder}"
export NODE_ENV="${NODE_ENV:-production}"
export MEDUSA_TELEMETRY_DISABLED="${MEDUSA_TELEMETRY_DISABLED:-1}"
export NX_DAEMON=false
export NX_SKIP_NX_CACHE=true
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=${MEDUSA_BUILD_MAX_OLD_SPACE_SIZE:-768}}"
export CI="${CI:-true}"
export ESBUILD_WORKER_THREADS="${ESBUILD_WORKER_THREADS:-0}"

# FEATURE_PPL_ENABLED must come from the environment (no default - explicit opt-in)
if [[ -n "${FEATURE_PPL_ENABLED:-}" ]]; then
  log_info "FEATURE_PPL_ENABLED=${FEATURE_PPL_ENABLED}"
  export FEATURE_PPL_ENABLED
else
  log_warn "FEATURE_PPL_ENABLED not set - PPL module will NOT be included in build"
fi

# FEATURE_PAYLOAD_ENABLED is evaluated at build time in medusa-config.ts
if [[ -n "${FEATURE_PAYLOAD_ENABLED:-}" ]]; then
  log_info "FEATURE_PAYLOAD_ENABLED=${FEATURE_PAYLOAD_ENABLED}"
else
  log_warn "FEATURE_PAYLOAD_ENABLED not set - defaulting to 0 for build"
  FEATURE_PAYLOAD_ENABLED=0
fi
export FEATURE_PAYLOAD_ENABLED

# FEATURE_PACKETA_ENABLED must come from the environment (no default - explicit opt-in)
if [[ -n "${FEATURE_PACKETA_ENABLED:-}" ]]; then
  log_info "FEATURE_PACKETA_ENABLED=${FEATURE_PACKETA_ENABLED}"
  export FEATURE_PACKETA_ENABLED
else
  log_warn "FEATURE_PACKETA_ENABLED not set - Packeta module will NOT be included in build"
fi

log_info "Running: MEDUSA_ADMIN_DISABLED_FOR_BACKEND_BUILD=1 pnpm --filter=medusa-be build"

# Medusa builds backend and admin concurrently by default. On small Zane workers
# that can starve Temporal heartbeats, so build them sequentially and keep the
# final bundled admin path identical to a normal `medusa build`.
if MEDUSA_ADMIN_DISABLED_FOR_BACKEND_BUILD=1 run_with_low_priority pnpm --filter=medusa-be build 2>&1 | tee "$BUILD_LOG"; then
  log_info "Backend build command completed"
else
  log_warn "Backend build command exited with code $?"
fi

log_info "Running: pnpm --filter=medusa-be exec medusa build --admin-only"
if run_with_low_priority pnpm --filter=medusa-be exec medusa build --admin-only 2>&1 | tee -a "$BUILD_LOG"; then
  log_info "Admin build command completed"
else
  log_warn "Admin build command exited with code $?"
fi

rm -rf apps/medusa-be/.medusa/server/public/admin
mkdir -p apps/medusa-be/.medusa/server/public
cp -R apps/medusa-be/.medusa/admin apps/medusa-be/.medusa/server/public/admin

step_end "Build"

# ============================================
# Step 4: Validate build output
# ============================================
step_start
log_info "Step 4/5: Validating build output..."

if [[ ! -f "$PROJECT_ROOT/$EXPECTED_OUTPUT" ]]; then
  echo ""
  log_error "=========================================="
  log_error "BUILD FAILED - Output validation failed"
  log_error "=========================================="
  log_error "Expected output not found: $EXPECTED_OUTPUT"
  echo ""
  log_error "This usually means:"
  log_error "  1. Missing required environment variables (JWT_SECRET, COOKIE_SECRET)"
  log_error "  2. TypeScript compilation errors"
  log_error "  3. Invalid medusa-config.ts"
  log_error "  4. FEATURE_PPL_ENABLED not set when PPL module is expected"
  echo ""
  log_error "=== Last 50 lines of build output ==="
  tail -50 "$BUILD_LOG" || true
  echo ""
  exit 1
fi

log_info "Build output validated: $EXPECTED_OUTPUT exists"
step_end "Validation"

# ============================================
# Step 5: Create production deployment
# ============================================
step_start
log_info "Step 5/5: Creating production node_modules deployment..."

pnpm --filter=medusa-be --prod deploy medusa-be-prod
rm -rf node_modules apps/medusa-be/node_modules
if [[ "${PNPM_CLEAN_STORE_AFTER_DEPLOY:-false}" == "true" && -n "${npm_config_store_dir:-}" ]]; then
  store_dir="$(node -e 'console.log(require("node:path").resolve(process.argv[1]))' "$npm_config_store_dir")"
  case "$store_dir" in
    "$PROJECT_ROOT"/.pnpm-store|"$PROJECT_ROOT"/.pnpm-store/*|/tmp/pnpm-store|/tmp/pnpm-store/*)
      rm -rf "$store_dir"
      ;;
    *)
      log_warn "Skipping pnpm store cleanup for unexpected path: $store_dir"
      ;;
  esac
fi

step_end "Prod deploy"

# ============================================
# Done
# ============================================
TOTAL_ELAPSED=$((SECONDS - TOTAL_START_TIME))
echo ""
log_info "========================================"
log_info "Medusa build completed successfully!"
log_time "Total build time: ${TOTAL_ELAPSED}s"
log_info "========================================"
