---
name: ui-atom-tooltip
description: Use when working with the @libs/ui Tooltip atom (src/atoms/tooltip.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Tooltip atom
Use this skill to apply Tooltip correctly in UI work.

## Source Of Truth
- Read `src/atoms/tooltip.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `TooltipProps`
- `Tooltip`

## Purpose
Tooltip using Zag.js with portal-based content.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `content` | Yes | `ReactNode` | - | - |
| `children` | Yes | `ReactNode` | - | Tooltip trigger content. |
| `size` | No | `"sm" &#124; "md" &#124; "lg"` | `md` | - |
| `variant` | No | `"default" &#124; "outline"` | `default` | - |
| `openDelay` | No | `number` | `200` | - |
| `closeDelay` | No | `number` | `200` | - |
| `interactive` | No | `boolean` | `true` | - |
| `closeOnEscape` | No | `boolean` | `true` | - |
| `offset` | No | `tooltip.PositioningOptions["offset"]` | `{ mainAxis: 16, crossAxis: 0 }` | - |
| `open` | No | `boolean` | - | Controlled open state. |
| `defaultOpen` | No | `boolean` | - | Uncontrolled initial open state. |
| `onOpenChange` | No | `tooltip.Props["onOpenChange"]` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
Controlled via open; uncontrolled via defaultOpen.

## Semantics And Accessibility
Trigger is a <span> with Zag.js props; content rendered in Portal with Zag.js ARIA/role handling.

## Usage Pattern
```tsx
<Tooltip />
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
