---
name: ui-atom-extra-text
description: Use when working with the @libs/ui ExtraText atom (src/atoms/extra-text.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# ExtraText atom
Use this skill to apply ExtraText correctly in UI work.

## Source Of Truth
- Read `src/atoms/extra-text.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `ExtraTextProps`
- `ExtraText`

## Purpose
Secondary/supporting text.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `size` | No | `"sm" &#124; "md" &#124; "lg"` | `md` | - |
| `children` | Yes | `ReactNode` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Renders a <span>; no aria attributes.

## Usage Pattern
```tsx
<ExtraText />
```

## UI/UX Rules
- Use this component instead of raw HTML when an equivalent atom exists.
- Keep labels, help text, and error feedback explicit; never rely on color alone.
- Prefer predictable defaults first, then opt into advanced props only when needed.
- Preserve keyboard and screen-reader behavior provided by the implementation.
- Keep visual consistency by using component variants and sizes before custom classes.

## Integration Checklist
- Verify required props first.
- Verify semantic structure in rendered markup.
- Verify focus, keyboard navigation, and disabled/read-only behavior.
- Verify controlled/uncontrolled mode is used consistently.
- Verify Storybook examples cover primary and stateful cases.
