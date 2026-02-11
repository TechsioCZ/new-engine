---
name: ui-molecule-form-numeric-input
description: Use when working with the @libs/ui FormNumericInput molecule (src/molecules/form-numeric-input.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# FormNumericInput molecule
Use this skill to apply FormNumericInput correctly in UI work.

## Source Of Truth
- Read `src/molecules/form-numeric-input.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `FormNumericInput`

## Purpose
Labeled numeric input wrapper with StatusText.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | Yes | `string` | - | - |
| `label` | Yes | `ReactNode` | - | - |
| `validateStatus` | No | `"default"  &#124;  "error"  &#124;  "success"  &#124;  "warning"` | `default` | - |
| `helpText` | No | `ReactNode` | - | - |
| `showHelpTextIcon` | No | `boolean` | `validateStatus !== "default"` | - |
| `children` | Yes | `ReactNode` | - | NumericInput children. |
| `size` | No | `string` | `md` | From NumericInputProps size. |
| `required` | No | `boolean` | - | - |
| `disabled` | No | `boolean` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Label uses htmlFor/id; NumericInput receives invalid/required/disabled.

## Usage Pattern
```tsx
<FormNumericInput />
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
