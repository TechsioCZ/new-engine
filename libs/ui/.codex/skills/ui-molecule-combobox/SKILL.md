---
name: ui-molecule-combobox
description: Use when working with the @libs/ui Combobox molecule (src/molecules/combobox.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Combobox molecule
Use this skill to apply Combobox correctly in UI work.

## Source Of Truth
- Read `src/molecules/combobox.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Combobox`
- `ComboboxItem`
- `ComboboxProps`

## Purpose
Zag combobox with filtering, clear trigger, and optional multi-select.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | No | `string` | - | - |
| `name` | No | `string` | - | - |
| `label` | No | `string` | - | - |
| `placeholder` | No | `string` | `Select option` | - |
| `disabled` | No | `boolean` | `false` | - |
| `readOnly` | No | `boolean` | `false` | - |
| `required` | No | `boolean` | `false` | - |
| `items` | Yes | `ComboboxItem[]` | `[]` | - |
| `value` | No | `string  &#124;  string[]` | - | Controlled selection. |
| `defaultValue` | No | `string  &#124;  string[]` | - | Uncontrolled selection. |
| `inputValue` | No | `string` | - | Controlled input value. |
| `multiple` | No | `boolean` | `false` | - |
| `validateStatus` | No | `"default"  &#124;  "error"  &#124;  "success"  &#124;  "warning"` | - | - |
| `helpText` | No | `string` | - | - |
| `showHelpTextIcon` | No | `boolean` | `true` | - |
| `noResultsMessage` | No | `string` | `No results found for "{inputValue}"` | - |
| `clearable` | No | `boolean` | `true` | - |
| `selectionBehavior` | No | `"replace"  &#124;  "clear"  &#124;  "preserve"` | `replace` | - |
| `closeOnSelect` | No | `boolean` | `false` | - |
| `allowCustomValue` | No | `boolean` | `false` | - |
| `loopFocus` | No | `boolean` | `true` | - |
| `autoFocus` | No | `boolean` | `false` | - |
| `triggerIcon` | No | `string` | - | - |
| `clearIcon` | No | `string` | - | - |
| `onChange` | No | `(value: string  &#124;  string[]) => void` | - | - |
| `onInputValueChange` | No | `(value: string) => void` | - | - |
| `onOpenChange` | No | `(open: boolean) => void` | - | - |
| `inputBehavior` | No | `"autohighlight"  &#124;  "autocomplete"  &#124;  "none"` | `autocomplete` | - |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop. |

## Compound API
No compound subcomponents are exposed.

## Controlled State
Selection controlled via value/onChange or uncontrolled via defaultValue. Input value controlled via inputValue/onInputValueChange.

## Semantics And Accessibility
Label uses Zag getLabelProps; input and listbox use Zag props; status text for validation.

## Usage Pattern
```tsx
<Combobox />
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
