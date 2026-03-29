---
name: adopting-ui-kit-in-apps/app-token-overrides
description: Map app-specific visuals into semantic, typography, spacing, and component override token files while preserving the @techsio/ui-kit token chain. Use when adapting a new app design, deciding whether `_app-semantic.css` is enough, or determining whether a component-specific override is truly necessary instead of inline className styling.
---

# App Token Overrides

Keep the library component API intact and move visual differences into app token files. This skill exists to preserve the token chain so app styling stays centralized and repeatable.

## Read First

Start with:

- `references/token-chain-rules.md`
- `references/app-token-structure.md`
- `AGENTS.md`
- `token-contribution.md`
- the relevant library token files under `src/tokens/`
- the affected component `tsx` and story files when the override touches a specific component

## Workflow

1. Identify the affected visual differences from the app design.
2. Find the relevant library token chain first. Do not add an app override before you know which library token already drives the output.
3. If the component is already chosen, inspect the exact `tsx`, token `.css`, and story file for that component before editing anything.
4. If the chosen component already exposes the needed `variant`, `theme`, `size`, or other supported props, reduce the usage to a prop-only shape before changing tokens.
5. List the exact tokens that are in use for the app's actual variant, size, and state before proposing overrides.
6. Classify any existing inline `className` as:
   - `redundant-inline`
   - `composition-inline`
   - `api-gap-inline`
7. Mirror `libs/ui/src/tokens` in the app token layer.
8. Start at the broadest app layer that can solve the problem:
   - `_app-semantic.css`
   - `_app-typography.css`
   - `_app-spacing.css`
9. Add `_app-<component>.css` only if the general layers still cannot express the needed result.
10. Re-check whether the final output is already correct through the existing token chain. If yes, do not add a redundant override.
11. Treat inline appearance classes as a last resort. If you need them, prefer an app token reference over raw Tailwind values and call out the underlying API gap.

## Hard Rules

- Token-first, className-last.
- Prop-only first, token override second, appearance `className` last.
- Do not fix appearance in JSX when the change belongs in app tokens.
- Do not create new app-specific utility classes in `_app-<component>.css` when you are doing token override work.
- Do not duplicate a library token reference in `_app-<component>.css` if app semantic or typography mapping already produces the correct result.
- When a component-specific override is needed, override only the tokens that are truly different from the default library logic.
- Override only the variant, size, and state that the app surface actually uses.
- Before editing, explicitly identify which exact tokens are in use and which inline classes are redundant versus legitimate composition.
- If the desired result cannot be expressed cleanly through app tokens, describe the library gap instead of hiding it behind a permanent hack.

## When The Component Is Already Chosen

Use this exact sequence:

1. Read the component `tsx`.
2. Read the matching component token `.css`.
3. Read the matching story file.
4. Reduce the usage to the cleanest prop-only form the component already supports.
5. Trace the exact token chain used by the chosen variant, size, and state.
6. Check whether the result is already correct through `_app-semantic.css`, `_app-typography.css`, or `_app-spacing.css`.
7. Only then decide whether `_app-<component>.css` is needed.
8. If `_app-<component>.css` is needed, override only the existing `libs/ui` tokens that are wrong.

## Output Shape

Return:

1. `Tokens in use`
2. `Already correct`
3. `Needs override`
4. `Redundant inline className`
5. `Legitimate composition className`
6. The recommended app token file changes.
7. A short rationale for why each change belongs in semantic, typography, spacing, or component scope.
8. Any library gaps that should be escalated instead of patched locally.

## References

- `references/token-chain-rules.md` contains the canonical override heuristics.
- `references/app-token-structure.md` defines the default folder and file layout to mirror from `libs/ui/src/tokens`.
