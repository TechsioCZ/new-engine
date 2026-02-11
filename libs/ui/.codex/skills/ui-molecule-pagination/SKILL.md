---
name: ui-molecule-pagination
description: Use when working with the @libs/ui Pagination molecule (src/molecules/pagination.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Pagination molecule
Use this skill to apply Pagination correctly in UI work.

## Source Of Truth
- Read `src/molecules/pagination.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Pagination`
- `PaginationProps`

## Purpose
Zag pagination with page links and optional compact mode.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `page` | No | `number` | - | Controlled. |
| `defaultPage` | No | `number` | `1` | Uncontrolled. |
| `count` | Yes | `number` | - | Total items. |
| `pageSize` | No | `number` | `10` | - |
| `siblingCount` | No | `number` | `1` | - |
| `showPrevNext` | No | `boolean` | `true` | - |
| `onPageChange` | No | `(page: number) => void` | - | - |
| `dir` | No | `"ltr"  &#124;  "rtl"` | `ltr` | - |
| `linkAs` | No | `ElementType  &#124;  ReactElement<HTMLAnchorElement>` | - | - |
| `compact` | No | `boolean` | `false` | - |
| `variant` | No | `"filled"  &#124;  "outlined"  &#124;  "minimal"` | `filled` | Variant prop. |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Variant prop. |
| `className` | No | `string` | - | - |

## Compound API
No compound subcomponents are exposed.

## Controlled State
Controlled via page/onPageChange; uncontrolled via defaultPage.

## Semantics And Accessibility
Nav with aria-label, list of buttons/links; aria-current set for current page.

## Usage Pattern
```tsx
<Pagination />
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
