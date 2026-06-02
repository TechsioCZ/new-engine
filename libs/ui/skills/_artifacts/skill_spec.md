# @techsio/ui-kit — Skill Spec

`@techsio/ui-kit` is the shared React 19 UI library in `libs/ui`, built with
Tailwind v4 tokens, tailwind-variants, Zag.js, Storybook 10, RSLib, and Figma
Code Connect. The skills cover two separate work modes: authoring/refactoring
the library itself, and using the library correctly inside apps/*.

Generated from `skills/_artifacts/domain_map.yaml`.
Status: reviewed.

## Domains

| Domain | Description | Skills |
| --- | --- | --- |
| UI kit component work | Create, refactor, and validate shared components in `libs/ui`. | `component-authoring`, `component-consistency-validation`, `tailwind-token-authoring`, `zag-compound-components`, `storybook-authoring`, `figma-sync-handoff`, `ui-kit-publish-readiness` |
| Token architecture | Maintain Tailwind v4 token chains and app-side token overrides. | `tailwind-token-authoring`, `app-token-initialization`, `app-token-overrides`, `app-ui-kit-audit` |
| Storybook, docs, and QA | Keep examples, controls, visual matrices, a11y, and validation aligned. | `storybook-authoring`, `component-consistency-validation`, `ui-kit-publish-readiness` |
| Interactive Zag.js components | Build accessible interactive and compound components with Zag.js and data attributes. | `zag-compound-components`, `component-authoring`, `component-consistency-validation` |
| Consuming @techsio/ui-kit in apps | Use tokens, components, props, variants, framework adapters, and audits correctly in apps/*. | `app-token-initialization`, `app-token-overrides`, `component-usage-ux`, `app-ui-kit-audit`, `framework-consumer-integration` |
| Workflow orchestration and Intent skill upkeep | Route tasks through focused skills and keep generated skills current. | `ui-kit-workflow-orchestrator`, `intent-skill-maintenance` |

## Skill Inventory

| Skill | Type | Domain | What it covers | Failure modes |
| --- | --- | --- | --- | --- |
| `component-authoring` | core | library-component-work | Component TSX, token CSS, stories, React 19 refs, exports, Figma reminder | 5 |
| `component-consistency-validation` | core | library-component-work | TSX/stories/token/Figma/API consistency and validation commands | 3 |
| `tailwind-token-authoring` | core | token-system | Tailwind v4 `@theme static`, two-layer tokens, naming, validators | 4 |
| `zag-compound-components` | core | interactive-components | Zag machine/connect, compound context, slots, data attributes | 3 |
| `storybook-authoring` | core | storybook-docs-and-qa | CSF3 stories, Playground, argTypes, token/component usage | 3 |
| `figma-sync-handoff` | core | library-component-work | Reminder-only Figma/Code Connect handoff to `component-to-figma` | 3 |
| `ui-kit-publish-readiness` | lifecycle | storybook-docs-and-qa | Build, exports, publint, token validation, Storybook/a11y readiness | 3 |
| `app-token-initialization` | lifecycle | consumer-app-adoption | App semantic/typography/spacing/layout token skeleton and interview | 3 |
| `app-token-overrides` | core | token-system | Token-first app overrides, redundancy checks, API gap detection | 5 |
| `component-usage-ux` | composition | consumer-app-adoption | Orchestrates component choice and per-component usage loading | 6 |
| `app-ui-kit-audit` | core | consumer-app-adoption | Native HTML, custom primitives, duplicate className, token drift audits | 4 |
| `framework-consumer-integration` | framework | consumer-app-adoption | NextLink/NextImage adapters, token imports, adapter prop forwarding | 4 |
| `ui-kit-workflow-orchestrator` | lifecycle | workflow-and-skill-maintenance | Routes library/app work through focused skills and validation follow-ups | 3 |
| `intent-skill-maintenance` | lifecycle | workflow-and-skill-maintenance | Updates skills when library or app usage patterns change | 3 |

Total: 14 skills, 52 failure modes.

## Failure Mode Inventory

| Skill | High-signal mistakes |
| --- | --- |
| `component-authoring` | component without token/story, semantic Tailwind in component, `forwardRef`, new `interface`, unnecessary `useCallback` |
| `component-consistency-validation` | variant drift between code/docs/Figma, ignored token validators, missing compound context guards |
| `tailwind-token-authoring` | raw component token values, abbreviated tokens, missing Tailwind token class, legacy border token shape |
| `zag-compound-components` | manual ARIA instead of Zag props, subcomponent outside Root, state styling without data attributes |
| `storybook-authoring` | native HTML and hardcoded Tailwind in stories, missing Playground controls, unclear story names |
| `figma-sync-handoff` | automatic Figma side effects, raw Figma variable values, Code Connect drift |
| `ui-kit-publish-readiness` | root package imports, local semantic-release, skipped build before export changes |
| `app-token-initialization` | component overrides before semantic layer, raw Figma CSS as final theme, token setup without interview |
| `app-token-overrides` | redundant overrides, JSX appearance fixes, `font-bold` instead of CSS token, misused container tokens, permanent API-gap workarounds |
| `component-usage-ux` | monolithic generic usage, native/custom primitive, wrong UX variant, hallucinated props, duplicate prop styling, wrapper before API check |
| `app-ui-kit-audit` | missed native HTML, missed existing components such as TreeView, duplicate default styles, loading pattern drift |
| `framework-consumer-integration` | agnostic Link/Image in Next app, missing token imports, adapter prop mismatch, wrapper before API check |
| `ui-kit-workflow-orchestrator` | crossing libs/ui vs app scope, skipped follow-up skill, business logic scope creep |
| `intent-skill-maintenance` | stale skill after API change, skipped meta-skill order, generic skill drift |

## Tensions

| Tension | Skills | Agent implication |
| --- | --- | --- |
| token-first vs fast className | `app-token-overrides`, `component-usage-ux`, `app-ui-kit-audit` | Agent fixes visuals inline instead of preserving reusable token chains. |
| library API gap vs app one-off | `component-authoring`, `app-token-overrides`, `component-usage-ux` | Agent leaves permanent local hacks where the library needs a prop/token/API. |
| Figma sync desired vs operationally risky | `figma-sync-handoff`, `component-authoring`, `ui-kit-workflow-orchestrator` | Agent may edit Figma without valid context; skills should only hand off. |
| compound flexibility vs Zag contract | `zag-compound-components`, `component-authoring`, `component-consistency-validation` | Agent breaks accessibility by replacing Zag props with local state/ARIA. |
| local rules vs current legacy code | `component-authoring`, `storybook-authoring`, `component-consistency-validation` | Agent may copy legacy `interface`, `useCallback`, or hardcoded story patterns. |

## Cross-References

| From | To | Reason |
| --- | --- | --- |
| `component-authoring` | `tailwind-token-authoring`, `storybook-authoring`, `component-consistency-validation`, `figma-sync-handoff`, `zag-compound-components` | Component work spans code, tokens, stories, validation, interaction, and Figma reminders. |
| `tailwind-token-authoring` | `component-consistency-validation`, `app-token-overrides` | Token changes must validate in the library and preserve app override behavior. |
| `storybook-authoring` | `component-consistency-validation`, `component-usage-ux` | Stories document props and intended consumer usage examples. |
| `app-token-initialization` | `app-token-overrides`, `component-usage-ux`, `framework-consumer-integration` | App setup needs token overrides, usage choices, and framework adapters. |
| `component-usage-ux` | `app-ui-kit-audit`, `framework-consumer-integration`, `app-token-overrides` | Usage decisions must be audited for duplicates, adapter correctness, and token-first styling. |
| `ui-kit-workflow-orchestrator` | library and app skills | Routes the task to focused skills and follow-ups without scope crossing. |

## Subsystems & Reference Candidates

| Skill | Subsystems | Reference candidates |
| --- | --- | --- |
| `component-usage-ux` | per-component usage layer | `button-usage`, `input-usage`, `link-button-usage`, `dialog-usage`, `toast-usage`, `breadcrumb-usage`, `tree-view-usage`, `skeleton-usage`, plus additional usage skills generated from `libs/ui/src` inventory |
| `framework-consumer-integration` | Next.js adapter usage | NextLink/NextImage adapter props and prop forwarding |
| `zag-compound-components` | Zag-backed components | machine/connect patterns and component-specific parts |
| `tailwind-token-authoring` | token layers | semantic, typography, spacing, layout, radius, component tokens |

## Remaining Gaps

None. Phase 4 interview findings are recorded in `domain_map.yaml` under
`resolved_interview_findings`.

## Recommended Skill File Structure

- **Core library skills:** `component-authoring`, `component-consistency-validation`, `tailwind-token-authoring`, `zag-compound-components`, `storybook-authoring`, `figma-sync-handoff`
- **Lifecycle skills:** `ui-kit-publish-readiness`, `app-token-initialization`, `ui-kit-workflow-orchestrator`, `intent-skill-maintenance`
- **Consumer app skills:** `app-token-overrides`, `component-usage-ux`, `app-ui-kit-audit`
- **Framework skills:** `framework-consumer-integration`
- **Per-component usage skills:** create focused sub-skills or flat skills under `libs/ui/skills/` for high-value components, starting with Button/Input/LinkButton/Dialog/Toast/Breadcrumb/TreeView/Skeleton and expanding from the current source inventory.
- **Reference files:** only add references if a generated skill would exceed 500 lines or if a component inventory table becomes too dense for a `SKILL.md`.

## Composition Opportunities

| Library | Integration points | Composition skill needed? |
| --- | --- | --- |
| React 19 / React Compiler | ref-as-prop, handler memoization, hook rules, SSR compatibility | covered by `component-authoring` and `framework-consumer-integration` |
| Zag.js | interactive component machines, `connect`, `api.get*Props`, data attributes | covered by `zag-compound-components` |
| Tailwind CSS v4 | `@theme static`, token utility classes, no config file | covered by `tailwind-token-authoring` and app token skills |
| Storybook 10 | CSF3, autodocs, Controls, a11y checks | covered by `storybook-authoring` |
| Figma Code Connect | component mapping and design-system sync handoff | covered by `figma-sync-handoff`, with authority delegated to `.agents/skills/component-to-figma/SKILL.md` |
| Next.js 16+ | NextLink/NextImage adapters in consumer apps | covered by `framework-consumer-integration` |
