# New Engine CTL Architecture

Last updated: 2026-03-17
Scope: repo-owned typed orchestration CLI for CI and local deploy-related flows.

## Authority

- `plans/architecture.md` remains the top-level architecture contract.
- This file is the scoped committed contract for `apps/new-engine-ctl`.
- `apps/zane-operator/CI_DEPLOY_ARCHITECTURE.md` remains the committed deploy contract that current behavior must satisfy.
- Any change to the boundary or command-surface contract in this file requires explicit user approval before implementation continues.

## Goal

Keep orchestration in a repo-owned typed CLI while keeping:
- workflow YAML thin
- shared config as the source of truth
- `zane-operator` as the authenticated execution backend for Zane/runtime operations

## Runtime And Stack

Initial implementation must use:
- `Node.js >=24`
- `TypeScript`
- `commander`
- `zod`
- `yaml`
- native `fetch`
- `tsx` for local source execution
- ESM modules for the CLI and built runtime artifact

Implementation notes:
- the checked-in build script may add a narrow `createRequire(import.meta.url)` bridge when bundling so the single-file ESM artifact can safely interoperate with CommonJS-only dependency paths
- the module format remains ESM; do not switch the CLI artifact to CommonJS unless the user explicitly approves that contract change

Initial implementation must not use:
- `Bun` as the primary CI runtime for this CLI
- `EffectTS`
- a compatibility wrapper strategy that keeps superseded shell orchestration alive once equivalent CLI behavior is verified

## Ownership Boundaries

`apps/new-engine-ctl` owns:
- orchestration flow
- command routing
- config loading and validation
- phase sequencing
- provider invocation decisions
- deploy input shaping
- local/CI parity for orchestration behavior
- CI affected-service resolution from `nx affected` plus manifest path-glob/runtime rules
- approval decisions derived from the final affected main-lane service set

`apps/zane-operator` owns:
- authenticated Zane access
- environment operations
- deploy target resolution
- env mutation
- deploy trigger
- deploy verification
- runtime provisioning that requires authenticated Zane inspection or live service access

Required boundary:
- `apps/new-engine-ctl` remains the only consumer of repo-wide orchestration config
- `apps/new-engine-ctl` passes explicit typed requests to `zane-operator`
- `zane-operator` must not keep a standing dependency on repo-wide orchestration config
- if `zane-operator` still needs an internal typed provider contract, that must be justified by a concrete operational need rather than convenience
- shell files may exist only as narrow transport, validation, or local convenience helpers; they must not own deploy policy, config interpretation, or multi-phase orchestration logic

Workflow YAML owns:
- coarse job/stage orchestration only
- secrets/env wiring into the CLI
- concurrency and dependency boundaries

## Source Of Truth

The CLI must consume:
- `apps/new-engine-ctl/config/stack-manifest.yaml`
- `apps/new-engine-ctl/config/stack-inputs.yaml`

The CLI must not re-encode deploy policy in code when that policy already belongs in shared config.

Boundary state:
- those files now live under `apps/new-engine-ctl/config/`
- `apps/new-engine-ctl` owns their loading and validation as part of the active orchestration boundary

## Command Surface

Initial command surface should be explicit and phase-oriented:
- `check-workflow-inputs`
- `plan`
- `prepare`
- `deploy-preview`
- `deploy-main`
- `verify`
- `teardown-preview`
- optional later command: `providers run`

Do not collapse the whole system into one giant command.
Do not spread orchestration across many tiny workflow-specific commands.

Phase intent:
- `scope`/`plan` determine the affected service set and manifest-ordered deploy plan.
- preview scope may read preview-environment metadata to resolve the baseline commit; the active keys are `ZANE_OPERATOR_PREVIEW_TARGET_COMMIT_SHA`, `ZANE_OPERATOR_PREVIEW_LAST_DEPLOYED_COMMIT_SHA`, and `ZANE_OPERATOR_PREVIEW_BASELINE_COMPLETE`
- `prepare` is for shared-resource prerequisites and input validation only.
- runtime-provider execution belongs in deploy orchestration after the provider source service is deployed and healthy.
- preview deploy owns preview commit metadata sequencing: write `ZANE_OPERATOR_PREVIEW_TARGET_COMMIT_SHA` before deploy stages start, set `ZANE_OPERATOR_PREVIEW_BASELINE_COMPLETE=false` while a baseline run is in progress, and advance `ZANE_OPERATOR_PREVIEW_LAST_DEPLOYED_COMMIT_SHA` plus `ZANE_OPERATOR_PREVIEW_BASELINE_COMPLETE=true` only as the final successful deploy-stage metadata update
- preview deploy owns preview random-once secret materialization policy: baseline runs materialize missing preview-owned random-once values onto the existing shared preview env keys and existing service env keys those services actually consume before staged deploy begins; later preview runs reuse those stored values rather than regenerating them
- preview runtime reconciliation is data-driven from `apps/new-engine-ctl/config/stack-inputs.yaml` under `preview_runtime_reconciliation`; that YAML is the single source of truth for preview shared-env and service-env rewrites, and command code should interpret it rather than re-encode those mappings
- preview deploy also persists preview DB credentials returned by `prepare`/preview DB ensure onto the existing `MEDUSA_APP_DB_*` preview env keys once the preview environment exists
- `verify` proves contract-owned env/application results after deploy completes.
- preview deploy, not workflow YAML, decides whether a run is baseline replay or redeploy-only by combining environment existence with `ZANE_OPERATOR_PREVIEW_BASELINE_COMPLETE`.
- preview route identity is repo-owned. When a preview environment is cloned or reused, authenticated URL reconciliation and preview-excluded service cleanup belong in `zane-operator` and deploy/baseline policy stays in `apps/new-engine-ctl`.
- preview shared-env reconciliation is also repo-owned and typed: preview deploy syncs the existing shared host/DB keys from the preview environment topology plus prepared DB credentials before service deploy stages consume them.

## App Structure

Recommended initial layout:
- `apps/new-engine-ctl/src/cli.ts`
- `apps/new-engine-ctl/src/commands/*`
- `apps/new-engine-ctl/src/contracts/*`
- `apps/new-engine-ctl/src/orchestration/*`
- `apps/new-engine-ctl/src/providers/*`
- `apps/new-engine-ctl/src/zane-operator-client/*`
- `apps/new-engine-ctl/scripts/*`

Keep config parsing, orchestration, operator client code, and build/runtime packaging concerns separate.

## Boundary Rules

Rules:
- do not keep legacy shell compatibility wrappers once equivalent CLI behavior is verified
- do not reintroduce deploy-policy ownership into shell scripts, workflow YAML, or `zane-operator`
- remove superseded shell entrypoints when their behavior has no remaining justified surface
- do not run two long-term orchestration implementations in parallel
- do not execute runtime providers in `prepare` when their contract depends on a deployed and healthy source service
- local manual helpers may stay override-driven when no explicit per-service desired-revision contract exists; do not guess a branch-wide deterministic remote state

## Verification Gates

Before removing any replaced shell entrypoint, the CLI must prove parity for the affected flow:
- preview first-create behavior
- preview redeploy-only behavior
- main deploy behavior
- verify behavior
- secret masking/output behavior
- config-source parity (`stack-manifest.yaml`, `stack-inputs.yaml`)

## Non-Goals

- Do not generalize this CLI into a reusable framework during the initial migration.
- Do not move deploy policy into workflow YAML.
- Do not replace `zane-operator` with direct CI -> Zane calls.
- Do not introduce a plugin architecture.
- Do not optimize for public distribution.

## Generalization Rule

Keep the orchestration app repo-specific.
Only extract reusable lower-level pieces later if they prove obviously generic.

Examples of potentially reusable lower-level pieces later:
- Zane operator client helpers
- config loader utilities
- provider execution primitives

The orchestration model itself remains repo-owned unless a later explicit decision changes that.
- Preview and main deploys treat `MEDUSA_MEILISEARCH_MASTER_KEY` as infrastructure state for `medusa-meilisearch` plus operator provisioning only.
- `medusa-be` consumes the scoped backend key materialized onto `MEILISEARCH_API_KEY`; `n1` consumes the scoped frontend key materialized onto `NEXT_PUBLIC_MEILISEARCH_API_KEY`.
- Runtime Meilisearch fallback is intentionally absent. Only helper/operator input surfaces may fall back from `MEILISEARCH_MASTER_KEY` to `DC_MEILISEARCH_MASTER_KEY` when accepting local/operator CLI inputs.
