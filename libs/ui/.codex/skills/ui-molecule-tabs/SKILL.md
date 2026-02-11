---
name: ui-molecule-tabs
description: Use when working with the @libs/ui Tabs molecule (src/molecules/tabs.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Tabs molecule
Use this skill to apply Tabs correctly in UI work.

## Source Of Truth
- Read `src/molecules/tabs.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Tabs`
- `TabsProps`

## Purpose
Zag tabs with compound subcomponents for list, triggers, content, and indicator.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | No | `string` | - | - |
| `defaultValue` | No | `string` | - | Uncontrolled. |
| `value` | No | `string` | - | Controlled. |
| `orientation` | No | `"horizontal"  &#124;  "vertical"` | `horizontal` | - |
| `dir` | No | `"ltr"  &#124;  "rtl"` | `ltr` | - |
| `activationMode` | No | `"automatic"  &#124;  "manual"` | `automatic` | - |
| `loopFocus` | No | `boolean` | `true` | - |
| `onValueChange` | No | `(value: string) => void` | - | - |
| `variant` | No | `"default"  &#124;  "line"  &#124;  "solid"  &#124;  "outline"` | `default` | Variant prop. |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop. |
| `fitted` | No | `boolean` | `false` | Variant prop. |
| `justify` | No | `"start"  &#124;  "center"  &#124;  "end"` | - | Variant prop. |
| `className` | No | `string` | - | - |
| `children` | No | `ReactNode` | - | - |
| `ref` | No | `Ref<HTMLDivElement>` | - | - |

## Compound API
- `Tabs.List`
- `Tabs.Trigger`
- `Tabs.Content`
- `Tabs.Indicator`

## Controlled State
Controlled via value/onValueChange; uncontrolled via defaultValue.

## Semantics And Accessibility
Zag tabs props for root/list/trigger/content/indicator; triggers are buttons.

## Usage Pattern
```tsx
<Tabs>
  <Tabs.List>...</Tabs.List>
  <Tabs.Trigger>...</Tabs.Trigger>
</Tabs>
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
