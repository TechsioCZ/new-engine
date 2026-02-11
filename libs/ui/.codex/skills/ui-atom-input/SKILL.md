---
name: ui-atom-input
description: Use when working with the @libs/ui Input atom (src/atoms/input.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Input atom
Use this skill to apply Input correctly in UI work.

## Source Of Truth
- Read `src/atoms/input.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `InputProps`
- `Input`

## Purpose
Text input with size/variant styling and optional button padding.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `size` | No | `"sm" &#124; "md" &#124; "lg"` | `md` | - |
| `variant` | No | `"default" &#124; "error" &#124; "success" &#124; "warning"` | `default` | - |
| `withButtonInside` | No | `false &#124; "right" &#124; "left"` | - | Adds padding for inner button when set. |
| `hideSearchClear` | No | `boolean` | `true` | Hides native search clear button. |
| `disabled` | No | `boolean` | - | Also toggles disabled styles. |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Renders an <input>; disabled attribute set when disabled.

## Usage Pattern
```tsx
<Input />
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
