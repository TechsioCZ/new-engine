---
name: Admin 03 - Shell and Settings Parity
overview: Reproduce the default dashboard shell and settings workflows that make the custom admin feel like a complete admin surface.
todos:
  - id: account-menu
    content: "Implement store/account menu behavior including store settings entry and logout parity."
    status: completed
  - id: settings-nav
    content: "Implement settings navigation groups: General, Developer, My Account, and Extensions."
    status: pending
  - id: settings-read
    content: "Add read views for store details, store currencies/locales, metadata/JSON, users, regions, tax regions, reasons, sales channels, product types/tags, locations, translations, API keys, workflows, profile, and extension settings as supported by current API."
    status: in_progress
  - id: settings-mutations
    content: "Add only the safest high-value settings mutations after source mapping confirms request contracts, starting with store edit and then staged currencies/locales/metadata updates."
    status: pending
isProject: false
---

# Admin 03 - Shell and Settings Parity

## Execution Notes

This lane covers the UI shown in the default dashboard screenshots. It should prioritize navigability and visibility before full mutation parity.

Current `feat/admin-shell-settings` checkpoint:

- Done: account menu store summary, Store settings entry, logout behavior, `/settings` route, and `/settings/store` read-only page.
- Done: store read page shows store general fields, currency section, locales section, metadata, and JSON preview.
- Verified on May 22, 2026: `pnpm.cmd --dir apps/admin run typecheck`, `pnpm.cmd --dir apps/admin run build`, and Playwright smoke against `http://localhost:3001/settings/store` with the deployed Medusa backend.
- Deferred: settings group skeleton, broad settings read surfaces, store edit, currency/locales/metadata mutations, and any UI-kit migration that depends on `admin/design`.

Live default-admin validation on the deployed test backend showed that `/app/settings/store` includes:

- Store general read section: name, default currency, default region, default sales channel, and default location.
- Currencies table: code, name, tax-inclusive pricing, search, pagination, add flow, row actions, and selection.
- Locales table: empty state, add flow, search/pagination inside the add dialog.
- Metadata and JSON panels.
- Store edit modal for name, default currency, default region, default sales channel, and default location.

The tax-inclusive pricing column comes from price preference data, so store read parity is not complete until that data path is mapped.

Settings navigation should mirror the default groupings:

- General: Store, Users, Regions, Tax Regions, Return Reasons, Refund Reasons, Sales Channels, Product Types, Product Tags, Locations & Shipping, Translations.
- Developer: Publishable API Keys, Secret API Keys, Workflows.
- My Account: Profile.
- Extensions: PPL, Packeta, Payload, QR platby, Meilisearch.

## Constraints

- Do not block orders/products/customers on rare settings forms.
- Do not add settings forms without confirmed API contracts.
- Keep UI kit usage token-first.

## Operator Guidance

Use the local Medusa dashboard settings route as a workflow reference, not as copied source.

## Branch Guidance

Keep the current internal store/settings work on `feat/admin-shell-settings` while it remains one small reviewable slice. Split to a stacked PR only when adding broad settings CRUD:

- Store read + internal route: keep here, target `feat/admin`.
- Store edit/currencies/locales/metadata mutations: consider `feat/admin-store-settings-mutations`, target `feat/admin-shell-settings`.
- Wider settings sections such as users, regions, API keys, and workflows: consider separate branches per settings group, target `feat/admin`.
