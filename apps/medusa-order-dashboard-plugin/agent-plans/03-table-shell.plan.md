---
name: "Order dashboard plugin - table shell"
overview: "Build the plugin Medusa Admin route and dense operational table with separated filters/actions, sortable columns, pagination, and row selection."
todos:
  - id: "choose-table-implementation"
    content: "Use Medusa UI primitives unless the source audit proves a stronger need for TanStack Table or VTable and package changes are approved."
    status: pending
  - id: "create-plugin-route"
    content: "Create or refine the plugin Admin order dashboard route with defineRouteConfig and consistent navigation/title naming."
    status: pending
  - id: "implement-table-state"
    content: "Implement columns, filters, sorting, pagination, selection, loading, empty, error, and reproducible state from the shared data contract."
    status: pending
  - id: "separate-filters-actions"
    content: "Place filters and bulk actions in separate visual and semantic regions so carrier filtering cannot be confused with selected-row actions."
    status: pending
  - id: "add-row-detail-entry"
    content: "Provide a clear row click, expansion, drawer, or detail entry point for items and more order information."
    status: pending
isProject: false
---

# Table Shell

Use the plugin route under `src/admin/routes/order-dashboard`.

Default to Medusa Admin-compatible UI. TanStack Table or VTable is allowed only with a documented reason, package-manager install, and successful plugin/Admin build verification.

Required behavior:

- visible pagination and page size behavior
- stable selection semantics
- sort indicators on sortable columns
- disabled state only for unavailable controls
- loading, empty, and error states that keep layout stable
- no duplicated cancellation indicator
- no mixed Czech/English visible copy

