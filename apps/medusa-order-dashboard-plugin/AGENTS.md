# Medusa Order Dashboard Plugin

Internal Medusa 2.17 Admin plugin. Default write scope is this package; backend changes require a proven API/workflow gap.

## Boundaries

- Admin source belongs under `src/admin/**`; keep the route at `src/admin/routes/order-dashboard/page.tsx` unless feature-local extraction is justified.
- Register/consume the plugin by package name. Never edit `.medusa` output.
- Use Medusa Admin-compatible packages (`@medusajs/ui`, icons, admin SDK, React Query); do not use `@techsio/ui-kit` without explicit scope and bundling verification.
- Same-origin Admin requests use session authentication. Keep endpoint contracts, query keys, types, formatters, and eligibility rules in clear local owners.

## Product and correctness

- Build a dense operational surface, not a marketing layout.
- Cover loading, empty, error, pagination, filtering, selection, and stable counts.
- Visible strings belong in Admin i18n resources; Czech text requires correct diacritics.
- External responses are `unknown` until validated. No `any`, double casts, `@ts-ignore`, or duplicated backend business rules.
- Keep authoritative mutations atomic, permission-checked, and server-side.

## Verification

```sh
pnpm exec ultracite check <changed-paths> # advisory
pnpm exec tsc --noEmit -p scripts/typescript/projects/apps/medusa-order-dashboard-plugin/tsconfig.json
pnpm exec tsgo --noEmit -p scripts/typescript/projects/apps/medusa-order-dashboard-plugin/tsconfig.json
pnpm -C apps/medusa-order-dashboard-plugin lint:medusa
pnpm -C apps/medusa-order-dashboard-plugin build
```

For registration/Admin integration, also run `pnpm -C apps/medusa-be exec medusa build --admin-only` and the relevant browser smoke test.
