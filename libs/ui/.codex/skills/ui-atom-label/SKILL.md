---
name: ui-atom-label
description: Use when working with the @libs/ui Label atom (src/atoms/label.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Label atom
Use this skill to apply Label correctly in UI work.

## Source Of Truth
- Read `src/atoms/label.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `LabelProps`
- `Label`

## Purpose
Form label with optional required indicator.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `size` | No | `"sm" &#124; "md" &#124; "lg" &#124; "current"` | `current` | - |
| `disabled` | No | `boolean` | `false` | - |
| `required` | No | `boolean` | - | Appends "*" when true. |
| `children` | Yes | `ReactNode` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Renders <label>; uses htmlFor when provided.

## Usage Pattern
```tsx
<Label />
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
