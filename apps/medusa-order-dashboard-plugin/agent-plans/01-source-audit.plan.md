---
name: "Order dashboard plugin - source audit"
overview: "Lock canonical requirements, image evidence, current implementation inventory, and the plugin Admin UI route target before feature code expands."
todos:
  - id: "audit-canonical-sources"
    content: "Read the clean local Notion exports under apps/admin/local when available, using dashboard-objednavek-test-2.md as the primary source."
    status: pending
  - id: "map-image-evidence"
    content: "Create or update an acceptance matrix for the referenced dashboard images, with owner lane and defer/block decisions."
    status: pending
  - id: "inventory-plugin-and-backend-surfaces"
    content: "Inventory plugin Admin route files plus existing medusa-be Admin routes/endpoints related to orders, labels, statuses, and customers."
    status: pending
  - id: "lock-plugin-target"
    content: "Record that the dashboard is implemented in apps/medusa-order-dashboard-plugin/src/admin and registered by apps/medusa-be."
    status: pending
  - id: "name-reuse-and-discard"
    content: "List reusable code, code to refactor, and code to de-prioritize without deleting unrelated admin work."
    status: pending
isProject: false
---

# Source Audit

The decision is:

- Build the unified order dashboard in `apps/medusa-order-dashboard-plugin/src/admin`.
- Register the plugin from `apps/medusa-be`; do not implement the UI directly in `apps/medusa-be/src/admin`.
- Do not build this feature primarily in standalone `apps/admin`.
- Keep existing backend Admin endpoints unless a documented backend gap requires separate backend work.

Preserve these requirements:

- Unify Packeta Labels, Order Operations, and Orders into one operational dashboard.
- Filters must be visibly and semantically separated from row actions.
- Sorting and filtering must be backed by the data contract where backend support exists.
- The table must show payment method, shipping method/carrier, order number, customer, status, total, and action markers.
- UI must be localized through Medusa Admin translations exposed by the plugin.
- The goal is a Medusa Admin UI route, not a new admin shell.

