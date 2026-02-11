---
name: ui-atom-icon
description: Use when working with the @libs/ui Icon atom (src/atoms/icon.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Icon atom
Use this skill to apply Icon correctly in UI work.

## Source Of Truth
- Read `src/atoms/icon.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `IconType`
- `IconProps`
- `Icon`

## Purpose
Decorative icon using token class names.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `icon` | Yes | `IconType` | - | Token icon class. |
| `size` | No | `"current" &#124; "xs" &#124; "sm" &#124; "md" &#124; "lg" &#124; "xl" &#124; "2xl"` | `current` | - |
| `color` | No | `"current" &#124; "primary" &#124; "secondary" &#124; "danger" &#124; "success" &#124; "warning"` | `current` | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Renders <span aria-hidden="true">.

## Usage Pattern
```tsx
<Icon />
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
