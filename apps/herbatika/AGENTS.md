# Repository Guidelines

## Scope & Precedence
- This file applies to `apps/herbatika`.
- In this monorepo, the closest `AGENTS.md` wins (app/lib-level rules override broader ones).
- If work touches `libs/ui` or `libs/storefront-data`, follow their local `AGENTS.md` as source of truth.

## Project Context
- Stack: Next.js 16 e-shop (App Router), React 19, Tailwind v4 tokenized styling.
- Main app code: `src/app`, `src/components`, `src/lib`, `src/styles/tokens`, `public`.
- Design references: `local/screens/figma-2/`.
- Generated outputs must not be edited directly: `.next/`, `dist/`, `storybook-static/`.

## UI & Token Guardrails
- Use internal UI primitives/components first (`@techsio/ui-kit`), not native controls in app code.
  - Avoid raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<img>`, inline SVG icons in app code unless there is a documented exception.
- Use token-based utility classes, not raw Tailwind palette/spacing values.
  - Prefer: `p-200 mt-300 gap-150 text-success bg-danger`
  - Avoid: `p-4 mt-8 gap-4 bg-red-600 text-green-300`
- Run guardrails before handing off:
  - `pnpm validate:token-usage`
  - `pnpm validate:ui-primitives`
  - or `pnpm validate:guardrails`

## Build, Run, and Validation
- `pnpm dev` runs the app on `http://localhost:3001`.
- `pnpm build` builds production output.
- `pnpm start` serves the production build.
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
