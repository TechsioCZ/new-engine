---
name: ui-molecule-switch
description: Use when working with the @libs/ui Switch molecule (src/molecules/switch.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Switch molecule
Use this skill to apply Switch correctly in UI work.

## Source Of Truth
- Read `src/molecules/switch.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Switch`
- `SwitchProps`

## Purpose
Zag switch with label and optional help text.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | No | `string` | - | - |
| `name` | No | `string` | - | - |
| `value` | No | `string  &#124;  number` | - | - |
| `checked` | No | `boolean` | - | Controlled. |
| `defaultChecked` | No | `boolean` | - | Uncontrolled. |
| `disabled` | No | `boolean` | `false` | - |
| `readOnly` | No | `boolean` | `false` | - |
| `required` | No | `boolean` | `false` | - |
| `children` | No | `ReactNode` | - | Label text. |
| `onCheckedChange` | No | `(checked: boolean) => void` | - | - |
| `className` | No | `string` | - | - |
| `dir` | No | `"ltr"  &#124;  "rtl"` | `ltr` | - |
| `validateStatus` | No | `"default"  &#124;  "error"  &#124;  "success"  &#124;  "warning"` | - | - |
| `helpText` | No | `ReactNode` | - | - |
| `showHelpTextIcon` | No | `boolean` | `true` | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
Controlled via checked/onCheckedChange; uncontrolled via defaultChecked.

## Semantics And Accessibility
Label wraps input/control; hidden input from Zag; invalid state passed via validateStatus.

## Usage Pattern
```tsx
<Switch />
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
