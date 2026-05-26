# apps/admin Agent Guardrails

This app is a custom admin dashboard for the New Engine Medusa stack. It is not a fork of the Medusa Admin package. The goal is full operational replacement over time, built from our own React app, the existing Medusa Admin API, and `libs/ui`.

## Scope Default

- Default write scope is `apps/admin`.
- Treat `libs/ui` as a read-only dependency for ordinary admin work. Inspect its
  source, tokens, and stories to understand the component contract, but do not
  edit `libs/ui` from an `apps/admin` task unless the user explicitly widens the
  scope to shared UI-kit authoring.
- If admin usage exposes a real UI-kit API gap, document the gap and solve the
  current slice inside `apps/admin` with a small adapter or bounded workaround.
  Shared `libs/ui` changes belong in a separate, explicitly scoped task.
- Do not edit `apps/medusa-be` unless the current admin task proves that an existing Admin API or custom endpoint cannot support the required workflow.
- If a backend gap is found, document the exact missing endpoint, request/response shape, and user workflow first. Do not work around missing CORS, auth, or backend behavior with frontend hacks.
- Treat deployed backend compatibility as a first-class constraint. The admin should work against `NEXT_PUBLIC_MEDUSA_BACKEND_URL` without requiring local backend changes for ordinary UI work.

## Required Sources

Before implementing a Medusa admin feature, inspect these sources in this order:

1. Existing `apps/admin` code and current UX behavior.
2. Official Medusa Admin API documentation: `https://docs.medusajs.com/api/admin`.
3. Official Medusa Admin development documentation: `https://docs.medusajs.com/learn/fundamentals/admin`.
4. Local Medusa dashboard source at `~/.local/share/medusajs/medusa/packages/admin/dashboard/src`.
5. Current backend custom admin routes under `apps/medusa-be/src/api/admin` when the workflow is custom to this project.
6. Installed repo-local Medusa skills:
   - `.codex/skills/building-admin-dashboard-customizations`
   - `.codex/skills/building-with-medusa` only when backend work is explicitly in scope.

When official docs, local Medusa dashboard source, and current project code disagree, preserve current project behavior unless the mismatch is a proven bug.

## UI Kit Rules

Use `@techsio/ui-kit` / `libs/ui` first. Before adding custom UI primitives, inspect the local UI-kit adoption skills:

- `.codex/skills/adopting-ui-kit-in-apps/adopt-ui-kit-in-app/SKILL.md`
- `.codex/skills/adopting-ui-kit-in-apps/app-component-inventory/SKILL.md`
- `.codex/skills/adopting-ui-kit-in-apps/component-usage-ux/SKILL.md`
- `.codex/skills/adopting-ui-kit-in-apps/app-token-overrides/SKILL.md`
- `.codex/skills/authoring-ui-kit-components/component-authoring/SKILL.md` only to identify or document a real UI-kit API gap unless the current task explicitly includes shared `libs/ui` edits.

Runtime imports in `apps/admin` must use the published workspace package name:

```typescript
import { Button } from "@techsio/ui-kit/atoms/button"
import { Select } from "@techsio/ui-kit/molecules/select"
```

Do not rewrite app imports to `@libs/ui/...` unless the same change also adds and verifies the package/export/TypeScript/Vite alias contract. `libs/ui` is the source folder and guidance location; `@techsio/ui-kit` is the app import contract.

Token-first, `className` last:

- Component colors, borders, radius, spacing, typography, and states belong in token mappings or component variants.
- Use Tailwind utilities directly in JSX for structural layout and composition when no design token is involved, for example `flex`, `grid`, `flex-col`, `items-center`, `justify-between`, `relative`, or `absolute`.
- When spacing, color, typography, radius, borders, or shadows are involved, use UI-kit token-backed utilities and component props instead of raw app CSS or arbitrary values.
- If the existing token chain already resolves to the desired value, do not add redundant overrides.
- If a required visual state cannot be expressed through tokens or component API, treat it as a UI kit API gap. Add a short local workaround only if needed, and prefer a follow-up UI kit improvement.

Admin app token files live under `apps/admin/src/styles/tokens` and mirror the UI kit token model:

- `index.css` imports Tailwind, `@techsio/ui-kit/tokens`, admin semantic/spacing/typography files, and component overrides.
- `_admin-base.css`, `_admin-colors.css`, `_admin-semantic.css`, `_admin-spacing.css`, `_admin-typography.css`, and `_admin-layout.css` are the default places for app-level visual differences.
- `_admin-colors.css` owns the named admin palette. `_admin-semantic.css` maps UI kit semantic token names such as `--color-primary` and `--color-base` to that palette.
- In the early admin-design phase, duplicate the relevant `libs/ui/src/tokens` contract tokens explicitly even when values currently match the library defaults. This keeps the admin theme inspectable; redundant entries can be removed in a later cleanup pass.
- Before overriding an existing token, inspect the matching chain under `libs/ui/src/tokens` and preserve the library contract.
- App-only layout tokens may use the `--*-admin-*` namespace. Do not add `--*-admin-*` aliases as a substitute for existing UI kit semantic/component tokens.
- If an app token intentionally remaps an existing UI kit primitive, make that remap explicit in the broadest matching file before touching component token files.
- The admin 2px spacing scale is `--spacing-1` through `--spacing-80`; `--spacing-50` is reserved for the UI kit primitive alias, so the 50th admin scale step is `--spacing-step-50`.
- `components/components.css` imports focused component overrides such as `atoms/_admin-button.css`.
- Add component-specific overrides only when the broader admin token files cannot express the needed result.

Do not add new app UI selectors to `styles.css`. The long-term target is for `styles.css` to contain only import wiring and truly unavoidable global base rules. Move structural layout into JSX with Tailwind utilities, and move visual values into UI-kit tokens, app token overrides, token-backed utilities, or UI-kit component props.

Use UI-kit components before native controls:

- Prefer `Button`, `Badge`, `Input`, `Checkbox`, `Select`, `Dialog`, `Pagination`, and other existing kit components when their semantics match.
- Native table markup is acceptable for dense data grids until a shared table component covers the required behavior.
- Native controls are acceptable only as a documented temporary gap in the current feature slice.

Admin UX should stay dense, operational, and scannable. Do not introduce marketing layouts, oversized hero sections, decorative cards, or broad visual redesigns while implementing workflow parity.

## Code Organization

- Keep raw HTTP integration in `admin-api.ts` or a clearly named feature API module.
- Keep business inclusion rules pure and testable in `admin-rules.ts` or feature rule modules.
- Keep page components focused on rendering, user interaction, and route state.
- When a UI-kit compound component needs repeated app-level composition in two or
  more admin screens, create a small domain-neutral adapter in `src/components`
  before migrating the second caller. Keep business labels, rules, and API calls
  in the page or feature module.
- Do not keep expanding one large file when a feature becomes multi-screen. Prefer `src/features/<domain>/...` for new substantial sections.
- Shared contracts and normalized types must have one owner per change. Do not let multiple agents independently rewrite shared type surfaces.

## Data Fetching and Auth

- Use React Query for server state.
- Use stable query keys that include filters and IDs.
- Prefer existing Admin API list/detail endpoints before proposing backend aggregation endpoints.
- Background refresh is acceptable for admin counters and dashboards. Prefer polling plus refetch-on-focus before introducing WebSockets or SSE.
- Session/cookie auth must send credentials as required by Medusa Admin API. Do not store passwords or secrets in client code.
- Never add fake production data to make a screen look complete. Empty states must reflect real empty data.

## Medusa Parity Workflow

For each Medusa dashboard parity slice:

1. Identify the matching default Medusa dashboard route/component in the local clone.
2. Identify the Admin API endpoints and request fields it uses.
3. Check whether this project has custom endpoints or plugins for the same area.
4. Implement the smallest useful workflow in `apps/admin`.
5. Reuse `libs/ui` components and existing admin layout patterns.
6. Add smoke verification notes: local route, deployed backend route, mutation side effects, and rollback path.

## Backend Gap Rule

Backend work is justified only when at least one is true:

- The current Admin API cannot express the required mutation or read model.
- Frontend scanning would be incorrect because pagination or filtering cannot preserve the business rule.
- A workflow must be atomic, audited, or permission-checked server side.
- A custom project integration already exposes backend semantics that should not be duplicated in React.

If backend work is justified, load `.codex/skills/building-with-medusa` and the relevant reference file before coding. Use workflows for mutations and keep business logic out of route handlers.

## Planning

Plan files for this admin live in `apps/admin/agent-plans`. Use `plan-graph` with explicit dependency overlays from `apps/admin/agent-plans/README.md`; do not assume a pile of `.plan.md` files has an implicit execution order.

For current-lane status use `dag` against the same plan selection and dependency overlay. Keep generated graph snapshots under `apps/admin/plan-graphs` so they remain local-only unless intentionally promoted.

## Verification

For code changes in `apps/admin`, run the narrowest relevant checks:

- `pnpm.cmd --dir apps/admin run typecheck`
- `pnpm.cmd --dir apps/admin run build`
- `pnpm.cmd --dir apps/admin run validate:ui-primitives` when adding or changing JSX controls.
- `pnpm.cmd --dir apps/admin run validate:token-usage` when changing Tailwind classes or token files.
- `pnpm.cmd exec biome check --write <changed files>`

For user-facing workflow changes, also smoke-test in a browser against the deployed backend when possible. Do not perform destructive admin actions against deployed data unless the user explicitly approves that action.

## Commits and Scope

- Keep commits aligned to one workflow slice or planning/documentation slice.
- Do not mix backend, UI kit, and admin app changes in one commit unless a single feature genuinely requires all three.
- Ignore unrelated dirty files outside the active scope.

## Important Sources

- Medusa source reference:
   - Prefer local clone at `~/.local/share/medusa-js/medusa` when available.
   - For dashboard parity inspect `~/.local/share/medusa-js/medusa/packages/admin/dashboard/src`.
   - If the clone is missing, use official Medusa docs and ask before guessing dashboard internals.

- UI kit rules:
   - Use local guidance under `.codex/skills/...` as the authoritative UI kit guidance for this admin work.
   - Optional local notes may live in `apps/admin/ui.md`, but committed instructions must not depend on that file existing.
