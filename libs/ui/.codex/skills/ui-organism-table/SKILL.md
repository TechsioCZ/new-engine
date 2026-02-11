---
name: ui-organism-table
description: Use when working with the @libs/ui Table organism (src/organisms/table.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Table organism
Use this skill to apply Table correctly in UI work.

## Source Of Truth
- Read `src/organisms/table.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Table`

## Purpose
Semantic table with configurable variants, sizing, sticky header/column, and compound subcomponents for all table parts.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `variant` | No | `"line"  &#124;  "outline"  &#124;  "striped"` | `line` | Affects root/row styling. |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"` | `md` | Controls padding/text sizes. |
| `interactive` | No | `boolean` | `false` | Adds hover/cursor styles on rows. |
| `stickyHeader` | No | `boolean` | `false` | Makes column headers sticky. |
| `stickyFirstColumn` | No | `boolean` | `false` | Makes first column sticky. |
| `showColumnBorder` | No | `boolean` | `false` | Adds column borders. |
| `captionPlacement` | No | `"top"  &#124;  "bottom"` | `top` | Positions caption. |
| `children` | No | `ReactNode` | - | Rendered inside <table>. |
| `ref` | No | `RefObject<HTMLTableElement>` | - | Forwarded to <table>. |

## Compound API
- `Table.Caption`
- `Table.Header`
- `Table.Body`
- `Table.Footer`
- `Table.Row`
- `Table.ColumnHeader`
- `Table.Cell`

## Controlled State
No internal state. All configuration via props and shared through context to subcomponents.

## Semantics And Accessibility
Uses semantic <table>, <caption>, <thead>, <tbody>, <tfoot>, <tr>, <th>, <td>; column headers set scope="col"; data attributes used for state (selected, numeric).

## Usage Pattern
```tsx
<Table>
  <Table.Caption>...</Table.Caption>
  <Table.Header>...</Table.Header>
</Table>
```

## UI/UX Rules
- Use this component instead of raw HTML when an equivalent organism exists.
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
