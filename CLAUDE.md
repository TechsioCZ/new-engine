# Repository Guide

## Project

Nx + pnpm monorepo for Medusa commerce services, Next.js storefronts, Payload, operators, plugins, and shared libraries. Node 24 and pnpm 11.15.1 are required.

### Applications

- Next.js 16.3.0-preview.5: `frontend-demo`, `herbatika`, `n1`, `payload`
- Medusa: `medusa-be`, `medusa-order-dashboard-plugin`, `medusa-symmy-plugin`
- Services/tools: `smart-suggest`, `zane-operator`, `new-engine-ctl`

### Libraries

`analytics`, `smart-suggest`, `std`, `storefront-data`, `storefront-security`, `ui`.

Read the nearest subtree `AGENTS.md` or `CLAUDE.md`; it overrides this file only for that subtree.

## Commands

- Install or change dependencies only through pnpm CLI; never hand-edit manifests or the lockfile.
- Preserve the Nx wrapper: `./node_modules/.bin/nubx --node nx ...`.
- Root TypeScript 7 checks: `node scripts/typescript/audit.mjs`, `pnpm typecheck:tsc`, and native `pnpm typecheck:tsgo`.
- Exact Oxc checks: `pnpm exec oxfmt --check .` and `pnpm exec oxlint . --type-aware`.
- Optional Ultracite trial: `pnpm exec ultracite check <changed-paths>`; report failures, but do not treat it as the blocking lint command.
- CI install contract: `pnpm install --frozen-lockfile --prefer-offline --ignore-scripts --strict-peer-dependencies`.
- Run the narrowest relevant typecheck, test, build, token, Storybook, or integration command for changed projects.
- `quality-gate` is blocking; Ultracite, React Doctor, konsistent, and Danger remain advisory trials.
- Never weaken a blocking gate or hide a violation with an unexplained suppression.

## Anti-Slop Laws

1. Search `@techsio/std` before writing a micro-helper. Import the canonical implementation; no local copies, forwarding wrappers, re-export-only barrels, or alias modules that obscure ownership.
2. Treat JSON, request bodies, headers, environment variables, storage, SDK responses, and third-party payloads as `unknown`; validate/narrow before use. A cast is not validation.
3. No `any`, double casts, `@ts-ignore`, broad exclusions, hidden baselines, or weakened strictness.
4. Use typed domain/framework errors with stable codes and context. No empty catches, swallowed failures, or string matching when a typed discriminator exists.
5. Product forms use TanStack Form and schema-backed validation, not ad hoc field/touched/validation state.
6. Centralize minor-unit conversion, rounding, allocation, tax, and totals in the domain's tested money owner. Never scatter floating-point money arithmetic.
7. Generate migrations with the owning framework CLI. Never edit generated or committed migration history; add a new migration for corrections.
8. Bound database/API reads, batches, loops, retries, and polling with explicit limits, pagination/chunking, termination, and timeout/cancellation behavior.
9. Keep user-facing copy in locale resources. Czech text requires correct diacritics; no mojibake, ASCII approximations, or untranslated English in Czech UI.
10. Follow primitive → semantic → component token grammar and component token classes. No raw colors, arbitrary values, or one-off tokens that bypass the system.
11. App consumers import explicit `@techsio/ui-kit/...` subpaths, not package roots, `dist`, or unverified aliases. Prefer existing accessible primitives.
12. Preserve semantics, labels, keyboard behavior, visible focus, states, and ARIA relationships; verify interactive UI changes in a browser.
13. For Zag components, spread `api.get*Props()` before local presentation overrides and compose handlers instead of replacing machine handlers.
14. No app-to-app imports; libraries do not import applications. Keep server/client boundaries explicit.
15. Fix source or generator inputs and regenerate. Never patch `.next`, `dist`, `.medusa`, generated types/import maps, or Storybook output.

## Review Ownership

This quality-enforcement change intentionally ships as one big-bang PR. Request both lanes:

- `@RedEyeCZ`: pnpm, lockfile, CI, Docker, scripts, and tooling infrastructure.
- `@KaiUweCZE`: Next apps, frontend behavior, `libs/ui`, tokens, accessibility, and UI gates.

See `docs/review-facts.md`.
