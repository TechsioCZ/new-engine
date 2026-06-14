# Herbatika App Guidelines

## Scope & Precedence
- This file applies to `apps/herbatika`.
- Root `AGENTS.md` still applies unless this file overrides it.
- If work starts from the repo root and touches Herbatika, read this file before editing `apps/herbatika`.
- If work touches `libs/ui` or `libs/storefront-data`, follow their local `AGENTS.md` as the source of truth for library code.
- Keep app-specific behavior in this app; promote behavior into a library only when the shared package has a real API/platform gap.

## Project Context
- Stack: Next.js 16 e-shop (App Router), React 19, Tailwind v4 tokenized styling.
- Main app code: `src/app`, `src/components`, `src/lib`, `src/styles/tokens`, `public`.
- Shared packages consumed by the app: `@techsio/ui-kit` and `@techsio/storefront-data`.
- Design references: `local/screens/figma-2/`.
- You may read `local/` reference material, but do not edit ignored local workspace files unless the user explicitly asks.
- Generated outputs must not be edited directly: `.next/`, `dist/`, `storybook-static/`.

## Skill Routing
- For app UI work that consumes `@techsio/ui-kit`, read `libs/ui/skills/ui-kit-workflow-orchestrator/SKILL.md` first.
  - App usage normally routes to `component-usage-ux`, the exact component `*-usage` skill, `framework-consumer-integration`, `app-token-overrides`, and `app-ui-kit-audit`.
  - Library authoring routes through `libs/ui/AGENTS.md` and the library authoring/token/storybook skills instead.
- For storefront data work involving `@techsio/storefront-data`, read `libs/storefront-data/skills/use-storefront-data-skills/SKILL.md` first.
  - Pick the smallest relevant follow-up skill: setup, migration, catalog/product reads, auth, cart/checkout, SSR/query boundaries, cache/pagination, or release audit.
- Load only the relevant skill files for the task. Do not duplicate their full instructions in this app-level file.

## UI & Token Guardrails
- Use internal UI primitives/components first (`@techsio/ui-kit`), not native controls in app code.
  - Avoid raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<img>`, inline SVG icons in app code unless there is a documented exception.
- For Next.js links/images, prefer the UI-kit component with `next/link` or `next/image` adapter support when that component exposes it.
- Use token-based utility classes, not raw Tailwind palette/spacing values.
  - Prefer: `p-200 mt-300 gap-150 text-success bg-danger`
  - Avoid: `p-4 mt-8 gap-4 bg-red-600 text-green-300`
- Put Herbatika visual differences in `src/styles/tokens/**`; avoid JSX `className` overrides that duplicate UI-kit component props/tokens.
- `src/styles/tokens/index.css` owns Tailwind, UI-kit token imports, Herbatika semantic/layout/spacing/typography tokens, and component token overrides.
- Run guardrails before handing off:
  - `pnpm validate:token-usage`
  - `pnpm validate:ui-primitives`
  - or `pnpm validate:guardrails`

## Storefront Data Guardrails
- Herbatika composes the shared data layer in `src/lib/storefront/storefront.ts` and adjacent `storefront-definition*` files.
- Prefer the preset surface from `@techsio/storefront-data`: shared hooks, flows, query keys, query options, cache policy, and SSR helpers.
- Keep app-local code thin: SDK instance, field defaults, localized text, toasts, analytics, form DTOs, address adapters, and Herbatika-specific read models can stay here.
- Move repeated backend communication, query key construction, cache sync, mutation invalidation, or reusable Medusa behavior into `libs/storefront-data`.
- Use explicit package subpath imports. Do not import from package roots or `dist/`.
- Keep server-only and client-only boundaries explicit; use `server-only` and `getServerQueryClient` for Server Component/SSR data paths.

## Build, Run, and Validation
- From `apps/herbatika`, `pnpm dev` runs the app on `http://localhost:3001`.
- From the repo root, prefer `pnpm -C apps/herbatika <script>` for app scripts.
- Do not use the root frontend-demo `localhost:3000` assumption for this app.
- `pnpm build` builds production output; `pnpm start` serves the production build.
- Temporary rule: do not run Biome commands in this app until stability issue is resolved.

## Testing Workflow
- For manual QA, use skill `local-web-testing`.
- Minimum checks: user flow smoke pass + DevTools Console + Network + visual regression review.
- Save evidence to `.qa/local-web-testing-YYYY-MM-DD/` (screenshots and JSON/text notes).

## DX, DRY, and Modularity
- Prefer small composable modules and shared helpers over duplicated logic.
- Soft limit: `~200` lines per source file. Exceeding it is a red flag and should trigger refactor consideration (not an absolute blocker).
- Keep naming explicit and consistent: kebab-case files, PascalCase React components.

## Research Sources
- Prefer local cloned docs when available:
  - `~/.local/share/tanstack-query`
  - `~/.local/share/tanstack-form`
  - `~/.local/share/medusa`
  - `~/.local/share/zagjs`
- If local mirrors are missing/outdated, use official upstream docs.
