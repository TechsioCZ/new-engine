# Nx and Zane Build Cache Notes

Date: 2026-05-09

## Current State

Zane builds `medusa-be` as a Git-backed Dockerfile service from a commit SHA. The deploy flow passes the target commit to Zane, not local build artifacts from the developer machine.

The production Docker build runs `docker/development/medusa-be/Dockerfile`, which calls `scripts/build-medusa.sh`. That script currently bypasses useful Nx caching behavior:

- it sets `NX_SKIP_NX_CACHE=true`
- it runs `pnpm --filter=medusa-be build` and `pnpm --filter=medusa-be exec medusa build --admin-only`
- it does not call an explicit cacheable Nx target for the Medusa production build

Local Docker context also excludes local build outputs and caches:

- `.nx`
- `**/.medusa`
- `**/dist`
- `**/.next`

This means a local `.nx/cache` hit on a developer machine cannot be reused by Zane in the current architecture.

## What Could Work

Nx remote cache could help if the Medusa production build becomes an explicit cacheable Nx target and the Zane build can access the same remote cache.

Requirements:

- define explicit `medusa-be` build target outputs, such as `.medusa/server` and `.medusa/admin`
- include build-relevant environment inputs in the Nx hash, including feature flags used by `medusa-config`
- remove `NX_SKIP_NX_CACHE=true` for the cacheable build step
- call the Nx target from the Docker build script instead of bypassing Nx
- configure a remote cache backend available to both local builds and Zane builds

The production `node_modules` deployment should remain inside the Linux Docker build. Caching or copying local `node_modules` from macOS into Zane would be unsafe because native packages and platform-specific binaries may differ.

## Practical Recommendation

Use remote Nx cache only for deterministic build artifacts, not for the final Docker image or production dependency deployment.

For full image reuse, Docker/buildx registry cache or a CI-built image pushed to a registry would be a better fit than trying to move local Nx cache into Zane.

