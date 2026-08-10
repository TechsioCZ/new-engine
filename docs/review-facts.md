# Review facts

## Required lanes

The quality-enforcement upgrade is one coordinated PR and requires both reviewers.

| Lane | Reviewer | Owns |
| --- | --- | --- |
| Infrastructure | `@RedEyeCZ` | pnpm and lockfile, CI, Docker, scripts, quality tooling, backend/deployment infrastructure |
| Frontend | `@KaiUweCZE` | Next apps, React behavior, `libs/ui`, tokens, Storybook, accessibility, frontend quality gates |

CODEOWNERS encodes path ownership; request both reviewers when a change crosses lanes.

## Blocking merge contract

The required GitHub check is `quality-gate`. It runs with `if: always()` and fails when any blocking lane fails, is cancelled, or is skipped.

Blocking lanes:

1. Ultracite's full type-aware Oxlint policy, Oxfmt check, and scoped Medusa ESLint.
2. dependency-cruiser, ast-grep, production-mode Knip, and JSCPD at the one-percent threshold.
3. TypeScript policy/isolation audit plus every source-project wrapper checked by root `tsc` `7.0.2` and native `tsgo`.
4. UI design-token usage and definition validation.
5. Affected Nx tests.
6. Affected Nx builds.
7. React Doctor errors introduced by changed React code.
8. konsistent configuration and tool execution, including schema failures; convention policy is deferred.

All CI installs use Node 24 and:

```sh
pnpm install --frozen-lockfile --prefer-offline --ignore-scripts --strict-peer-dependencies
```

Medusa framework and CLI compiler internals use isolated TypeScript 5.9.3 package extensions; source projects remain checked by root TypeScript 7.

Exact blocking compiler commands:

```sh
node scripts/typescript/audit.mjs
pnpm typecheck:tsc
pnpm typecheck:tsgo
```

Exact blocking Oxc commands:

```sh
pnpm exec oxfmt --config oxfmt.config.ts --check .
pnpm lint:ultracite
```

## Blocking architecture checks

React Doctor and konsistent are independent top-level jobs, so they run in parallel with the other blocking lanes. React Doctor scans changed code with `--blocking error`; pull requests compare against `github.event.pull_request.base.sha`, while pushes to `master` compare against `github.event.before`. Superseded pull request runs are canceled, but every `master` push receives a unique concurrency group, so a later push cannot supersede a pending or in-progress scan of its immediate predecessor. konsistent always executes rather than treating a missing configuration as a successful skip. Its schema-backed beta.3 configuration intentionally has no conventions yet: configuration, schema, and tool failures block, while convention policy is deferred.

React Doctor warnings remain visible review signals rather than merge blockers. `no-multi-comp` is a modularity heuristic, not a one-component-per-file mandate: extract unrelated route or page responsibilities behind a deeper owner, but keep compound-component slots co-located when they share one public namespace and private machine, context, or styling contract. Do not fragment cohesive modules merely to reduce the warning count.

Exact blocking commands:

```sh
pnpm exec react-doctor . --scope changed --base "$BASE_SHA" --blocking error --no-score --no-supply-chain -y
pnpm exec konsistent check --format=github --error-on-warnings
```

## Advisory trials

Danger remains advisory and is excluded from `quality-gate`. Ultracite is blocking through `format-and-lint` and therefore participates in `quality-gate`.

## Review expectations

- No `any`, double casts, `@ts-ignore`, broad exclusions, hidden baselines, or weaker strictness.
- No edits to generated outputs; fix source or generator inputs and regenerate.
- External data starts as `unknown` and is validated/narrowed.
- Reuse canonical `@techsio/std` utilities before creating helpers.
- UI changes preserve semantics, keyboard behavior, focus, token grammar, and browser evidence.
- Backend and infrastructure changes keep reads, retries, batches, polling, and cleanup bounded.
