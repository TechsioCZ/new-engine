---
name: ui-atom-numeric-input
description: Use when working with the @libs/ui NumericInput atom (src/atoms/numeric-input.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# NumericInput atom
Use this skill to apply NumericInput correctly in UI work.

## Source Of Truth
- Read `src/atoms/numeric-input.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `NumericInputProps`
- `NumericInput`

## Purpose
Compound numeric input with Zag.js state machine and triggers.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `size` | No | `"sm" &#124; "md" &#124; "lg"` | `md` | - |
| `value` | No | `number` | - | Controlled value. |
| `defaultValue` | No | `number` | - | Uncontrolled initial value. |
| `onChange` | No | `(value: number) => void` | - | Receives numeric value from Zag onValueChange. |
| `precision` | No | `number` | - | Mapped to formatOptions.maximumFractionDigits. |
| `describedBy` | No | `string` | - | Merged into aria-describedby for Input subcomponent. |
| `id` | No | `string` | `generated` | Generated via useId when not provided. |
| `step` | No | `number` | `1` | - |
| `dir` | No | `"ltr" &#124; "rtl"` | `"ltr"` | - |
| `disabled` | No | `boolean` | `false` | - |
| `required` | No | `boolean` | `false` | - |
| `allowMouseWheel` | No | `boolean` | `true` | - |
| `clampValueOnBlur` | No | `boolean` | `true` | - |
| `spinOnPress` | No | `boolean` | `true` | - |

## Compound API
- `NumericInput.Control`
- `NumericInput.Input`
- `NumericInput.IncrementTrigger`
- `NumericInput.DecrementTrigger`
- `NumericInput.Scrubber`
- `NumericInput.TriggerContainer`

## Controlled State
Controlled via value; uncontrolled via defaultValue.

## Semantics And Accessibility
Uses Zag.js number input props for ARIA; renders input via Input component.

## Usage Pattern
```tsx
<NumericInput>
  <NumericInput.Control>...</NumericInput.Control>
  <NumericInput.Input>...</NumericInput.Input>
</NumericInput>
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
