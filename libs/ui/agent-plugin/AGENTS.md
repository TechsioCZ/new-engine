# Techsio UI Kit AI — plugin guidance

This folder is the **techsio-ui-kit-ai** plugin — an [Agent Plugins 1.0.0](https://agent-plugins.org)
package for developing `@techsio/ui-kit` (`libs/ui`). Canonical library rules live in
`libs/ui/AGENTS.md` — read that first; this file only routes.

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
| Consuming the kit from an app | `$ui-component-usage` skill → `ux-guidelines` → bundled `<component>-usage` skills |
| UX copy, dates/numbers, alignment, states, CRUD/toast placement, "which component?" | bundled `ux-guidelines` skill |
| Architecture / patterns / nesting policy / design review | `ui-design-system-expert` agent |

Agents are Codex subagents in `com.openai/agents/` (client-specific, not part of the portable
contract).

## Package layout (Agent Plugins 1.0.0)

- `plugin.json`, `mcp.json`, `skills/` — the portable contract. Edit these.
- `com.openai/` — Codex extension directory (hooks, subagents), referenced from
  `plugin.json` → `extensions["com.openai"]`.
- `.claude-plugin/` — GENERATED Claude Code shim; never edit, run
  `node scripts/build-client-manifests.mjs`.
- `skills/<name>-usage`, `ux-guidelines`, … — GENERATED from `libs/ui/skills/`; never edit here,
  run `node scripts/sync-skills.mjs`.
- `node scripts/validate-plugin.mjs` must pass before committing plugin changes.

## Ground rules (summary — full list in `libs/ui/AGENTS.md`)

- React 19: `ref` prop, no `forwardRef`; `type` not `interface`; named exports; no barrels.
- Styling only via `tv()` + component token classes; two-layer tokens in `@theme static`.
- State via data attributes; interactive components via Zag.js compound pattern.
- Every component change ends with the `ui-validate` gate; never lint with `biome check .`.
- Never touch `apps/herbatika` from UI-kit work (pre-existing red lint on master).
