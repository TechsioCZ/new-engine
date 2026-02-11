---
name: ui-atom-checkbox
description: Use when working with the @libs/ui Checkbox atom (src/atoms/checkbox.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Checkbox atom
Use this skill to apply Checkbox correctly in UI work.

## Source Of Truth
- Read `src/atoms/checkbox.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `CheckboxProps`
- `Checkbox`

## Purpose
Styled checkbox input with indeterminate support.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `indeterminate` | No | `boolean` | - | Sets native indeterminate state. |
| `invalid` | No | `boolean` | - | Maps to aria-invalid. |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Renders <input type="checkbox">; sets aria-invalid when invalid; sets DOM indeterminate property.

## Usage Pattern
```tsx
<Checkbox />
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
