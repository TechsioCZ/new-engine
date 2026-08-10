# Lint architecture

- `pnpm depcruise` owns workspace dependency boundaries. The legacy Nx ESLint boundary config is intentionally empty. Dependency-cruiser 18 currently prints a TypeScript 7 compatibility warning, but its acorn analysis still cruises the workspace and enforces the path rules; do not switch it to the SWC parser because that parser does not currently parse this repository's TSX.
- TypeScript 7 is outside `@typescript-eslint/parser` 8.x's supported range (`<6.1`), so the root ESLint config does not parse TypeScript.
- Medusa's ESLint plugin loads `@typescript-eslint` internally and therefore cannot provide a supported TS7 source gate. Its CLI remains runnable, but TypeScript and React Hooks enforcement belongs to Oxlint.
- Root `pnpm lint:ultracite` is blocking. `oxlint.config.ts` extends Ultracite's full native core, React, Next.js, TanStack Query, and Vitest policies plus ESLint-parity GitHub, SonarJS, React Doctor, Next.js, and TanStack Query plugins. Type-aware linting and unused-disable detection are mandatory.
- `pnpm lint:oxlint` runs the same resolved Oxlint configuration directly for focused diagnostics. No local rule exceptions, broad category disables, generated baselines, or source suppressions are permitted.
