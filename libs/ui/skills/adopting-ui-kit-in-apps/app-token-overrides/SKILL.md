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
3. Mirror `libs/ui/src/tokens` in the app token layer.
4. Start at the broadest app layer that can solve the problem:
   - `_app-semantic.css`
   - `_app-typography.css`
   - `_app-spacing.css`
5. Add `_app-<component>.css` only if the general layers still cannot express the needed result.
6. Re-check whether the final output is already correct through the existing token chain. If yes, do not add a redundant override.
7. Treat inline appearance classes as a last resort. If you need them, prefer an app token reference over raw Tailwind values and call out the underlying API gap.

## Hard Rules

- Token-first, className-last.
- Do not fix appearance in JSX when the change belongs in app tokens.
- Do not duplicate a library token reference in `_app-<component>.css` if app semantic or typography mapping already produces the correct result.
- When a component-specific override is needed, override only the tokens that are truly different from the default library logic.
- If the desired result cannot be expressed cleanly through app tokens, describe the library gap instead of hiding it behind a permanent hack.

## Output Shape

Return:

1. The recommended app token file changes.
2. A short rationale for why each change belongs in semantic, typography, spacing, or component scope.
3. Any library gaps that should be escalated instead of patched locally.

## References

- `references/token-chain-rules.md` contains the canonical override heuristics.
- `references/app-token-structure.md` defines the default folder and file layout to mirror from `libs/ui/src/tokens`.
