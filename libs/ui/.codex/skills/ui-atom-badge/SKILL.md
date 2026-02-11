---
name: ui-atom-badge
description: Use when working with the @libs/ui Badge atom (src/atoms/badge.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Badge atom
Use this skill to apply Badge correctly in UI work.

## Source Of Truth
- Read `src/atoms/badge.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Badge`
- `BadgeProps`

## Purpose
Inline status/label badge with variant styles or dynamic colors.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `children` | Yes | `string` | - | Required text content. |
| `variant` | No | `"primary" &#124; "secondary" &#124; "tertiary" &#124; "discount" &#124; "info" &#124; "success" &#124; "warning" &#124; "danger" &#124; "outline" &#124; "dynamic"` | `info` | If "dynamic", colors are taken from bgColor/fgColor/borderColor. |
| `bgColor` | No | `string` | - | Required when variant="dynamic". |
| `fgColor` | No | `string` | - | Required when variant="dynamic". |
| `borderColor` | No | `string` | - | Required when variant="dynamic". |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Renders a <span>; no aria attributes. Dynamic colors applied via inline style when variant is "dynamic".

## Usage Pattern
```tsx
<Badge />
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
