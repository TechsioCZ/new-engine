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

1. Oxfmt check, type-aware Oxlint, and scoped Medusa ESLint.
2. dependency-cruiser, ast-grep, production-mode Knip, and JSCPD at the one-percent threshold.
3. TypeScript policy/isolation audit plus every source-project wrapper checked by root `tsc` `7.0.2` and native `tsgo`.
4. UI design-token usage and definition validation.
5. Affected Nx tests.
6. Affected Nx builds.

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
pnpm exec oxfmt --check .
pnpm exec oxlint . --type-aware
```

## Advisory trials

Ultracite, React Doctor, konsistent, and Danger are explicitly advisory. Their steps use `continue-on-error`, report outcomes in the workflow summary, and are excluded from `quality-gate`. Promote a trial only in a dedicated change that fixes or explicitly configures its findings first.

## Review expectations

- No `any`, double casts, `@ts-ignore`, broad exclusions, hidden baselines, or weaker strictness.
- No edits to generated outputs; fix source or generator inputs and regenerate.
- External data starts as `unknown` and is validated/narrowed.
- Reuse canonical `@techsio/std` utilities before creating helpers.
- UI changes preserve semantics, keyboard behavior, focus, token grammar, and browser evidence.
- Backend and infrastructure changes keep reads, retries, batches, polling, and cleanup bounded.
