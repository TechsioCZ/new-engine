# Order Dashboard Plugin Plan Graph

Primary target: `apps/medusa-order-dashboard-plugin/src/admin` as a Medusa plugin Admin UI route.

`apps/medusa-be` remains the Medusa host application. It should only register `medusa-order-dashboard-plugin`, declare the workspace dependency, and continue exposing the existing Admin API endpoints unless a separate backend-gap task is approved.

## Source of Truth

Use the sources in this priority order:

1. Current plugin source under `../src/admin`.
2. Local ticket exports under `../../admin/local`, when available locally.
3. Existing backend Admin endpoints under `../../medusa-be/src/api/admin`.
4. Existing Medusa Admin customizations under `../../medusa-be/src/admin` as compatibility/reference only.
5. Official Medusa plugin and Admin UI route documentation.

## Architecture Decision

Do not restart the whole admin from zero. Build the order dashboard surface inside this internal Medusa plugin.

Keep:

- `apps/medusa-order-dashboard-plugin/src/admin` as the UI implementation owner.
- existing backend Admin endpoints for order expedition, Packeta labels, order business statuses, and commercial values.
- `apps/medusa-be` registration and dependency changes as the only default backend-app changes.
- `apps/admin` and `apps/medusa-be/src/admin` as historical/reference surfaces.

Replace or de-prioritize:

- standalone `apps/admin` as the primary delivery path.
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
pnpm.cmd exec biome check --write apps/medusa-order-dashboard-plugin apps/medusa-be/medusa-config.ts apps/medusa-be/package.json
```

Run browser smoke checks only after the local Medusa Admin can load and the route is reachable with non-destructive data.
