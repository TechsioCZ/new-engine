---
name: "Order dashboard plugin - actions detail export"
overview: "Consolidate row detail, bulk order operations, Packeta/PPL label handling, PDF export behavior, filenames, and destructive-action safeguards."
todos:
  - id: "implement-detail-flow"
    content: "Add a row detail drawer, expansion, or drill-in that exposes items, shipment, payment, labels, note, and useful history from the shared row/detail contract."
    status: pending
  - id: "consolidate-bulk-actions"
    content: "Move order operations and label actions into selected-row action controls that are distinct from filters and show exact selected/eligible counts."
    status: pending
  - id: "implement-export-modes"
    content: "Support combined PDF and separate-per-order export modes when multiple orders are selected, with stable filenames or explicit backend gap notes."
    status: pending
  - id: "handle-label-providers"
    content: "Integrate existing Packeta behavior and leave a clear extension point or gap note for PPL and other carriers."
    status: pending
  - id: "resolve-storno-delete-undo"
    content: "Treat cancel/storno as the supported destructive path, keep deletion blocked unless approved, and document undo or rollback limitations."
    status: pending
isProject: false
---

# Actions, Detail, And Export

Bulk actions must show selected count and eligible count separately, explain skipped rows before mutation, refetch dashboard data after success, and use Medusa UI feedback patterns.

Default destructive policy:

- deletion is out of scope unless product explicitly approves it
- storno/cancel is the supported path
- undo is not promised unless backend provides an atomic reversible workflow
- destructive actions require confirmation and recovery guidance

