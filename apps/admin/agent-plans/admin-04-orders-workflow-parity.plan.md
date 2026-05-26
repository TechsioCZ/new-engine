---
name: Admin 04 - Orders Workflow Parity
overview: Turn the current order list/detail into a working operational surface for common Medusa and project-specific order workflows.
todos:
  - id: order-source-map
    content: "Map default Medusa order list/detail/actions and project custom order endpoints before adding mutations."
    status: completed
  - id: detail-completeness
    content: "Complete order detail sections for customer, addresses, items, totals, payment, fulfillment, metadata, notes, and linked records."
    status: completed
  - id: safe-actions
    content: "Add safe confirmed actions first: order email send, address/email edits, shipment views, order export, filters/search, project operation links, and non-destructive activity/metadata views."
    status: in_progress
  - id: risky-actions
    content: "Add cancel, capture, fulfill, shipment creation, refund, return, exchange, claim, order edit, transfer, or confirm/receive only after backend contract and deployed-data safety are explicit."
    status: pending
isProject: false
---

# Admin 04 - Orders Workflow Parity

## Execution Notes

Orders are a high-risk workflow. Prefer read completeness and safe actions before destructive mutations.

Live default-admin validation on the deployed test backend showed:

- Orders list has the custom "Order emails" widget above the default table.
- Default order list columns are order, date, customer, sales channel, payment, fulfillment, and order total.
- Default list filters are region, sales channel, created, and updated; export is a modal subroute.
- Order detail sections include active edits/claims/exchanges/returns, general, summary, payments, fulfillment, customer, activity, metadata, and JSON.
- Visible order actions include cancel, capture payment, edit order, create return, create exchange, create claim, fulfillment allocation/creation, shipment creation, receive return, refund, transfer, edit email, edit shipping address, edit billing address, and metadata edit. Some are state-disabled based on order state.
- Project widgets on order pages include order payment reminder and commercial values.

Read/detail parity should be reviewed separately from operational mutations.

## Constraints

- Do not execute destructive actions against deployed data during smoke tests without explicit user approval.
- Do not infer order confirmation semantics from labels alone.
- Keep badge rules aligned with `admin-rules.ts` and the original RAW acceptance criteria.

## Operator Guidance

If a workflow depends on project-specific status logic, map `apps/medusa-be/src/api/admin` before implementing UI.

## Branch Guidance

Use small stacked branches for order mutations because review needs to reason about side effects:

- Read/detail completion and safe links can stay in `feat/admin-orders-workflow`, target `feat/admin`.
- Email reminder and commercial-values widget parity can stay with orders if mounted on order routes; extension list/detail pages remain in Admin 07.
- Capture/fulfillment/refund/return/exchange/claim/cancel/transfer should each be split by workflow family, target `feat/admin-orders-workflow` or `feat/admin` depending on how much shared order UI they need.
