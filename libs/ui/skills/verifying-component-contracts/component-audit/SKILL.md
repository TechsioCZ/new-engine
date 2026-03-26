---
name: verifying-component-contracts/component-audit
description: Audit one concrete `libs/ui` component end-to-end across source, token CSS, stories, changelog context, and token validation scripts. Use when investigating a regression, reviewing a risky component change, or triaging validator output that may include false positives.
---

# Component Audit

Audit one component deeply, not the whole library shallowly. The goal is to find real behavioral or maintenance risks across implementation, tokens, documentation, and validation output.

## Scope

Pick one concrete component and inspect:

- the source `tsx`
- its component token CSS
- its story file
- `src/tokens/components/components.css`
- `CHANGELOG.md` if recent behavior is unclear
- `scripts/validate-token-usage.js`
- `scripts/validate-token-definitions.js`

## Audit Workflow

1. Confirm the intended API and composition from source plus stories.
2. Check token coverage, state styling, data attributes, and disabled or validation behavior.
3. Check whether stories demonstrate the real canonical usage or hide problems with ad hoc markup.
4. Run the relevant token validation commands when useful:
   - `pnpm validate:token-usage`
   - `pnpm validate:token-definitions`
5. Treat validator output as leads, not truth. Manually verify whether a warning is real.
6. Search for false positives before deleting or renaming anything.

## Validator Triage Rules

- Do not blindly delete every token reported as unused.
- Expect some runtime or external variables to be legitimate, such as Zag-driven values like `--reference-width`.
- Remember that story files are excluded from some validation passes; story-only usage does not prove runtime correctness.
- If a token looks unused, inspect arbitrary utility syntax, runtime CSS variable usage, and composed subcomponents before changing it.

## Audit Findings

Prioritize findings in this order:

1. broken behavior or accessibility
2. drift between source, tokens, and stories
3. misleading docs or story patterns
4. likely validator false positives or cleanup candidates

Return findings first, with file paths and why they matter.
