---
name: ui-molecule-menu
description: Use when working with the @libs/ui Menu molecule (src/molecules/menu.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Menu molecule
Use this skill to apply Menu correctly in UI work.

## Source Of Truth
- Read `src/molecules/menu.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Menu`
- `MenuItem`
- `MenuProps`

## Purpose
Zag menu with action, checkbox, radio, separator, and submenu items.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `items` | Yes | `MenuItem[]` | - | - |
| `triggerText` | No | `string` | `Menu` | - |
| `triggerIcon` | No | `IconType` | - | - |
| `customTrigger` | No | `ReactNode` | - | - |
| `className` | No | `string` | - | - |
| `onCheckedChange` | No | `(item: MenuItem, checked: boolean) => void` | - | - |
| `aria-label` | No | `string` | - | - |
| `dir` | No | `"ltr"  &#124;  "rtl"` | - | - |
| `id` | No | `string` | - | - |
| `closeOnSelect` | No | `boolean` | `true` | - |
| `loopFocus` | No | `boolean` | `true` | - |
| `typeahead` | No | `boolean` | `true` | - |
| `positioning` | No | `any` | - | - |
| `anchorPoint` | No | `any` | - | - |
| `open` | No | `boolean` | - | Controlled. |
| `defaultOpen` | No | `boolean` | - | Uncontrolled. |
| `composite` | No | `boolean` | - | - |
| `navigate` | No | `(value: string) => void` | - | - |
| `defaultHighlightedValue` | No | `string` | - | - |
| `highlightedValue` | No | `string` | - | - |
| `onHighlightChange` | No | `(details: { highlightedValue: string  &#124;  null }) => void` | - | - |
| `onSelect` | No | `(details: { value: string }) => void` | - | - |
| `onOpenChange` | No | `(details: { open: boolean }) => void` | - | - |
| `onEscapeKeyDown` | No | `(event: KeyboardEvent) => void` | - | - |
| `onPointerDownOutside` | No | `(event: PointerEvent) => void` | - | - |
| `onInteractOutside` | No | `(event: FocusEvent  &#124;  PointerEvent) => void` | - | - |
| `onFocusOutside` | No | `(event: FocusEvent) => void` | - | - |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop. |

## Compound API
- `SubmenuItem (internal)`

## Controlled State
Controlled via open/onOpenChange; otherwise defaultOpen.

## Semantics And Accessibility
Zag menu props on trigger/content/items; submenu uses nested menu machine and portal.

## Usage Pattern
```tsx
<Menu>
  <SubmenuItem (internal)>...</SubmenuItem (internal)>
  {/* compose subcomponents */}
</Menu>
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
