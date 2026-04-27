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

# Remove all apps except medusa-be, and remove all libs
find apps -maxdepth 1 -mindepth 1 -type d ! -name 'medusa-be' -exec rm -rf {} + || true
rm -rf libs || true

# Clean existing node_modules and .medusa to ensure fresh build
rm -rf node_modules apps/medusa-be/node_modules apps/medusa-be/.medusa || true

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

log_info "Running: pnpm nx run medusa-be:build --skip-nx-cache"

# Run build and capture output
if pnpm nx run medusa-be:build --skip-nx-cache 2>&1 | tee "$BUILD_LOG"; then
  log_info "Build command completed"
else
  log_warn "Build command exited with code $?"
fi

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
