---
name: ui-atom-textarea
description: Use when working with the @libs/ui Textarea atom (src/atoms/textarea.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Textarea atom
Use this skill to apply Textarea correctly in UI work.

## Source Of Truth
- Read `src/atoms/textarea.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `TextareaProps`
- `Textarea`

## Purpose
Textarea with size, variant, and resize options.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `size` | No | `"sm" &#124; "md" &#124; "lg"` | `md` | - |
| `variant` | No | `"default" &#124; "error" &#124; "success" &#124; "warning" &#124; "borderless"` | `default` | - |
| `resize` | No | `"none" &#124; "y" &#124; "x" &#124; "both" &#124; "auto"` | `y` | - |
| `readonly` | No | `boolean` | - | Maps to readOnly attribute and styles. |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Renders a <textarea>; readOnly attribute set when readonly prop true.

## Usage Pattern
```tsx
<Textarea />
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
