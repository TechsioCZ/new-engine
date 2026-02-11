---
name: ui-molecule-search-form
description: Use when working with the @libs/ui SearchForm molecule (src/molecules/search-form.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# SearchForm molecule
Use this skill to apply SearchForm correctly in UI work.

## Source Of Truth
- Read `src/molecules/search-form.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `SearchForm`
- `SearchFormProps`
- `SearchFormSize`
- `useSearchFormContext`
- `searchFormVariants`

## Purpose
Search form with controlled/uncontrolled input and compound subcomponents for label, input, button, and clear button.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `children` | Yes | `ReactNode` | - | - |
| `defaultValue` | No | `string` | - | Uncontrolled initial value. |
| `value` | No | `string` | - | Controlled value. |
| `onValueChange` | No | `(value: string) => void` | - | - |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop. |
| `className` | No | `string` | - | - |
| `ref` | No | `Ref<HTMLFormElement>` | - | - |
| `onSubmit` | No | `(e: FormEvent<HTMLFormElement>) => void` | - | Prevented by default then forwarded. |

## Compound API
- `SearchForm.Label`
- `SearchForm.Control`
- `SearchForm.Input`
- `SearchForm.Button`
- `SearchForm.ClearButton`

## Controlled State
Controlled via value/onValueChange; uncontrolled via defaultValue with internal state.

## Semantics And Accessibility
Uses <search> wrapper; input type="search" with aria-label; clear button has aria-label.

## Usage Pattern
```tsx
<SearchForm>
  <SearchForm.Label>...</SearchForm.Label>
  <SearchForm.Control>...</SearchForm.Control>
</SearchForm>
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
