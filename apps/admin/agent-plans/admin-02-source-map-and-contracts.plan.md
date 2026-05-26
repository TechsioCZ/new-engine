---
name: Admin 02 - Source Map and Shared Contracts
overview: Build the source map and shared API/type/rule contracts that later parity lanes depend on.
todos:
  - id: medusa-route-map
    content: "Map default Medusa dashboard routes/components for settings, orders, products, customers, and extensions from the local Medusa clone."
    status: completed
  - id: admin-api-map
    content: "Map Admin API endpoints, fields, filters, mutations, and auth expectations needed by the first parity lanes."
    status: completed
  - id: project-custom-map
    content: "Map existing project custom admin endpoints in medusa-be for emails, Packeta, PPL, Payload, QR payments, producers, and order operations."
    status: completed
  - id: shared-types
    content: "Stabilize shared admin types, query keys, response normalization, and business rules before domain lanes widen."
    status: completed
isProject: false
---

# Admin 02 - Source Map and Shared Contracts

## Execution Notes

This is the main merge hotspot. It should be owned by one operator because it affects every domain lane.

## Constraints

- Do not implement large screens here.
- Do not rewrite page UI just to clean up types.
- Do not guess endpoint semantics when local Medusa source or backend code can be inspected.

## Operator Guidance

After this lane, domain lanes should be able to implement against known endpoint contracts without each rediscovering the same source paths.
