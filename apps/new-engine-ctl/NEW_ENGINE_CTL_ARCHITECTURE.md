# New Engine CTL Architecture

Last updated: 2026-03-13
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
- preview scope may read preview-environment metadata to resolve the baseline commit; the active keys are `ZANE_OPERATOR_PREVIEW_TARGET_COMMIT_SHA` and `ZANE_OPERATOR_PREVIEW_LAST_DEPLOYED_COMMIT_SHA`
- `prepare` is for shared-resource prerequisites and input validation only.
- runtime-provider execution belongs in deploy orchestration after the provider source service is deployed and healthy.
- preview deploy owns preview commit metadata sequencing: write `ZANE_OPERATOR_PREVIEW_TARGET_COMMIT_SHA` before deploy stages start and advance `ZANE_OPERATOR_PREVIEW_LAST_DEPLOYED_COMMIT_SHA` only as the final successful deploy-stage metadata update
- `verify` proves contract-owned env/application results after deploy completes.

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
