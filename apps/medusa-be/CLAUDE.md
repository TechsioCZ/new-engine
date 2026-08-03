# Medusa Backend

Medusa 2.17 backend. Source is checked by root TypeScript 7 through `scripts/typescript/projects/apps/medusa-be`; Medusa framework/CLI compiler internals use isolated TypeScript 5.9.3. Do not route source checks through that legacy compiler.

## Architecture

- Modules are isolated. Use Links for associations, Query for reads, and Workflows for cross-module orchestration.
- Keep API validators/middleware beside routes and consume validated request data.
- Use framework constants (`Modules.*`, `ContainerRegistrationKeys.*`) instead of hard-coded container keys.
- Keep pure business rules separate from framework/runtime wiring.
- Background work, database reads, batches, retries, polling, and external calls require explicit bounds and termination behavior.

## Safety

- External input, JSON columns, SDK responses, and environment values begin as `unknown`; validate/narrow before use.
- No `any`, double casts, `@ts-ignore`, swallowed failures, or message-string matching where typed errors exist.
- Use typed `MedusaError` categories/codes and include actionable context.
- Centralize money conversion, rounding, allocation, tax, and totals in tested domain owners.
- Generate migrations with Medusa CLI; never edit committed migration history or `.medusa` output.
- Use locks for overlapping jobs and preserve rollback/compensation semantics in workflows.

## Commands

```sh
pnpm exec ultracite check <changed-paths> # advisory
pnpm exec tsc --noEmit -p scripts/typescript/projects/apps/medusa-be/tsconfig.json
pnpm exec tsgo --noEmit -p scripts/typescript/projects/apps/medusa-be/tsconfig.json
pnpm exec tsc --noEmit -p scripts/typescript/projects/apps/medusa-be/src/admin/tsconfig.json
pnpm exec tsgo --noEmit -p scripts/typescript/projects/apps/medusa-be/src/admin/tsconfig.json
pnpm -C apps/medusa-be lint:medusa
pnpm -C apps/medusa-be test:unit
pnpm -C apps/medusa-be test:integration:modules
pnpm -C apps/medusa-be test:integration:http
```

Use `pnpm -C apps/medusa-be exec medusa db:generate <module>` for migrations. Use the narrowest relevant tests; HTTP/business/security behavior needs integration coverage.
