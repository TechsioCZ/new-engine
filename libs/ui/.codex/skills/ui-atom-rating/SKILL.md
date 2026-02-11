---
name: ui-atom-rating
description: Use when working with the @libs/ui Rating atom (src/atoms/rating.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Rating atom
Use this skill to apply Rating correctly in UI work.

## Source Of Truth
- Read `src/atoms/rating.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `RatingProps`
- `Rating`

## Purpose
Star rating input using Zag.js rating-group.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `value` | No | `number` | - | Controlled value. |
| `defaultValue` | No | `number` | - | Uncontrolled initial value. |
| `count` | No | `number` | `5` | Number of rating items. |
| `labelText` | No | `string` | - | When set, renders a Label. |
| `readOnly` | No | `boolean` | `false` | - |
| `disabled` | No | `boolean` | `false` | - |
| `allowHalf` | No | `boolean` | `true` | - |
| `dir` | No | `"ltr" &#124; "rtl"` | `"ltr"` | - |
| `size` | No | `"sm" &#124; "md" &#124; "lg"` | `md` | - |
| `onChange` | No | `(value: number) => void` | - | - |
| `onHoverChange` | No | `(value: number) => void` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
Controlled via value; uncontrolled via defaultValue.

## Semantics And Accessibility
Uses Zag.js rating-group props and hidden input; label rendered via Label when labelText provided.

## Usage Pattern
```tsx
<Rating />
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
