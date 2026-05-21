# Custom Admin Parity Roadmap

## Goal

Build `apps/admin` as the full operational replacement for the Medusa Admin UI, not as a fork and not as a launcher back into the old dashboard.

The new admin must keep the custom UX requirement already shipped:

- sidebar badge for orders that need manual admin action,
- sidebar badge for pending B2B customer approvals,
- badge count refreshed on app load / browser refresh,
- sidebar click opens the same filtered list that the badge counts.

## Current State

`apps/admin` is a standalone Vite + React admin shell using `@techsio/ui-kit`, Medusa Admin API calls, and token-based Medusa auth.

Implemented:

- login against `/auth/user/emailpass`,
- authenticated `/admin/*` fetch client,
- sidebar shell and navigation,
- action-required order badge and list,
- pending B2B customer badge and list,
- product catalog list with search and pagination,
- ZaneOps Docker deployment through Caddy.

Not implemented yet:

- most core Medusa create/edit/detail workflows,
- most Medusa settings workflows,
- custom extension screens beyond placeholder routes,
- former Medusa Admin widgets as first-class detail sections in the new admin.

## Source Baseline

Official docs:

- Medusa Admin API reference: https://docs.medusajs.com/api/admin
- Medusa auth route flow: https://docs.medusajs.com/resources/commerce-modules/auth/authentication-route
- Medusa Admin UI routes: https://docs-v2-tau.vercel.app/learn/fundamentals/admin/ui-routes

Local source references:

- Core Medusa dashboard routes: `C:/Users/pisez/.local/share/medusajs/medusa/packages/admin/dashboard/src/dashboard-app/routes/get-route.map.tsx`
- Current custom admin app: `apps/admin/src`
- Existing backend custom admin routes: `apps/medusa-be/src/admin/routes`
- Existing backend custom admin widgets: `apps/medusa-be/src/admin/widgets`
- Existing backend custom admin API routes: `apps/medusa-be/src/api/admin`

Relevant skill discovered:

- `medusajs/medusa-agent-skills@building-admin-dashboard-customizations`
- Install command: `npx skills add medusajs/medusa-agent-skills@building-admin-dashboard-customizations -g -y`

## Parity Matrix

### Wave 1: Operational Read Parity

Purpose: make the new admin useful as the default daily dashboard without enabling risky write flows yet.

| Area | Required screens | Existing API surface | Current state | Target |
| --- | --- | --- | --- | --- |
| Orders | normal list, action-required list, detail shell | `/admin/orders`, custom order endpoints | action-required list only | list + detail read-only |
| Customers | normal list, B2B pending list, detail shell | `/admin/customers` | B2B pending list only | list + detail read-only |
| Products | list, detail shell | `/admin/products`, custom product-producers endpoint | list only | list + detail read-only |
| Emails | email log list, detail drawer/page | `/admin/email-logs`, `/admin/email-logs/:id` | placeholder | port custom route |
| Packeta Labels | order picker, label format, PDF download | `/admin/packeta-labels`, `/admin/orders` | placeholder | port custom route |
| Order Operations | expedition list, filters, carriers | `/admin/order-expedition/orders`, `/admin/order-expedition/carriers`, `/admin/order-business-statuses/by-ids` | placeholder | read/list first |

### Wave 2: Custom Operational Writes

Purpose: restore the workflows that are specific to this project and likely used by operators.

| Area | Write workflows | Existing API surface | Notes |
| --- | --- | --- | --- |
| Order Operations | bulk PDF, bulk status update, business status update | `/admin/order-expedition/pdf`, `/admin/order-expedition/status`, `/admin/orders/:id/business-status`, `/admin/order-business-statuses/bulk` | needs file download helpers and confirmation states |
| Order Emails | manual email send, templates, unpaid reminders | `/admin/orders/:id/email`, `/admin/orders/email-templates`, `/admin/orders/payment-reminders/unpaid` | old widget becomes order detail section + order list panel |
| Commercial Values | preview and confirm commercial values | `/admin/orders/:id/commercial-values`, `/preview`, `/confirm` | high-risk money flow, implement after detail shell is stable |
| Packeta Config | edit sender/API config | `/admin/packeta-config` | settings page |
| PPL Config | edit sender/API config | `/admin/ppl-config` | settings page |
| QR Payments | edit QR payment config | `/admin/qr-payment-config` | settings page |
| Payload | SSO/link/embed behavior | `/admin/payload/config`, `/admin/payload/sso` | check UX and origin behavior carefully |

### Wave 3: Core Medusa Write Parity

Purpose: close the gap with the standard Medusa dashboard for catalog and commerce administration.

| Area | Core Medusa parity |
| --- | --- |
| Products | create, edit, variants, media, prices, stock, metadata, import, export |
| Categories | list, detail, create/edit, rich description editor |
| Inventory | list, detail, stock, locations |
| Orders | fulfillment, shipments, returns, claims, exchanges, edits, refund, transfer, metadata |
| Customers | create/edit, addresses, groups, metadata |
| Promotions | campaigns, promotions, add to campaign, budget/config |
| Price Lists | create/edit/config/products |
| Settings | store, users, regions, tax, shipping, return/refund reasons, API keys, workflows, translations |

### Wave 4: Content and Search Extensions

Purpose: finish sections that may come from plugins or external services rather than only local custom routes.

| Area | Open mapping |
| --- | --- |
| Content | identify whether old UI comes from `medusa-plugin-content`, Payload, or another plugin bundle |
| Image Gallery | identify plugin/admin route and API surface |
| Meilisearch | decide if this is a settings/status page or only backend job visibility |

## Former Widget Mapping

Old Medusa Admin widgets must become normal sections in the new app:

| Old widget | Zone | New admin target |
| --- | --- | --- |
| `order-payment-reminder.tsx` | `order.list.before`, `order.details.side.before` | Orders list panel + order detail side section |
| `order-commercial-values.tsx` | `order.details.side.before` | Order detail commercial values section |
| `product-description-editor.tsx` | `product.details.before` | Product detail/editor content section |
| `product-producers.tsx` | `product.details.side.after` | Product detail producer section |
| `category-description-editor.tsx` | `product_category.details.before` | Category detail/editor content section |

## UX Direction

Tone: dense operational admin, not marketing UI.

Principles:

- Keep workflows fast and scan-friendly.
- Prefer tables, filters, drawers, segmented controls, icon buttons, and inline status chips.
- Do not hide operational actions behind decorative cards.
- Preserve exact data visibility before redesigning the workflow.
- Use `libs/ui` primitives where available; add missing shared primitives only when they reduce repeated admin code.
- Badge UX remains high-signal: exact numbers, hidden at zero, no realtime requirement.

## Subagent Graph Plan

Do not launch overlapping writers against `apps/admin/src/admin-api.ts`, `apps/admin/src/admin-pages.tsx`, or central routing at the same time. These are hotspots.

### Wave 1 Graph

Critical path stays with the primary agent:

1. Define admin page primitives and API helper seams.
2. Implement one complete slice.
3. Verify with typecheck/build and deployed backend.

Parallel sidecar lanes are useful only after shared seams are stable:

| Node | Mode | Ownership | Output |
| --- | --- | --- | --- |
| Core route scout | read-only | Medusa core route map and Admin API docs | route/endpoint checklist for products, orders, customers |
| Custom route scout | read-only | `apps/medusa-be/src/admin/routes` and `apps/medusa-be/src/api/admin` | endpoint/flow checklist for emails, Packeta, order operations |
| UI primitive worker | write-capable after seam approval | new reusable table/detail/drawer primitives only | admin primitives with no business fetches |
| Feature worker | write-capable, one feature at a time | one route folder / one page slice | complete feature screen with tests/checks |

### First Implementation Slice

Recommended next slice:

1. Port `Emails` first.
2. It is bounded, read-heavy, already has deployed endpoints, and does not mutate orders/products.
3. It will force reusable admin patterns: table, pagination, detail panel, JSON/detail rendering, error states.

Acceptance for the Emails slice:

- `/emails` shows email logs from `/admin/email-logs`.
- Pagination uses `limit` and `offset`.
- Selecting a log loads `/admin/email-logs/:id`.
- Empty/loading/error states match the admin shell.
- Auth expiry still redirects to login.
- `pnpm --dir apps/admin run typecheck` passes.
- `pnpm --dir apps/admin run build` passes.

## Risks and Rules

- Do not implement fallback proxies or CORS workarounds in `apps/admin`; backend CORS must be configured explicitly.
- Do not link users back to the old Medusa Admin as the final UX.
- Do not edit `medusa-be` unless the frontend cannot implement a required workflow with existing endpoints and this is confirmed.
- Do not migrate product metadata from `product.metadata.*` during admin parity work; that is a backend/data-model lane.
- Treat money/order mutation workflows as high risk and implement them only after read/detail parity exists.

