# Repository Guide

## Scope

Nx + pnpm monorepo. Node 24 and pnpm 11.8.0 are required. Read the nearest subtree `AGENTS.md` or `CLAUDE.md`; local guidance overrides only its subtree.

Applications: Next.js (`frontend-demo`, `herbatika`, `n1`, `payload`), Medusa (`medusa-be`, `medusa-order-dashboard-plugin`, `medusa-symmy-plugin`), and services/tools (`zane-operator`, `new-engine-ctl`). Libraries: `analytics`, `std`, `storefront-data`, `storefront-security`, `ui`.

## Commands

- Change dependencies through pnpm CLI; never hand-edit manifests or `pnpm-lock.yaml`.
- Use the repository Nx wrapper: `./node_modules/.bin/nubx --node nx ...`.
- Root TypeScript 7 checks: `node scripts/typescript/audit.mjs`, `pnpm typecheck:tsc`, and native `pnpm typecheck:tsgo`.
- Exact Oxc checks: `pnpm exec oxfmt --check .` and `pnpm exec oxlint . --type-aware`.
- Optional Ultracite trial: `pnpm exec ultracite check <changed-paths>`; report failures, but do not treat it as the blocking lint command.
- Run the narrowest relevant project tests, typechecks, builds, token checks, Storybook checks, or integration suites.
- CI install contract: `pnpm install --frozen-lockfile --prefer-offline --ignore-scripts --strict-peer-dependencies`.
- `quality-gate` is the blocking merge check. Ultracite, React Doctor, konsistent, and Danger are advisory trials until separately promoted.

## Anti-Slop Laws

1. Search `@techsio/std` before writing a micro-helper. Import the canonical implementation; do not add copies, forwarding wrappers, or re-export-only barrels.
2. Treat JSON, request bodies, headers, environment variables, storage, SDK responses, and third-party payloads as `unknown`; validate and narrow before use. A cast is not validation.
3. No `any`, double casts, `@ts-ignore`, broad exclusions, hidden baselines, or weakened strictness.
4. Use typed domain/framework errors with stable codes and context. No empty catches, swallowed failures, or message-string matching when a typed discriminator exists.
5. Product forms use TanStack Form and schema-backed validation, not ad hoc field/touched/validation state.
6. Centralize minor-unit conversion, rounding, allocation, tax, and totals in the domain's tested money owner.
7. Generate migrations with the owning framework CLI. Never edit committed migration history.
8. Bound database/API reads, batches, loops, retries, polling, and cleanup with explicit limits and termination behavior.
9. Keep user-facing copy in locale resources. Czech text needs correct diacritics.
10. Follow primitive -> semantic -> component token grammar. No raw colors, arbitrary values, or one-off tokens bypassing the system.
11. App consumers import explicit `@techsio/ui-kit/...` subpaths. Prefer existing accessible primitives.
12. Preserve semantics, labels, keyboard behavior, visible focus, states, and ARIA relationships; verify interactive UI in a browser.
13. For Zag components, spread `api.get*Props()` before presentation overrides and compose handlers instead of replacing machine handlers.
14. No app-to-app imports; libraries do not import applications. Keep server/client boundaries explicit.
15. Fix source or generator inputs and regenerate. Never patch `.next`, `dist`, `.medusa`, generated types/import maps, or Storybook output.

## Review Ownership

This quality-enforcement upgrade is one coordinated PR. Request both lanes when changes cross ownership:

- `@RedEyeCZ`: pnpm, lockfile, CI, Docker, scripts/tooling, backend and deployment infrastructure.
- `@KaiUweCZE`: Next apps, React behavior, `libs/ui`, tokens, Storybook, accessibility, and frontend gates.

See `.github/CODEOWNERS` and `docs/review-facts.md`.
