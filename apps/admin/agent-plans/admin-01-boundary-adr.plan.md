---
name: Admin 01 - Boundary ADR and Guardrails
overview: Keep the admin scope safe by recording backend, UI kit, Medusa parity, and verification rules in an ADR and app-scoped agent guidance.
todos:
  - id: adr
    content: "Maintain the admin boundary ADR covering apps/admin scope, backend-gap rules, UI kit usage, and Medusa parity meaning."
    status: completed
  - id: agents
    content: "Maintain apps/admin/AGENTS.md with guardrails for sources, UI kit rules, planning, verification, and backend escalation."
    status: completed
  - id: skill-policy
    content: "Document when to load Medusa, source-driven, UI kit, plan-graph, dag, simplify, and testing skills."
    status: completed
  - id: unsafe-patterns
    content: "List prohibited patterns: CORS workarounds, fake data, unmanaged local primitives, backend edits without a gap, and broad redesign drift."
    status: completed
isProject: false
---

# Admin 01 - Boundary ADR and Guardrails

## Execution Notes

This lane owns the written operating rules. Other lanes consume these rules and should propose changes here rather than inventing new local conventions.

## Constraints

- Keep guardrails short enough that future agents will actually read them.
- Do not encode one-off implementation details as permanent rules.
- Do not import rules from the inspiration project without adapting them to this monorepo.

## Operator Guidance

If a later implementation lane needs a new exception, update this ADR in the same change.
