---
name: ui-atom-status-text
description: Use when working with the @libs/ui StatusText atom (src/atoms/status-text.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# StatusText atom
Use this skill to apply StatusText correctly in UI work.

## Source Of Truth
- Read `src/atoms/status-text.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `StatusTextProps`
- `StatusText`

## Purpose
Status message with optional icon.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `status` | No | `"error" &#124; "success" &#124; "warning" &#124; "default"` | `default` | - |
| `size` | No | `"sm" &#124; "md" &#124; "lg"` | `md` | - |
| `showIcon` | No | `boolean` | `false` | - |
| `children` | Yes | `ReactNode` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Renders a <div> with text and optional icon; no aria attributes.

## Usage Pattern
```tsx
<StatusText />
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
