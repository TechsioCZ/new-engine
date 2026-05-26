---
name: Admin 07 - Extensions Workflow Parity
overview: Bring project-specific extension screens to operational parity: emails, Packeta, PPL, Payload, QR payments, Meilisearch, producers, content, image gallery, and order operations.
todos:
  - id: endpoint-map
    content: "Map existing project custom admin endpoints and current screens for each extension."
    status: completed
  - id: current-screens
    content: "Harden existing email logs, Packeta labels, PPL, Payload, Packeta config, and QR payment screens."
    status: in_progress
  - id: missing-screens
    content: "Plan and implement missing high-value extension screens: Meilisearch, producers, content, image gallery, and order operations."
    status: pending
  - id: side-effects
    content: "Document mutation side effects and safe smoke-test boundaries for each extension."
    status: pending
isProject: false
---

# Admin 07 - Extensions Workflow Parity

## Execution Notes

These screens are project-specific and should be sourced from current backend routes before UI work.

## Constraints

- Do not treat extension actions as generic CRUD without checking side effects.
- Do not perform live label/email/payment mutations during smoke tests without explicit approval.
- Do not let extension screens define unrelated shared admin components.

## Operator Guidance

Prioritize workflows that operators already use in the default dashboard or current custom admin extensions.
