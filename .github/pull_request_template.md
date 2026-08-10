## What changed

-

## Why

-

## Risk and rollout

- Risk: low / medium / high
- Rollback or mitigation:
- Generated files or migrations: none / describe

## Verification

- [ ] `pnpm install --frozen-lockfile --prefer-offline --ignore-scripts --strict-peer-dependencies`
- [ ] `node scripts/typescript/audit.mjs`, `pnpm typecheck:tsc`, and native `pnpm typecheck:tsgo` run
- [ ] Exact Oxc checks run: `pnpm exec oxfmt --check .` and `pnpm exec oxlint . --type-aware`
- [ ] Relevant design-token checks and narrow project tests/builds run
- [ ] UI behavior verified in a browser when applicable
- [ ] `quality-gate` passes

Commands and evidence:

```text

```

## Review lanes

- [ ] `@RedEyeCZ` requested for pnpm, lockfile, CI, Docker, scripts, tooling, backend, or deployment changes
- [ ] `@KaiUweCZE` requested for Next apps, React behavior, `libs/ui`, tokens, Storybook, accessibility, or frontend gates

## Anti-slop check

- [ ] Reused `@techsio/std` instead of adding a duplicate micro-helper
- [ ] Validated external/untrusted data instead of casting it
- [ ] Kept operations bounded and errors typed/actionable
- [ ] Did not patch generated output, add a hidden baseline, or weaken/suppress a blocking gate
- [ ] Kept trial-tool findings advisory instead of laundering them as passing blocking checks
