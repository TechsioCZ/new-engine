---
name: ui-molecule-dialog
description: Use when working with the @libs/ui Dialog molecule (src/molecules/dialog.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Dialog molecule
Use this skill to apply Dialog correctly in UI work.

## Source Of Truth
- Read `src/molecules/dialog.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Dialog`
- `DialogProps`

## Purpose
Zag dialog with optional trigger button, portal, and slot-like props for title/description/actions.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `open` | No | `boolean` | - | Controlled open. |
| `onOpenChange` | No | `(details: { open: boolean }) => void` | - | - |
| `initialFocusEl` | No | `() => HTMLElement  &#124;  null` | - | - |
| `finalFocusEl` | No | `() => HTMLElement  &#124;  null` | - | - |
| `closeOnEscape` | No | `boolean` | `true` | - |
| `closeOnInteractOutside` | No | `boolean` | `true` | - |
| `preventScroll` | No | `boolean` | `true` | - |
| `trapFocus` | No | `boolean` | `true` | - |
| `role` | No | `"dialog"  &#124;  "alertdialog"` | `dialog` | - |
| `id` | No | `string` | - | - |
| `customTrigger` | No | `boolean` | `false` | - |
| `triggerText` | No | `string` | `Open` | - |
| `title` | No | `ReactNode` | - | - |
| `description` | No | `ReactNode` | - | - |
| `children` | No | `ReactNode` | - | - |
| `actions` | No | `ReactNode` | - | - |
| `hideCloseButton` | No | `boolean` | `false` | - |
| `className` | No | `string` | - | - |
| `modal` | No | `boolean` | `true` | - |
| `portal` | No | `boolean` | `true` | - |
| `placement` | No | `"center"  &#124;  "left"  &#124;  "right"  &#124;  "top"  &#124;  "bottom"` | `center` | Variant prop. |
| `position` | No | `"fixed"  &#124;  "absolute"  &#124;  "sticky"  &#124;  "relative"` | `fixed` | Variant prop. |
| `size` | No | `"xs"  &#124;  "sm"  &#124;  "md"  &#124;  "lg"  &#124;  "xl"  &#124;  "full"` | `md` | Variant prop. |
| `behavior` | No | `"modal"  &#124;  "modeless"` | `modal` | Variant prop. |

## Compound API
No compound subcomponents are exposed.

## Controlled State
Controlled via open/onOpenChange; otherwise internal state.

## Semantics And Accessibility
Uses Zag dialog props for role, aria labeling/description, focus management; close trigger button included.

## Usage Pattern
```tsx
<Dialog />
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
