# Order Dashboard Plugin Plan Graph

Primary target: `apps/medusa-order-dashboard-plugin/src/admin` as a Medusa plugin Admin UI route.

`apps/medusa-be` remains the Medusa host application. It should only register `medusa-order-dashboard-plugin`, declare the workspace dependency, and continue exposing the existing Admin API endpoints unless a separate backend-gap task is approved.

## Source of Truth

Use the sources in this priority order:

1. Local ticket exports under `../local`.
2. Current plugin source under `../src/admin`.
3. Existing backend Admin endpoints under `../../medusa-be/src/api/admin`.
4. Existing Medusa Admin customizations under `../../medusa-be/src/admin` as compatibility/reference only.
5. Official Medusa plugin and Admin UI route documentation.

## Architecture Decision

Do not restart the whole admin from zero. Build the order dashboard surface inside this internal Medusa plugin.

Keep:

- `apps/medusa-order-dashboard-plugin/src/admin` as the UI implementation owner.
- existing backend Admin endpoints for order expedition, Packeta labels, order business statuses, and commercial values.
- `apps/medusa-be` registration and dependency changes as the only default backend-app changes.
- `apps/medusa-be/src/admin` as a compatibility/reference surface.
- `apps/admin` as a legacy sketch only, not the acceptance target.

Replace or de-prioritize:

- standalone `apps/admin` as the primary delivery path or acceptance target.
- direct implementation under `apps/medusa-be/src/admin/routes/order-dashboard`.
- duplicated order operations screens once the plugin route has verified parity.
- text copied from Notion with broken encoding.

## Plan Selection

Use this exact selection:

```powershell
python .codex\skills\plan-graph\scripts\plan_graph.py validate --plans-root apps\medusa-order-dashboard-plugin\agent-plans --glob "*.plan.md" --state-dir apps\medusa-order-dashboard-plugin\plan-graphs `
  --depends 01-source-audit:02-data-contract `
  --depends 02-data-contract:03-table-shell `
  --depends 02-data-contract:04-actions-detail-export `
  --depends 03-table-shell:05-i18n-ux-polish `
  --depends 04-actions-detail-export:05-i18n-ux-polish `
  --depends 05-i18n-ux-polish:06-verification-rollout
```

## Dependency Graph

- `01-source-audit` -> `02-data-contract`
- `02-data-contract` -> `03-table-shell`
- `02-data-contract` -> `04-actions-detail-export`
- `03-table-shell` -> `05-i18n-ux-polish`
- `04-actions-detail-export` -> `05-i18n-ux-polish`
- `05-i18n-ux-polish` -> `06-verification-rollout`

## Lane Summary

- `01-source-audit`: Lock requirements, current implementation inventory, image evidence, and plugin target.
- `02-data-contract`: Define row DTO, query state, mutation/export contracts, and backend gaps.
- `03-table-shell`: Build the plugin Admin route and table UX with separated filters/actions.
- `04-actions-detail-export`: Consolidate detail, bulk operations, labels, PDF export, and destructive-action safeguards.
- `05-i18n-ux-polish`: Apply Medusa Admin translations, terminology, badge semantics, UX polish, and accessibility.
- `06-verification-rollout`: Verify plugin build, Medusa Admin consumption, smoke scenarios, source matrix, and rollout risks.

## Current Status And Next Frontier

Status as of 2026-06-03:

- The graph validates, but all plan todos are still marked `pending`; the executable frontier remains `01-source-audit`.
- The plugin route is no longer a blank slate. `src/admin/routes/order-dashboard` already contains local DTOs, API fetchers, formatting helpers, i18n resources, and a Medusa UI `DataTable` page.
- The current plugin page covers basic order listing, carrier and business-status filters, client-side sort on the current page, row selection, bulk Medusa status update, bulk manual business-status update, expedition PDF download, and Packeta label download.
- The target operational model is the historical order overview screen: status queues/tabs with counts above one dense table, bulk action controls above selected rows, and all common order operations available from one dashboard screen.
- Existing backend surfaces already cover `GET /admin/order-expedition/orders`, `POST /admin/order-expedition/status`, `POST /admin/order-expedition/pdf`, `POST /admin/order-business-statuses/bulk`, and `POST /admin/packeta-labels`.
- Local canonical ticket exports are present under `apps/medusa-order-dashboard-plugin/local`; `01-source-audit` should start from those notes and images, not from `apps/admin`.
- Local smoke testing proved the Admin route can load, but only after temporary dev-environment workarounds. Treat `mise` availability, `.env` variable drift, Meilisearch reset, and workspace plugin linking as development-readiness issues, not product dashboard behavior.

Implementation cutline:

1. Unblock repeatable local integration before feature work: fix the workspace install/lockfile so `medusa-be` resolves `medusa-order-dashboard-plugin` without a manual `node_modules` symlink, and align local `.env` names for Redis, Meilisearch, notification provider, and superadmin bootstrap.
2. Finish `01-source-audit`: read `apps/medusa-order-dashboard-plugin/local`, map the referenced images and notes to the plugin target, inventory existing backend endpoints, and record the concrete acceptance matrix.
3. Harden `02-data-contract`: decide which filters, status queues, sorting, search, counts, row detail fields, label availability, skipped-row reasons, and export modes are authoritative backend contract fields instead of React-only derivations.
4. Execute `03-table-shell` and `04-actions-detail-export` together only after the data contract is stable: add status queue tabs, dashboard badge counts, detail flow, eligible counts, blocked/skipped-row UX, server-backed sort/filter gaps, manual cancel/storno, and explicit combined-vs-per-order export behavior.
5. Run `05-i18n-ux-polish`: replace ASCII Czech placeholders, remove hardcoded English visible copy, verify Medusa UI semantics, use human labels for statuses/payments/carriers, and document sidebar or dashboard badge limits if native Admin extension points cannot match the ticket exactly.
6. Close with `06-verification-rollout`: plugin typecheck/build, Medusa admin-only build, relevant backend unit tests, authenticated Admin smoke with non-destructive order data, and handoff notes for any deferred backend gaps.

Backend gap candidates to document before implementation:

- Server-backed sorting/search is not currently part of `GET /admin/order-expedition/orders`.
- Server-backed status queue counts are not currently exposed for queues such as unhandled, accepted payment, resolved, waiting internally, waiting for payment, and storno.
- Carrier and business-status filtering currently scans order pages and can return truncated metadata after the scan cap.
- The dashboard response does not yet expose a dedicated row-detail contract, label availability by provider, per-row action eligibility, or export-mode metadata.
- Packeta labels are implemented; PPL and other carrier label flows need either explicit endpoint contracts or documented deferral.
- Destructive action UX should stay on supported cancel/storno paths unless product approves deletion and a backend workflow contract exists.

## Conflict Hotspots

- `apps/medusa-order-dashboard-plugin/src/admin/routes/order-dashboard/*`
- `apps/medusa-order-dashboard-plugin/src/admin/i18n/index.ts`
- `apps/medusa-order-dashboard-plugin/package.json`
- `apps/medusa-be/medusa-config.ts`
- `apps/medusa-be/package.json`
- existing backend endpoints under `apps/medusa-be/src/api/admin/order-expedition`, `order-business-statuses`, and `packeta-labels`

Do not let multiple agents independently rewrite shared order DTOs, query keys, i18n namespaces, endpoint contracts, or plugin package exports.

## Verification Commands

Use narrow checks first:

```powershell
pnpm.cmd --dir apps/medusa-order-dashboard-plugin run typecheck
pnpm.cmd --dir apps/medusa-order-dashboard-plugin run build
pnpm.cmd --dir apps/medusa-be exec medusa build --admin-only
pnpm.cmd exec biome check --write <changed plugin files> <changed medusa-be files>
```

Run browser smoke checks only after the local Medusa Admin can load and the route is reachable with non-destructive data.
