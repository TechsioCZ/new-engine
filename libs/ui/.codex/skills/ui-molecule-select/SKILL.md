---
name: ui-molecule-select
description: Use when working with the @libs/ui Select molecule (src/molecules/select.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Select molecule
Use this skill to apply Select correctly in UI work.

## Source Of Truth
- Read `src/molecules/select.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Select`
- `SelectProps`
- `SelectItem`
- `SelectSize`
- `useSelectContext`
- `selectVariants`

## Purpose
Zag select with compound subcomponents and hidden native select for forms.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `items` | Yes | `SelectItem[]` | - | - |
| `id` | No | `string` | - | - |
| `className` | No | `string` | - | - |
| `children` | Yes | `ReactNode` | - | - |
| `ref` | No | `Ref<HTMLDivElement>` | - | - |
| `validateStatus` | No | `"default"  &#124;  "error"  &#124;  "success"  &#124;  "warning"` | `default` | - |
| `size` | No | `"xs"  &#124;  "sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop. |
| `value` | No | `string[]` | - | Controlled selection. |
| `defaultValue` | No | `string[]` | - | Uncontrolled selection. |
| `multiple` | No | `boolean` | `false` | - |
| `disabled` | No | `boolean` | `false` | - |
| `required` | No | `boolean` | `false` | - |
| `readOnly` | No | `boolean` | `false` | - |
| `closeOnSelect` | No | `boolean` | `true` | - |
| `loopFocus` | No | `boolean` | `true` | - |
| `name` | No | `string` | - | - |
| `form` | No | `string` | - | - |
| `onValueChange` | No | `select.Props["onValueChange"]` | - | - |
| `onOpenChange` | No | `select.Props["onOpenChange"]` | - | - |
| `onHighlightChange` | No | `select.Props["onHighlightChange"]` | - | - |

## Compound API
- `Select.Label`
- `Select.Control`
- `Select.Trigger`
- `Select.ValueText`
- `Select.ClearTrigger`
- `Select.Positioner`
- `Select.Content`
- `Select.ItemGroup`
- `Select.ItemGroupLabel`
- `Select.Item`
- `Select.ItemText`
- `Select.ItemIndicator`
- `Select.StatusText`

## Controlled State
Controlled via value/onValueChange; uncontrolled via defaultValue.

## Semantics And Accessibility
Zag select props for trigger/content/items; hidden select for native form submission; validation data attrs applied.

## Usage Pattern
```tsx
<Select>
  <Select.Label>...</Select.Label>
  <Select.Control>...</Select.Control>
</Select>
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
