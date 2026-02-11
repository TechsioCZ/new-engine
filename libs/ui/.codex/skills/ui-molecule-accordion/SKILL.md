---
name: ui-molecule-accordion
description: Use when working with the @libs/ui Accordion molecule (src/molecules/accordion.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Accordion molecule
Use this skill to apply Accordion correctly in UI work.

## Source Of Truth
- Read `src/molecules/accordion.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Accordion`
- `AccordionProps`

## Purpose
Accordion root with Zag state machine and compound subcomponents for items, headers, content, and indicators.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | No | `string` | - | - |
| `defaultValue` | No | `string[]` | - | Uncontrolled expanded values. |
| `value` | No | `string[]` | - | Controlled expanded values. |
| `collapsible` | No | `boolean` | `true` | - |
| `multiple` | No | `boolean` | `false` | - |
| `disabled` | No | `boolean` | `false` | - |
| `dir` | No | `"ltr"  &#124;  "rtl"` | `ltr` | - |
| `onChange` | No | `(value: string[]) => void` | - | - |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop. |
| `shadow` | No | `"sm"  &#124;  "md"  &#124;  "none"` | `none` | Variant prop. |
| `variant` | No | `"default"  &#124;  "borderless"  &#124;  "child"` | `default` | Variant prop. |
| `className` | No | `string` | - | - |
| `children` | No | `ReactNode` | - | - |
| `ref` | No | `Ref<HTMLDivElement>` | - | - |

## Compound API
- `Accordion.Item`
- `Accordion.Header`
- `Accordion.Content`
- `Accordion.Indicator`
- `Accordion.Title`
- `Accordion.Subtitle`

## Controlled State
Controlled with value/onChange; uncontrolled with defaultValue. collapsible and multiple forwarded to Zag machine.

## Semantics And Accessibility
Zag accordion props applied to root/item/trigger/content; header trigger is a button; content gets data-state.

## Usage Pattern
```tsx
<Accordion>
  <Accordion.Item>...</Accordion.Item>
  <Accordion.Header>...</Accordion.Header>
</Accordion>
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
