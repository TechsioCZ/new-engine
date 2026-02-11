---
name: ui-molecule-slider
description: Use when working with the @libs/ui Slider molecule (src/molecules/slider.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Slider molecule
Use this skill to apply Slider correctly in UI work.

## Source Of Truth
- Read `src/molecules/slider.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Slider`
- `SliderProps`

## Purpose
Zag slider with optional markers, value output, and validation status.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | No | `string` | - | - |
| `name` | No | `string` | - | - |
| `label` | No | `string` | - | - |
| `validateStatus` | No | `"default"  &#124;  "error"  &#124;  "success"  &#124;  "warning"` | - | - |
| `helpText` | No | `string` | - | - |
| `showHelpTextIcon` | No | `boolean` | `true` | - |
| `value` | No | `number[]` | - | Controlled. |
| `defaultValue` | No | `number[]` | `[25,75]` | Uncontrolled. |
| `min` | No | `number` | `0` | - |
| `max` | No | `number` | `100` | - |
| `step` | No | `number` | `1` | - |
| `minStepsBetweenThumbs` | No | `number` | `0` | - |
| `disabled` | No | `boolean` | `false` | - |
| `readOnly` | No | `boolean` | `false` | - |
| `dir` | No | `"ltr"  &#124;  "rtl"` | `ltr` | - |
| `orientation` | No | `"horizontal"  &#124;  "vertical"` | `horizontal` | - |
| `origin` | No | `"start"  &#124;  "center"  &#124;  "end"` | - | - |
| `thumbAlignment` | No | `"center"  &#124;  "contain"` | `center` | - |
| `showMarkers` | No | `boolean` | `false` | - |
| `markerCount` | No | `number` | `5` | - |
| `showValueText` | No | `boolean` | `false` | - |
| `formatRangeText` | No | `(values: number[]) => string` | - | - |
| `formatValue` | No | `(value: number) => string` | `(val) => val.toString()` | - |
| `className` | No | `string` | - | - |
| `onChange` | No | `(values: number[]) => void` | - | - |
| `onChangeEnd` | No | `(values: number[]) => void` | - | - |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop. |

## Compound API
No compound subcomponents are exposed.

## Controlled State
Controlled via value/onChange; uncontrolled via defaultValue.

## Semantics And Accessibility
Zag slider props for root/track/thumbs; hidden inputs for form; output uses getValueTextProps.

## Usage Pattern
```tsx
<Slider />
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
