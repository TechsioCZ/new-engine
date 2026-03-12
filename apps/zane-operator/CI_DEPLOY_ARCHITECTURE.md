# CI Deploy Architecture

Last updated: 2026-03-12
Scope: CI-driven preview and main deployment orchestration through `zane-operator`.

## Authority

- This file is the authoritative architecture contract for CI deploy behavior.
- If active code or workflow behavior conflicts with this file, update the code or explicitly update this file first.
- Any change to this contract requires explicit user approval before implementation continues.
- Any commit explicitly requested by the user must use Conventional Commits style.

## Control Plane

- CI is the source of deploy orchestration truth.
- Built-in Zane preview-environment behavior is not sufficient for this monorepo and affected-service deployment model.
- Zane is the deployment target, not the orchestration owner for previews in this repository.
- `zane-operator` is the default CI-facing control-plane wrapper for Zane API calls.
- Direct CI -> Zane deploy webhook calls are allowed only as an implementation detail or narrow exception that has been explicitly approved in this architecture.

## Operating Model

- One canonical Zane project tracks the default branch / production lane.
- PR CI creates or reuses a preview environment derived from that canonical project.
- Preview environments clone the canonical service set except services explicitly marked as non-cloned in `config/stack-manifest.yaml`.
- `medusa-db` and `zane-operator` are not cloned into preview environments.
- Services marked as non-cloned are not part of preview readiness requirements and may still remain in the preview environment.
- User-created helper/debug services may exist in preview environments and must not fail preview readiness.
- CI updates only the affected services in that preview environment.
- CI injects env overrides produced by `prepare` only where required by the affected services.

## Preview Deploy Contract

1. Resolve the canonical Zane project identity from CI secrets/config, not from hardcoded workflow literals.
2. Discover whether the preview environment for `pr_number` already exists.
3. If it does not exist, create it through the approved control-plane path.
4. Initial preview creation must be idempotent:
   - if the environment already exists and all required preview-cloned services are defined, creation passes without redeploying
   - preview DB ensure and credential generation must also be idempotent
   - services excluded from preview cloning and user-created helper/debug services do not block reuse
5. On initial preview creation, deploy services in manifest stack order.
6. Provisioning that depends on preview service runtime may only run after the relevant preview service is deployed and healthy.
7. Meilisearch preview key provisioning happens only after preview `medusa-meilisearch` is up on first environment creation.
8. After first successful preview creation, subsequent PR updates are redeploy-only in manifest stack order.
9. Subsequent PR updates should reuse existing preview env values held in Zane; automatic reprovisioning is not required.
10. If a contract or env shape change requires reprovisioning beyond normal redeploy behavior, that is a manual intervention path unless explicitly automated later.
11. Resolve deploy targets for affected services inside that preview environment.
12. Obtain the per-service deploy key/webhook/token required to trigger deploys for those services.
13. Apply env overrides derived from `prepare` or first-creation runtime provisioning before or as part of the deploy trigger.
14. Trigger deploy only for affected services plus any explicitly coupled dependents defined in the manifest.
15. Persist enough metadata in job outputs for downstream verification, but do not emit secrets to summaries/logs.

## Main Deploy Contract

1. Resolve the canonical production Zane project/environment from CI secrets/config.
2. Resolve deploy targets only for affected services.
3. Obtain the per-service deploy key/webhook/token required for those services.
4. Trigger deploys without preview-only env mutation logic.
5. Preserve the same masking and no-summary secret policy used in preview.
6. Resolve downtime-risk once after affected-service filtering and require explicit manual approval before any main-lane deploy that includes downtime-risk services.

## Git Resolution Contract

- Main-lane Git deploys must be pinned to the exact CI commit SHA being promoted.
- Preview-lane Git deploys remain branch-based by default so manual reruns in Zane can continue to pull the latest PR-branch state unless a later explicit override contract is added.
- When no explicit Git commit SHA is passed to preview deploy orchestration, skip/reuse logic must not guess; it may stay conservative unless the active implementation can resolve the exact branch-head commit SHA that Zane would pull for that preview redeploy.
- Closing that preview-lane gap requires active code to resolve the effective branch-head commit SHA for each Git service before applying same-commit skip/reuse decisions.

## Preview Environment Identity

- Preview environments are keyed by PR number and must be discoverable idempotently.
- Re-running the same PR workflow must not create duplicate preview environments.
- Closing the PR should eventually tear down the preview environment and its preview DB.
- Teardown closes the whole preview environment created for the PR; it does not selectively archive services inside it.
- The preview environment naming/lookup rule must live in active scripts, not inline in workflow YAML.

## Service Identity Contract

- `config/stack-manifest.yaml` is the source of truth for CI service mapping metadata.
- Each deployable service must declare the metadata needed to map `service_id` -> `service_slug`.
- Minimum required Zane metadata per deployable:
  - `service_slug`
  - optional `clone_to_preview` marker; omitted means cloned into preview by default
  - deploy lane eligibility (`preview`, `main`, or both)
  - whether main-lane deploy of the service carries downtime risk and therefore requires manual approval
  - whether the service consumes preview DB outputs
  - whether the service consumes Meili browser/backend key outputs
  - optional coupled dependents that should deploy together
- Active manifest/script/operator payloads use exactly two service identity fields:
  - `service_id`: stable repo/manifest identity
  - `service_slug`: stable upstream Zane identity
- No other service-identity fields belong in the active deploy contract.

## Prepare-To-Deploy Env Contract

- `medusa-be` preview deploy must be able to consume preview DB outputs from `prepare`:
  - `preview_db_name`
  - `preview_db_user`
  - `preview_db_password`
- Frontend preview deploy must be able to consume the prepared browser Meili key:
  - `meili_frontend_key`
  - plus any manifest-defined public env variable name
- Backend Meili privileged key stays internal unless a later separate deploy job explicitly needs it.
- The active deploy script owns the mapping from prepare outputs -> Zane env var updates.

## Secret And Output Contract

- Cross-job propagation is allowed when operationally required for deploy.
- Every sensitive value written to `GITHUB_OUTPUT` must be masked first.
- Sensitive values must never be echoed in transformed or summarized form.
- The deploy stage may read sensitive cross-job outputs, but it must not republish them.
- Required Zane API credentials/secrets must be validated before deploy starts.

## Required Active Surface

- Keep workflow YAML thin; active logic belongs in `scripts/ci/*` or `apps/zane-operator/**`.
- Deploy responsibilities must stay explicit and testable:
  - Zane environment discovery/create/update
  - deploy-target/deploy-key resolution
  - env override application
  - deploy trigger
  - deploy verification
- Route authenticated Zane API interactions through `zane-operator` by default.

## Verification Contract

Preview verification must prove:
- the target preview environment exists
- the preview environment contains the expected cloned service set
- affected services were the ones targeted for deploy
- `medusa-be` preview received the preview DB credentials when required
- frontend preview received the Meili browser key when required
- first-creation-only provisioning ran only after its prerequisite preview service was healthy
- deploy trigger completed without leaking secrets
- non-cloned services and user-created helper/debug services are warning-only and must not fail verification

Main verification must prove:
- only intended services were targeted
- no preview-only env overrides were applied
- deploy trigger completed without leaking secrets

## Do Not Assume

- Preview deploy is not implemented until active `deploy` and `verify` jobs stop being placeholders.
- `zane-operator` currently implements preview DB lifecycle only unless extended in active code.
- Local `mise` orchestration is not the CI decision engine.
- `nx affected` is CI-only and must not drive local runtime behavior.

## Required Read Set

- `apps/zane-operator/CI_DEPLOY_ARCHITECTURE.md`
- `config/stack-manifest.yaml`
- `.github/workflows/zaneops-preview-after-ci.yml`
- `.github/workflows/zaneops-main-after-ci.yml`
- `.github/workflows/zaneops-preview-teardown.yml`
- `scripts/ci/lib.sh`
- `scripts/ci/check-workflow-inputs.sh`
- `scripts/ci/preview-db.sh`
- `scripts/ci/resolve-affected-services.sh`
- `scripts/ci/resolve-prepare-needs.sh`
- `scripts/lib/stack-manifest.sh`
- active `apps/zane-operator/**` API surface if `zane-operator` is extended for deploy orchestration

## Non-Goals

- Do not redesign local `mise` developer flow.
- Do not move deploy logic into workflow YAML.
- Do not invent a different preview orchestration model without updating this file first.

## Completion Gate

Do not treat CI deploy implementation as complete until:
- the preview/main deploy contract above is implemented in active scripts
- active workflows call those scripts
- obsolete placeholder deploy/verify jobs are removed
- this file and active workflow behavior match exactly
