# Payload App

Payload 3.86 + Next.js 16. Treat access control, hooks, and generated contracts as security-sensitive.

## Security invariants

- Local API bypasses access control by default. When acting as a user, pass `user` and `overrideAccess: false`.
- Pass `req` to nested Payload operations in hooks so they share the transaction.
- Use context flags to prevent recursive hooks.
- Field-level access returns booleans only; collection access may return query constraints.
- Default to restrictive access. Validate route params, request data, environment values, and external responses from `unknown`.
- Use `APIError` or typed domain errors with stable status/code/context; do not swallow failures.

## Data and performance

- Run `generate:types` after schema changes and `generate:importmap` after component mapping changes.
- Never hand-edit `src/payload-types.ts`, Admin import maps, `.next`, or other generated output.
- Pass explicit `depth`, `limit`, `select`, pagination, and query constraints; avoid unbounded reads and N+1 access checks.
- Prefer Server Components. Add `"use client"` only for state, effects, event handlers, or browser APIs.
- Keep collections, access rules, hooks, and reusable fields in clear owners.

## Verification

```sh
pnpm exec ultracite check <changed-paths> # advisory
pnpm exec tsc --noEmit -p scripts/typescript/projects/apps/payload/tsconfig.json
pnpm exec tsgo --noEmit -p scripts/typescript/projects/apps/payload/tsconfig.json
pnpm -C apps/payload test:int
pnpm -C apps/payload build
```

After schema/component-map changes, regenerate first and verify the generated diff instead of patching it.
