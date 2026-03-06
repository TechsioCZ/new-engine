# Zane CI Assumptions and Setup

This document defines the current assumptions for running `new-engine` deployments through Zane + GitHub Actions.

## Scope

Applies to these workflows:

- `.github/workflows/deploy-zaneops-after-ci.yml`
- `.github/workflows/teardown-zaneops-preview.yml`

The existing `CI` workflow remains unchanged and is the gate.

## What Must Exist in Zane (Manual One-Time Setup)

1. Create a Zane project for this repository.
2. Create the main environment (production/main runtime).
3. Create Git services in that environment:
- `medusa-be`
- `n1`
4. Ensure each Git service has a valid deploy token/webhook URL.
5. Ensure repository/Git app integration is installed and healthy.

## Preview Template Requirements

Create a preview template based on the main environment with these rules:

1. Include application services needed for preview runtime:
- `medusa-be`
- `n1`
2. Include optional preview infra only if you want isolated per-preview infra:
- `medusa-minio`
- `medusa-meilisearch`
- `medusa-valkey`
3. Exclude singleton services from preview cloning:
- `medusa-db`
- `zane-operator`
4. Enable auto teardown for preview resources.

## GitHub Secrets Required

Required:

- `ZANEOPS_ZANE_OPERATOR_BASE_URL`
- `ZANEOPS_ZANE_OPERATOR_API_TOKEN`
- `ZANEOPS_PROJECT_PREVIEW_WEBHOOK_URL`
- `ZANEOPS_PROJECT_DEPLOY_WEBHOOK_URL`
- `ZANEOPS_MASTER_DEPLOY_WEBHOOK_MEDUSA_BE`
- `ZANEOPS_MASTER_DEPLOY_WEBHOOK_N1`
- `ZANEOPS_MASTER_DEPLOY_WEBHOOK_MEDUSA_MINIO`
- `ZANEOPS_MASTER_DEPLOY_WEBHOOK_MEDUSA_MEILISEARCH`
- `ZANEOPS_MASTER_DEPLOY_WEBHOOK_MEDUSA_VALKEY`
- `ZANEOPS_MASTER_DEPLOY_WEBHOOK_MEDUSA_DB`

Optional (smoke checks):

- `ZANEOPS_PREVIEW_HEALTHCHECK_URL`
- `ZANEOPS_MASTER_HEALTHCHECK_URL_MEDUSA_BE`
- `ZANEOPS_MASTER_HEALTHCHECK_URL_N1`

## Runtime Env Assumptions

The preview trigger currently sets DB and runtime overrides for Medusa using env keys:

- `MEDUSA_APP_DB_USER`
- `MEDUSA_APP_DB_PASSWORD`
- `MEDUSA_APP_DB_NAME`
- `MEDUSA_DB_USER`
- `MEDUSA_DB_PASSWORD`
- `MEDUSA_DB_NAME`
- `NODE_ENV=development`

Your Medusa service config in Zane must resolve DB connection from these values.

Optional service settings override payload (JSON):

- `ZANEOPS_PROJECT_SERVICES_SETTINGS_OVERRIDES_JSON`
- passed to Zane as `services_settings_overrides` (separate from env overrides)
- use this for service-level settings such as URL/domain overrides

## Current CI Behavior

### PR lane (after CI success)

1. Resolve affected services using Nx + file heuristics.
2. If preview deployables are affected (`medusa-be`, `n1`, `medusa-minio`, `medusa-meilisearch`, `medusa-valkey`), call `zane-operator` ensure.
3. If ensure returns `created=false`, CI calls project deploy webhook (`/api/deploy-project-preview/{project_deploy_token}`) with:
   - `pr_number`
   - `repository_url`
   - affected `services`
   - `commit_sha`
   - `services_env_overrides`
   - `services_settings_overrides`
4. If project deploy returns `404`, CI falls back to project preview trigger (`/api/trigger-preview/{project_preview_token}`) to create the preview.
5. If ensure returns `created=true`, CI creates initial preview environment directly via project preview trigger.

Reason for this order: `trigger-preview` is create-oriented; repeated calls can create duplicate preview environments for one PR.

### Master lane (after CI success)

1. Resolve affected services.
2. Trigger `medusa-be`/`n1` deploy webhooks only if affected.
3. Trigger `medusa-minio`/`medusa-meilisearch`/`medusa-valkey`/`medusa-db` deploy webhooks only if affected.

### PR close lane

1. Call `zane-operator` delete for preview DB.
2. Fail workflow if teardown fails.

## Watch Paths vs Nx Affected

Your intuition is correct:

- Zane watch paths are path-glob based.
- Nx affected is graph-aware and captures transitive dependency changes (for example `libs/*` impacting `n1`).

For this repo, Nx affected is the more precise deployment signal.

Recommended split:

1. Keep CI (Nx affected) as the primary deploy decision engine.
2. Use Zane watch paths only as a fallback/secondary guard, not the source of truth.

## Determinism Note (Important)

For CI-driven preview updates on every push, CI must target existing preview env(s) deterministically.

Current implementation uses CI-side lookup and existing Zane APIs only:

1. CI always sends `repository_url` + `pr_number` when calling project deploy webhook.
2. CI treats HTTP `404` as "preview not created yet" and then uses project preview trigger webhook.
3. CI treats non-2xx/non-404 project deploy responses as hard failures.
4. Team policy should keep one active preview environment per `(repository_url, pr_number)` pair.

## Verification Checklist

1. Open a PR with changes affecting `medusa-be` or `n1`.
2. Confirm post-CI workflow runs and DB ensure succeeds.
3. Confirm preview is created once.
4. Push another commit to same PR and confirm no duplicate preview is created.
5. Close PR and confirm DB teardown workflow succeeds.
6. Merge to `master` and confirm only affected main services redeploy.
