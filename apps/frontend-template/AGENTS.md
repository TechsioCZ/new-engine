# Frontend Template Guidelines

## Scope & Precedence

- This file applies to `apps/frontend-template`.
- Root `AGENTS.md` still applies unless this file overrides it.
- This is the source template for `pnpm create-app "AppName"` (see
  `scripts/create-app.mts`). Changes here apply to every app generated later.

## Project Context

- Stack: Next.js 16 (App Router, Turbopack, React Compiler), React 19,
  Tailwind CSS v4, TypeScript 7, Node.js 24 LTS.
- UI: the published `@techsio/ui-kit` package from npm (not the workspace
  source), so the app can be moved out of the monorepo unchanged.
- Standalone install: `pnpm-workspace.yaml` makes this directory its own pnpm
  root with its own `pnpm-lock.yaml`. It is not part of the root workspace or
  the Nx project graph.
- Main app code: `src/app`, `src/styles/tokens`.
- Generated outputs must not be edited directly: `.next/`, `next-env.d.ts`.

## Theme & Tokens

- The UI-kit `business` brand is the default theme:
  `<html class="light" data-theme="business">`. Business is light-only; switch
  brands by changing `data-theme` (`base` has no attribute and supports dark).
- `src/styles/tokens/index.css` owns the Tailwind import, the UI-kit token
  import, and app-owned token overrides. Start overrides at the semantic layer
  (`--color-bg-primary-base`, …) before touching component tokens.
- For optional persisted theme switching, use `AppThemeProvider` and
  `BrandThemeScript` from `@techsio/ui-kit/theme/theme-provider`.

## UI Guardrails

- Use UI-kit components first (`@techsio/ui-kit/atoms/*`, `molecules/*`,
  `organisms/*`), not native controls in app code.
- In Next.js, pass framework adapters: `<LinkButton as={NextLink} …>`,
  `<Image as={NextImage} …>`.
- Use token-based utilities, not raw Tailwind palette/spacing values.
  - Prefer: `p-200 mt-300 gap-150 text-fg-secondary bg-base`
  - Avoid: `p-4 mt-8 gap-4 bg-red-600 text-gray-500`
- Compound components (`Tabs.Trigger`, `Dialog.Content`, …) and callbacks
  belong inside a `"use client"` module.
- Do not add `useMemo` / `useCallback` by default; React Compiler is enabled.
- In this monorepo, UI-kit usage skills live in `../../libs/ui/skills/`
  (start with `ui-kit-workflow-orchestrator`).

## Build, Run, and Validation

- `pnpm install` from this directory.
- `pnpm dev` runs the app on `http://localhost:3001`.
- `pnpm build` builds production (`standalone`) output; `pnpm start` serves it.
- `pnpm check` runs `oxfmt --check`, `oxlint` and `tsc --noEmit`. Run it before
  handoff. `pnpm format` and `pnpm lint:fix` apply fixes.
- Formatting and linting use oxfmt and oxlint, not Biome; the root Biome config
  excludes `apps/`.

## DX, DRY, and Modularity

- Prefer small composable modules and shared helpers over duplicated logic.
- Soft limit: `~200` lines per source file.
- Naming: kebab-case files, PascalCase React components.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
