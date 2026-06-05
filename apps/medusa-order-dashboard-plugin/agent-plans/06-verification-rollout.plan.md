---
name: "Order dashboard plugin - verification rollout"
overview: "Verify the plugin Admin dashboard against canonical requirements, image acceptance matrix, graph state, non-destructive smoke scenarios, and rollout risks."
todos:
  - id: "run-static-checks"
    content: "Run narrow plugin type, build, Medusa admin-only build, and Biome checks for changed plugin/registration files."
    status: pending
  - id: "smoke-plugin-admin-route"
    content: "Smoke-test the Medusa Admin route loading, filters, sorting, pagination, selection, detail flow, bulk actions, and export paths with non-destructive data."
    status: pending
  - id: "verify-source-matrix"
    content: "Compare implementation against dashboard image issues plus related dashboard and badge requirements."
    status: pending
  - id: "verify-rollout-path"
    content: "Confirm legacy routes remain reachable or intentionally redirected, and document migration from Packeta Labels and Order Operations."
    status: pending
  - id: "prepare-handoff"
    content: "Write final notes covering implemented behavior, deferred gaps, product questions, risks, and recommended next graph frontier."
    status: pending
isProject: false
---

# Verification And Rollout

Use non-destructive test data only.

Static checks:

- `pnpm.cmd --dir apps/medusa-order-dashboard-plugin run typecheck`
- `pnpm.cmd --dir apps/medusa-order-dashboard-plugin run build`
- `pnpm.cmd --dir apps/medusa-be exec medusa build --admin-only`
- `pnpm.cmd exec biome check --write <changed files>`

Do not remove legacy order routes in the same change unless the plugin route has verified parity and the user explicitly wants cleanup.
