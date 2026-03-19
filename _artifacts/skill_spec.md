# @techsio/ui-kit - Skill Spec

@techsio/ui-kit is a React 19, Tailwind v4, and Zag.js UI library that publishes tokenized atoms, molecules, organisms, templates, and Storybook documentation from a monorepo package at `libs/ui`. The package is consumed through explicit subpath exports and expects styling decisions to flow through semantic tokens, component tokens, and `tv()`-based component classes instead of ad hoc inline appearance overrides.

## Domains

| Domain | Description | Skills |
| ------ | ----------- | ------ |
| adopting the ui kit in an app | Decide which existing components to use in an app, how to clean up an already-drifted app, and where design differences belong: semantic token layers, component overrides, or UX decisions. | app-component-inventory, existing-app-refactor-review, app-token-overrides, component-usage-ux |
| authoring ui-kit components | Create or extend shared components in `libs/ui` with matching TSX, token CSS, Storybook coverage, and Zag-backed interaction patterns where needed. | component-authoring |
| verifying component contracts | Keep implementation, tokens, stories, and validation workflows aligned so shared components do not drift or silently regress. | component-consistency, component-audit |

## Skill Inventory

| Skill | Type | Domain | What it covers | Failure modes |
| ------ | ---- | ------ | -------------- | ------------- |
| app-component-inventory | lifecycle | adopting the ui kit in an app | map a design to existing components, app overrides, and the rare cases that justify a new shared higher-order component | 3 |
| existing-app-refactor-review | lifecycle | adopting the ui kit in an app | audit an existing app for inline styling drift, token misuse, ignored props, native element bypasses, and phased refactor opportunities | 4 |
| app-token-overrides | core | adopting the ui kit in an app | semantic/typography/spacing remapping, app token structure mirroring `src/tokens`, and last-resort component overrides | 3 |
| component-usage-ux | core | adopting the ui kit in an app | which component to use, when to use it, how variants/themes/sizes/props change meaning, and when existing props beat inline styling | 4 |
| component-authoring | core | authoring ui-kit components | new atoms/molecules/organisms/templates, token CSS, Zag-powered patterns, and canonical AGENTS.md authoring rules | 4 |
| component-consistency | core | verifying component contracts | alignment across `component.tsx`, `_component.css`, `*.stories.tsx`, and token imports | 3 |
| component-audit | lifecycle | verifying component contracts | end-to-end audits, validator interpretation, disabled/state regression checks | 3 |

## Failure Mode Inventory

### app-component-inventory (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Inventing a new component for every design difference | HIGH | maintainer interview + README.md | app-token-overrides |
| 2 | Planning the whole library surface instead of the app surface | HIGH | maintainer interview | component-usage-ux |
| 3 | Encoding design decisions directly in JSX className | CRITICAL | maintainer interview | app-token-overrides |

### app-token-overrides (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Fixing component appearance inline in JSX | CRITICAL | maintainer interview | app-component-inventory |
| 2 | Creating `_app-component.css` overrides before checking the semantic layer | HIGH | maintainer interview | app-component-inventory |
| 3 | Treating a token gap as a permanent app-local hack | HIGH | maintainer interview + AGENTS.md | component-authoring |

### existing-app-refactor-review (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Treating every className as equally wrong | HIGH | maintainer interview | app-token-overrides |
| 2 | Refactoring around an existing prop or variant | HIGH | maintainer interview + `src/atoms/button.tsx` | component-usage-ux |
| 3 | Jumping to component-specific overrides before simplifying the token chain | HIGH | maintainer interview | app-token-overrides |
| 4 | Leaving native elements or ad hoc wrappers where ui-kit already has a primitive | HIGH | AGENTS.md + maintainer interview | component-usage-ux |

### component-usage-ux (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Using a Dialog for lightweight contextual help | HIGH | dialog stories + tooltip source + maintainer interview | app-component-inventory |
| 2 | Using danger styling for a non-destructive primary action | HIGH | maintainer interview | app-component-inventory |
| 3 | Using alertdialog semantics without modal safeguards | HIGH | dialog stories | app-component-inventory |
| 4 | Ignoring an existing prop and compensating with className | HIGH | maintainer interview + `src/atoms/button.tsx` | component-audit |

### component-authoring (4 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Styling a component with semantic tokens or arbitrary values directly | CRITICAL | AGENTS.md + README.md | component-consistency |
| 2 | Skipping the established Zag/context pattern for interactive components | HIGH | `src/molecules/select.tsx` + AGENTS.md | component-consistency |
| 3 | Leaking authoring-only props to DOM or machine config | HIGH | git history | component-audit |
| 4 | Following old `interface` style instead of the canonical `type` rule | HIGH | AGENTS.md + maintainer interview | component-consistency |

### component-consistency (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Adding a variant in TSX without adding its tokens | HIGH | source + AGENTS.md | component-authoring |
| 2 | Changing component props or options without updating story controls | HIGH | source + git history | component-audit |
| 3 | Documenting components with native HTML and hardcoded Tailwind values | HIGH | AGENTS.md + git history | component-audit |

### component-audit (3 failure modes)

| # | Mistake | Priority | Source | Cross-skill? |
| --- | ------- | -------- | ------ | ------------ |
| 1 | Blindly deleting every token reported as unused | HIGH | `scripts/validate-token-definitions.js` + maintainer interview | component-consistency |
| 2 | Treating story-only usage as proof that a runtime token is valid | HIGH | validation scripts | component-consistency |
| 3 | Auditing only TSX and ignoring state tokens/data attributes | HIGH | source + git history | component-authoring, component-consistency |

## Tensions

| Tension | Skills | Agent implication |
| ------- | ------ | ----------------- |
| app overrides versus library API evolution | app-token-overrides ↔ component-authoring | agent either over-customizes locally or promotes one-off needs into shared API too early |
| visual matching versus semantic UX correctness | app-component-inventory ↔ component-usage-ux | agent picks by screenshot similarity and misses meaning |
| fast implementation versus three-surface consistency | component-authoring ↔ component-consistency | agent updates TSX only and leaves CSS/stories drift |

## Cross-References

| From | To | Reason |
| ---- | -- | ------ |
| app-component-inventory | component-usage-ux | design mapping improves when the agent understands semantic intent |
| app-component-inventory | app-token-overrides | inventory tells the agent where app-level remapping is needed |
| existing-app-refactor-review | app-token-overrides | audit findings often resolve into token-layer cleanup |
| existing-app-refactor-review | component-usage-ux | refactor review has to distinguish wrong component choice or ignored props from pure visual drift |
| existing-app-refactor-review | component-authoring | repeated app anti-patterns can reveal a real shared-library gap |
| app-token-overrides | component-authoring | repeated token gaps should become shared library work |
| component-authoring | component-consistency | new components are incomplete until TSX, CSS, and stories align |
| component-audit | component-consistency | audits usually end with concrete consistency findings |
| component-audit | component-authoring | audit findings often require shared-library patches |

## Subsystems & Reference Candidates

| Skill | Subsystems | Reference candidates |
| ------ | ---------- | -------------------- |
| component-authoring | atoms, molecules, organisms, templates | Zag-backed compound component patterns |
| app-token-overrides | - | two-layer token naming and derivation rules |
| component-consistency | - | token import aggregation and Storybook control conventions |

## Recommended Skill File Structure

- **Core skills:** `app-token-overrides`, `component-usage-ux`, `component-authoring`, `component-consistency`
- **Lifecycle skills:** `app-component-inventory`, `existing-app-refactor-review`, `component-audit`
- **Composition skills:** none as standalone package skills yet; Figma/design input and Zag.js are inputs or references to the skills above
- **Reference files:** likely needed for `component-authoring` (Zag-powered compound patterns and AGENTS canonical rules), `app-token-overrides` (token naming, chain rules, and app folder mirroring of `src/tokens`), and `component-consistency` (story/control conventions)

## Composition Opportunities

| Library | Integration points | Composition skill needed? |
| ------- | ------------------ | ------------------------- |
| Figma or other design source | design input for inventory and token mapping | no - handled by `app-component-inventory` and `app-token-overrides` |
| Zag.js | interactive state machines for authored components | no - handled by `component-authoring` |
| Storybook | live documentation and consistency checks | no - handled by `component-consistency` and `component-audit` |
