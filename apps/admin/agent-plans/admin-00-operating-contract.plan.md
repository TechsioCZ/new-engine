---
name: Admin 00 - Operating Contract
overview: Lock the admin product direction, scope boundaries, source-of-truth order, and cut rules before widening workflow parity work.
todos:
  - id: product-direction
    content: "Confirm the direction: custom apps/admin replaces the default Medusa dashboard over time without forking Medusa Admin."
    status: completed
  - id: scope-boundary
    content: "Confirm frontend-first scope: use existing Medusa Admin API by default and document backend gaps before touching medusa-be."
    status: completed
  - id: source-order
    content: "Confirm source order: current app, official Medusa docs, local Medusa dashboard clone, project backend custom routes, repo-local skills."
    status: completed
  - id: cut-rules
    content: "Lock cut order: broad redesign and rare settings screens are cut before orders/products/customers operational workflows."
    status: completed
isProject: false
---

# Admin 00 - Operating Contract

## Execution Notes

This is a short alignment gate. It should produce a shared sentence for the team: we are building a custom New Engine admin that uses Medusa Admin APIs and project extensions, not a forked Medusa dashboard.

## Constraints

- Do not begin broad parity work until backend boundaries are explicit.
- Do not add fake production data or frontend-only workarounds for missing backend configuration.
- Do not allow visual redesign to block operational parity.

## Operator Guidance

If this plan is not accepted, pause implementation and update `apps/admin/AGENTS.md` first.
