---
name: Admin 06 - Customers and B2B Workflow
overview: Complete customer visibility and B2B approval workflows around the original badge requirement.
todos:
  - id: customer-source-map
    content: "Map default Medusa customer list/detail routes and project-specific B2B customer metadata/status conventions."
    status: completed
  - id: detail-completeness
    content: "Add customer detail read view for identity, contact, groups/company data, addresses, orders, metadata, and B2B status."
    status: completed
  - id: b2b-filter
    content: "Keep the B2B pending filter and sidebar badge aligned with the RAW acceptance criteria."
    status: in_progress
  - id: approval-actions
    content: "Add approve/reject actions only after existing backend semantics or required backend gap are documented."
    status: pending
isProject: false
---

# Admin 06 - Customers and B2B Workflow

## Execution Notes

This lane directly extends the original customer badge requirement. The approval process is not part of the original MVP, so it needs explicit endpoint/source mapping.

## Constraints

- Do not count B2C customers in the B2B badge.
- Do not invent B2B status fields without checking deployed data and backend conventions.
- Do not silently hide pending customers when metadata is incomplete; surface unknown states.

## Operator Guidance

If approval needs backend support, document the minimal mutation endpoint before editing `medusa-be`.
