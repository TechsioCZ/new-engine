---
name: adopting-ui-kit-in-apps/component-usage-ux
description: Choose which @techsio/ui-kit component to use for a UX need, which variant, theme, size, and props fit the intended behavior, and whether an existing prop should be used before adding inline styling. Use when mapping product requirements to library components or when a design seems to require overrides but may already fit the existing API.
---

# Component Usage UX

Choose components by meaning and interaction first, then by visual weight. This skill exists to stop the common failure mode where an agent misses an existing prop or supported variant and compensates with inline `className`.

## Read First

Read the candidate component source and story files before making a recommendation:

- the relevant `src/**/*.{tsx}` component files
- the matching `stories/**/*.stories.tsx`
- `stories/overview/component-comparison.stories.tsx` when you need a quick cross-library scan
- `AGENTS.md` for story and token constraints

## Workflow

1. State the UX goal in plain terms.
2. Identify the candidate components that could solve it.
3. Read each candidate's `tsx` and story file to confirm:
   - supported props
   - supported variants, themes, and sizes
   - composition pattern
   - any state or accessibility expectations
4. Pick the component whose semantics and behavior fit the job best.
5. Choose supported props before inventing wrapper markup or inline styling.
6. If the right component is visually close but not exact, hand visual differences to `app-token-overrides`.
7. If no current component or prop can express the need, call out the gap explicitly instead of hiding it in ad hoc styling.

## Decision Heuristics

- Use danger styling only for destructive or high-risk actions.
- Use tooltip for lightweight contextual help attached to an existing target.
- Use dialog for blocking flows, richer content, or actions that need stronger attention.
- Use `alertdialog` semantics only for urgent or destructive confirmations that should behave modally.
- Treat inline appearance classes as a sign that you probably skipped an existing prop, variant, or token route.

## Output Shape

Return a recommendation with:

- chosen component path
- chosen variant, theme, size, and props
- short UX rationale
- any follow-up token work or API gap

If there are multiple plausible components, compare them explicitly and state why one wins.
