# Lint architecture

- `pnpm depcruise` owns workspace dependency boundaries. The legacy Nx ESLint boundary config is intentionally empty. Dependency-cruiser 18 currently prints a TypeScript 7 compatibility warning, but its acorn analysis still cruises the workspace and enforces the path rules; do not switch it to the SWC parser because that parser does not currently parse this repository's TSX.
- TypeScript 7 is outside `@typescript-eslint/parser` 8.x's supported range (`<6.1`), so the root ESLint config does not parse TypeScript.
- Medusa's ESLint plugin loads `@typescript-eslint` internally and therefore cannot provide a supported TS7 source gate. Its CLI remains runnable, but TypeScript and React Hooks enforcement belongs to Oxlint.
- Root `pnpm lint:oxlint` loads `oxlint.config.ts`, enables the correctness category at error severity, and keeps only rule-specific debt exceptions. Each exception records its Node 24/Oxlint 1.74.0 diagnostic count and must be removed when that debt is repaired; broad category disables and generated baselines are prohibited.
- `node scripts/lint/oxlint.mjs [paths...]` is a separate focused React Hooks check. Rules-of-hooks violations are blocking; exhaustive-deps remains advisory until the existing findings are cleared.
- `node --test scripts/lint/oxlint-config.test.mjs` guards the blocking correctness category and the exact exception set.
