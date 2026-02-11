---
name: ui-molecule-form-input
description: Use when working with the @libs/ui FormInput molecule (src/molecules/form-input.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# FormInput molecule
Use this skill to apply FormInput correctly in UI work.

## Source Of Truth
- Read `src/molecules/form-input.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `FormInputRaw`
- `FormInput`

## Purpose
Labeled input with optional validation help text.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | Yes | `string` | - | - |
| `label` | Yes | `ReactNode` | - | - |
| `validateStatus` | No | `"default"  &#124;  "error"  &#124;  "success"  &#124;  "warning"` | `default` | - |
| `helpText` | No | `ReactNode` | - | - |
| `showHelpTextIcon` | No | `boolean` | `validateStatus !== "default"` | - |
| `size` | No | `string` | `md` | From InputProps size. |
| `required` | No | `boolean` | - | - |
| `disabled` | No | `boolean` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Label uses htmlFor/id; input receives required/disabled; help text uses StatusText when provided.

## Usage Pattern
```tsx
<FormInput />
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
