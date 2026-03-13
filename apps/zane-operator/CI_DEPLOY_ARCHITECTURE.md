# CI Deploy Architecture

Last updated: 2026-03-13
Scope: CI-driven preview and main deployment orchestration through `zane-operator`.

## Authority

- This file is the committed source of truth for active CI deploy behavior in this repo.
- If active code or workflow behavior conflicts with this file, update the code or explicitly update this file first.
- Broader architecture planning may exist outside this file, but CI deploy implementation must remain consistent with this committed contract.
- Any change to this contract requires explicit user approval before implementation continues.
- Any commit explicitly requested by the user must use Conventional Commits style.

## Control Plane

- CI is the source of deploy orchestration truth.
- Built-in Zane preview-environment behavior is not sufficient for this monorepo and affected-service deployment model.
- Zane is the deployment target, not the orchestration owner for previews in this repository.
- `zane-operator` is the default CI-facing control-plane wrapper for Zane API calls.
- Direct CI -> Zane deploy webhook calls are allowed only as an implementation detail or narrow exception that has been explicitly approved in this architecture.

## Required Inputs

- required repo config: `config/stack-manifest.yaml`, `config/stack-inputs.yaml`
- required workflow surfaces: `.github/workflows/zaneops-preview-after-ci.yml`, `.github/workflows/zaneops-main-after-ci.yml`, `.github/workflows/zaneops-preview-teardown.yml`
- required active scripts: `scripts/ci/check-workflow-inputs.sh`, `scripts/ci/lib.sh`, `scripts/ci/preview-db.sh`, `scripts/ci/preview-environment.sh`, `scripts/ci/provision-meili-keys.sh`, `scripts/ci/resolve-affected-services.sh`, `scripts/ci/resolve-downtime-risk.sh`, `scripts/ci/resolve-prepare-needs.sh`, `scripts/ci/verify-meili-keys.sh`, `scripts/ci/zane-deploy.sh`
- required operator/runtime surface: active `apps/zane-operator/**` endpoints used for environment resolution, env mutation, deploy trigger, verify, and runtime provisioning
- required secrets/config must be validated before deploy starts: canonical Zane project/environment identity, authenticated Zane API credentials, and any lane-specific deploy secrets consumed by `prepare` or `deploy`

## Operating Model

- One canonical Zane project tracks the default branch / production lane.
- PR CI creates or reuses a preview environment derived from that canonical project.
- Preview environments clone the canonical service set except services explicitly marked as non-cloned in `config/stack-manifest.yaml`.
- Current examples of non-cloned services are `medusa-db` and `zane-operator`.
- Services marked as non-cloned are not part of preview readiness requirements and may still remain in the preview environment.
- User-created helper/debug services may exist in preview environments and must not fail preview readiness.
- CI updates only the affected services in that preview environment.
- CI injects env overrides produced by `prepare` or first-creation runtime provisioning only where required by the affected services.

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
7. Runtime-dependent provisioning on first preview creation is allowed only through an explicit contract-owned provider path.
   - Current example: scoped Meilisearch keys are provisioned only after the preview search service is healthy.
8. After first successful preview creation, subsequent PR updates are redeploy-only in manifest stack order.
9. Subsequent PR updates should reuse existing preview env values held in Zane; automatic reprovisioning is not required.
10. If a contract or env shape change requires reprovisioning beyond normal redeploy behavior, that is a manual intervention path unless explicitly automated later.
11. Resolve deploy targets for affected services inside that preview environment.
12. Obtain the per-service deploy key/webhook/token required to trigger deploys for those services.
13. Apply env overrides derived from `prepare` or first-creation runtime provisioning before or as part of the deploy trigger.
14. Trigger deploy only for affected services plus any explicitly coupled dependents defined in the manifest.
15. Persist enough metadata in job outputs for downstream verification, but do not emit secrets to summaries/logs.

## Preview Decision Table

- environment missing: create preview environment, reconcile baseline cloned services, run first-creation deploy flow in manifest stack order, allow contract-owned runtime provisioning after prerequisite services are healthy
- environment exists and baseline complete: treat as redeploy-only flow, reuse existing preview env values in Zane, do not automatically reprovision random-once or runtime-generated values
- environment exists with safe drift: auto-reconcile only missing preview-cloned services, missing contract-owned persisted inputs, or missing deploy-target metadata required for normal deploy flow, then continue with the appropriate first-creation or redeploy path
- environment exists with manual-only drift: stop and require manual intervention for reprovisioning caused by contract/key-scope changes, structural env changes requiring rotation, or state migration
- preview-excluded services and user-created helper/debug services: warning-only for readiness and verification unless a later explicit contract changes that behavior

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
  - which prepared or runtime-provisioned outputs the service consumes
  - optional coupled dependents that should deploy together
- Active manifest/script/operator payloads use exactly two service identity fields:
  - `service_id`: stable repo/manifest identity
  - `service_slug`: stable upstream Zane identity
- No other service-identity fields belong in the active deploy contract.

## Deploy Input Contract

- The shared deploy-input contract lives in `config/stack-inputs.yaml`.
- Preview first-creation random-once secrets are CI-generated from that contract and persisted into preview service env through the deploy path.
- Those generated preview secrets must be created exactly once per preview environment creation and reused through the same deploy/verify run; later PR updates do not regenerate them automatically.
- The deploy path must support prepared inputs produced before deploy starts.
  - Current example: preview DB credentials returned by `prepare`.
- The deploy path must support runtime-provisioned inputs produced only after a prerequisite service is healthy.
  - Current example: scoped search credentials produced after the preview search service is healthy.
- Public client-facing outputs must flow through manifest-defined target env vars, not hardcoded workflow YAML.
- Subsequent preview redeploys should reuse existing preview env values held in Zane and do not require automatic reprovisioning.
- Main lane continues to consume prepared inputs from `prepare`.
- The active deploy script owns the mapping from prepared or runtime-provisioned outputs to Zane env var updates.
- On redeploy-only preview runs, verification must still prove that required persisted contract-owned inputs are present on affected consumers even when those inputs were not regenerated in the current run.

## Secret And Output Contract

- Cross-job propagation is allowed when operationally required for deploy.
- Every sensitive value written to `GITHUB_OUTPUT` must be masked first.
- Sensitive values must never be echoed in transformed or summarized form.
- The deploy stage may read sensitive cross-job outputs, but it must not republish them.
- Required Zane API credentials/secrets must be validated before deploy starts.

## Failure Handling Contract

- `scope` failure: stop immediately; do not guess affected services or deploy targets
- `prepare` failure: stop before deploy; partial prepare outputs may be discarded and must not trigger deploy
- preview environment create/reconcile failure: stop; retry is allowed only if the active scripts are designed to converge safely
- deploy trigger failure after partial service deploys: stop and verify actual remote state before any retry; retries must remain idempotent and must not silently regenerate random-once or runtime-provisioned secrets
- runtime provider failure: stop the affected lane unless the provider is explicitly optional in the active contract; do not continue with incomplete required env mutation
- verification failure: treat deploy as incomplete; require investigation of remote state before retry or manual intervention
- manual intervention paths must be used for structural drift, reprovisioning after contract changes, or any case where retry would mutate state beyond the normal converge contract

## Runtime Provisioning Contract

- Runtime-dependent provisioning must not be ad hoc inside workflow YAML.
- Runtime-dependent provisioning must be driven by `config/stack-inputs.yaml`, consumed by CI/local tooling, and enforced by active scripts and `zane-operator`.
- `zane-operator` is responsible only for provisioners that require authenticated Zane inspection or access to a running service.
- The contract must remain provider-oriented rather than product-name-oriented.
  - Current example: a search credential provider for browser/backend consumers.
  - Reserved future example: an application publishable-key provider once its upstream service contract is stable.
- Provider definitions may be prepared ahead of implementation, but inactive providers must stay explicitly non-runnable until their upstream service contract exists.
  - Current reserved inactive provider: Medusa publishable-key provisioning for frontend consumers.

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
- required prepared inputs reached the services that consume them
- required runtime-provisioned inputs reached the services that consume them
- on redeploy-only preview runs, required persisted contract-owned env inputs are still present on affected consumers even when the current run did not regenerate them
- first-creation-only runtime provisioning ran only after its prerequisite service was healthy
- deploy trigger completed without leaking secrets
- non-cloned services and user-created helper/debug services are warning-only and must not fail verification

Main verification must prove:
- only intended services were targeted
- no preview-only env overrides were applied
- deploy trigger completed without leaking secrets

## Do Not Assume

- Preview deploy and verify are active workflow paths; validate active scripts and `zane-operator` behavior before changing the contract.
- `zane-operator` actively owns authenticated Zane gateway behavior implemented in active code, including preview DB lifecycle, environment resolution/archive, target resolution, env mutation, deploy trigger, deploy verify, and preview Meili provisioning.
- Local `mise` orchestration is not the CI decision engine.
- `nx affected` is CI-only and must not drive local runtime behavior.

## Required Read Set

- `apps/zane-operator/CI_DEPLOY_ARCHITECTURE.md`
- `config/stack-inputs.yaml`
- `config/stack-manifest.yaml`
- `.github/workflows/zaneops-preview-after-ci.yml`
- `.github/workflows/zaneops-main-after-ci.yml`
- `.github/workflows/zaneops-preview-teardown.yml`
- `scripts/ci/lib.sh`
- `scripts/ci/check-workflow-inputs.sh`
- `scripts/ci/preview-db.sh`
- `scripts/ci/preview-environment.sh`
- `scripts/ci/provision-meili-keys.sh`
- `scripts/ci/resolve-affected-services.sh`
- `scripts/ci/resolve-downtime-risk.sh`
- `scripts/ci/resolve-prepare-needs.sh`
- `scripts/ci/verify-meili-keys.sh`
- `scripts/ci/zane-deploy.sh`
- `scripts/lib/stack-inputs.sh`
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
