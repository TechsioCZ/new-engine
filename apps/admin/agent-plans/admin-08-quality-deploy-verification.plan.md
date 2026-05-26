---
name: Admin 08 - Quality, Deploy, and Verification
overview: Integrate finished lanes, verify against deployed backend, and keep the admin safe to review on ZaneOps.
todos:
  - id: static-checks
    content: "Run targeted Biome, typecheck, and build for apps/admin changes."
    status: pending
  - id: smoke-matrix
    content: "Maintain a smoke matrix covering login, badges, orders, products, catalog taxonomy, customers, settings, and extension screens."
    status: pending
  - id: deployed-backend
    content: "Verify key workflows against the deployed test backend and record any backend config gaps."
    status: pending
  - id: handoff
    content: "Write PR/deploy notes with scope, tested routes, risky actions not executed, and next lanes."
    status: pending
isProject: false
---

# Admin 08 - Quality, Deploy, and Verification

## Execution Notes

This lane verifies completed work. It should not become a place to finish half-implemented features.

## Constraints

- Do not run destructive deployed-data actions without explicit approval.
- Do not claim full parity without listing remaining gaps.
- Do not ignore console/network errors from core screens.

## Operator Guidance

For substantial UI work, browser smoke against the deployed backend is part of done.
