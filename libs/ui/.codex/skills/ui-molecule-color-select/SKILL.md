---
name: ui-molecule-color-select
description: Use when working with the @libs/ui ColorSelect molecule (src/molecules/color-select.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# ColorSelect molecule
Use this skill to apply ColorSelect correctly in UI work.

## Source Of Truth
- Read `src/molecules/color-select.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `ColorSelect`
- `ColorItem`

## Purpose
Selectable color swatches with single or multiple selection modes.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `colors` | Yes | `ColorItem[]` | - | - |
| `layout` | No | `"list"  &#124;  "grid"` | `grid` | - |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"  &#124;  "full"` | `lg` | - |
| `radius` | No | `"sm"  &#124;  "md"  &#124;  "lg"  &#124;  "full"` | `full` | - |
| `disabled` | No | `boolean` | - | - |
| `onColorClick` | No | `(color: string) => void` | - | - |
| `selectionMode` | No | `"single"  &#124;  "multiple"` | `single` | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Group uses role radiogroup/group; each swatch is a button with role radio/checkbox and aria-checked/aria-label.

## Usage Pattern
```tsx
<ColorSelect />
```

## UI/UX Rules
- Use this component instead of raw HTML when an equivalent molecule exists.
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
