---
name: ui-molecule-popover
description: Use when working with the @libs/ui Popover molecule (src/molecules/popover.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Popover molecule
Use this skill to apply Popover correctly in UI work.

## Source Of Truth
- Read `src/molecules/popover.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Popover`
- `PopoverProps`

## Purpose
Zag popover with button trigger and optional title/description.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `trigger` | Yes | `ReactNode` | - | - |
| `children` | Yes | `ReactNode` | - | - |
| `open` | No | `boolean` | - | Controlled. |
| `defaultOpen` | No | `boolean` | - | Uncontrolled. |
| `onOpenChange` | No | `popover.Props["onOpenChange"]` | - | - |
| `placement` | No | `popover.Placement` | `bottom` | - |
| `offset` | No | `popover.PositioningOptions["offset"]` | `{ mainAxis: 8, crossAxis: 0 }` | - |
| `gutter` | No | `number` | `8` | - |
| `flip` | No | `boolean` | `true` | - |
| `slide` | No | `boolean` | `true` | - |
| `sameWidth` | No | `boolean` | `false` | - |
| `overflowPadding` | No | `number` | `8` | - |
| `showArrow` | No | `boolean` | `true` | - |
| `title` | No | `ReactNode` | - | - |
| `description` | No | `ReactNode` | - | - |
| `triggerRef` | No | `Ref<HTMLButtonElement>` | - | - |
| `contentRef` | No | `Ref<HTMLDivElement>` | - | - |
| `triggerClassName` | No | `string` | - | - |
| `contentClassName` | No | `string` | - | - |
| `disabled` | No | `boolean` | `false` | - |
| `modal` | No | `boolean` | `false` | - |
| `closeOnInteractOutside` | No | `boolean` | `true` | - |
| `closeOnEscape` | No | `boolean` | `true` | - |
| `autoFocus` | No | `boolean` | `true` | - |
| `portalled` | No | `boolean` | `true` | - |
| `id` | No | `string` | - | - |
| `onPointerDownOutside` | No | `popover.Props["onPointerDownOutside"]` | - | - |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop. |
| `shadow` | No | `boolean` | `true` | Variant prop. |
| `border` | No | `boolean` | `true` | Variant prop. |

## Compound API
No compound subcomponents are exposed.

## Controlled State
Controlled via open/onOpenChange; uncontrolled via defaultOpen.

## Semantics And Accessibility
Zag popover props for trigger/content/title/description; portal optional.

## Usage Pattern
```tsx
<Popover />
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
