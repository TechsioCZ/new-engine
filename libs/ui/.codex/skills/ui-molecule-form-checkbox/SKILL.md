---
name: ui-molecule-form-checkbox
description: Use when working with the @libs/ui FormCheckbox molecule (src/molecules/form-checkbox.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# FormCheckbox molecule
Use this skill to apply FormCheckbox correctly in UI work.

## Source Of Truth
- Read `src/molecules/form-checkbox.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `FormCheckbox`
- `FormCheckboxProps`

## Purpose
Checkbox with label and optional help text/status.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | No | `string` | - | - |
| `name` | No | `string` | - | - |
| `value` | No | `string` | - | - |
| `checked` | No | `boolean` | - | Controlled. |
| `defaultChecked` | No | `boolean` | - | Uncontrolled. |
| `indeterminate` | No | `boolean` | - | - |
| `disabled` | No | `boolean` | `false` | - |
| `required` | No | `boolean` | `false` | - |
| `readOnly` | No | `boolean` | `false` | - |
| `children` | No | `ReactNode` | - | Label content fallback. |
| `label` | No | `ReactNode` | - | Overrides children. |
| `helpText` | No | `ReactNode` | - | - |
| `validateStatus` | No | `"default"  &#124;  "error"  &#124;  "success"  &#124;  "warning"` | `default` | - |
| `showHelpTextIcon` | No | `boolean` | `validateStatus !== "default"` | - |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | - |
| `className` | No | `string` | - | - |
| `onCheckedChange` | No | `(checked: boolean) => void` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
Controlled via checked/onCheckedChange; uncontrolled via defaultChecked.

## Semantics And Accessibility
Zag checkbox props applied; hidden input for form; label wraps control; required indicator shown.

## Usage Pattern
```tsx
<FormCheckbox />
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
