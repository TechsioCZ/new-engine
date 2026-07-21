# Techsio UI Kit AI — plugin guidance

This folder is the **techsio-ui-kit-ai** agent plugin for developing `@techsio/ui-kit`
(`libs/ui`). Canonical library rules live in `libs/ui/AGENTS.md` — read that first; this file
only routes.

## Routing

| Task | Use |
| --- | --- |
| New component (atom/molecule/organism/template) | `$ui-new-component` skill → `ui-component-dev` agent |
| Token CSS / cascade / shared utilities | `$ui-tokens` skill → `ui-token-stylist` agent |
| Storybook stories | `$ui-story` skill → `ui-storybook-writer` agent |
| Brand theme (Figma or code-authored) | `$ui-theme-brand` skill |
| Figma Code Connect / variable sync | `$ui-figma-sync` skill → `ui-figma-connector` agent |
| Quality gate before commit/push | `$ui-validate` skill → `ui-qa-validator` agent (mandatory last) |
| Publish readiness / semver | `$ui-release-check` skill |
| Consuming the kit from an app | `$ui-component-usage` skill → bundled `<component>-usage` skills |
| Architecture / patterns / nesting policy / design review | `ui-design-system-expert` agent |

## Ground rules (summary — full list in `libs/ui/AGENTS.md`)

- React 19: `ref` prop, no `forwardRef`; `type` not `interface`; named exports; no barrels.
- Styling only via `tv()` + component token classes; two-layer tokens in `@theme static`.
- State via data attributes; interactive components via Zag.js compound pattern.
- Every component change ends with the `ui-validate` gate; never lint with `biome check .`.
- Never touch `apps/herbatika` from UI-kit work (pre-existing red lint on master).
