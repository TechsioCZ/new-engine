---
name: "Order dashboard plugin - data contract"
overview: "Define the plugin feature boundary, dashboard row model, query contract, mutation contract, and backend gaps before UI and action work fan out."
todos:
  - id: "define-feature-boundary"
    content: "Keep the dashboard feature boundary inside apps/medusa-order-dashboard-plugin/src/admin without expanding standalone apps/admin or direct medusa-be Admin route code."
    status: pending
  - id: "define-order-row-dto"
    content: "Define one canonical dashboard row DTO with order number, dates, customer, payment, shipping, carrier, status, total, markers, and action eligibility."
    status: pending
  - id: "define-query-state"
    content: "Define URL-addressable filters, sorting, pagination, view chips, counts, and query keys that can be served by existing or approved Admin endpoints."
    status: pending
  - id: "define-mutations-and-exports"
    content: "Define bulk status changes, label generation, export modes, row detail refresh, and destructive-action contracts without duplicating backend business rules in React."
    status: pending
  - id: "document-backend-gaps"
    content: "Document exact missing endpoint fields, request shapes, response shapes, and blocked UI behavior before backend implementation proceeds."
    status: pending
isProject: false
---

# Data Contract

Preferred source shape:

- `src/admin/routes/order-dashboard/types.ts`
- `src/admin/routes/order-dashboard/api.ts`
- `src/admin/routes/order-dashboard/format.ts`
- `src/admin/routes/order-dashboard/i18n.ts`
- `src/admin/routes/order-dashboard/page.tsx`

If the route outgrows this local shape, extract to `src/admin/features/order-dashboard/*` before adding unrelated concerns to one large page file.

Use `@medusajs/ui`, `@medusajs/icons`, `@medusajs/js-sdk`, `@tanstack/react-query`, and `react-i18next`. Do not copy the custom `apps/admin` shell or introduce `libs/ui` unless explicitly approved.

