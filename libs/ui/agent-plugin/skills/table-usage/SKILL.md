---
name: table-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Table for
  semantic tabular data with caption, header, body, footer, rows, column
  headers, numeric cells, selected rows, variants, interactive rows, sticky
  header/first column, column borders, and size props.
metadata:
  component_version: "1.2.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: "libs/ui/src/organisms/table.tsx libs/ui/src/tokens/components/organisms/_table.css libs/ui/stories/organisms/table.stories.tsx"
---

# @techsio/ui-kit Table Usage

Use Table for semantic tabular data. Do not use div grids for data tables when
table semantics are needed.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Table`.

**Use it when**

- Static or lightly interactive tabular data: invoice lines, order items, spec sheets, comparison tables.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Sorting, filtering, selection, paging, inline edit | DataTable |
| Layout of non-tabular content | grid/flex layout |
| Trends | Chart |

**Do**

- Use `numeric` on number/money cells and their headers so they end-align; add `tabular-nums` (ux-guidelines/formatting#alignment-in-tables).
- Keep precision equal within a column; totals row repeats alignment with a top border.
- Render missing values as `—`; format dates/numbers with `Intl`.
- Add a caption or heading that names the data.

**Don't**

- Use `$` + `toFixed(2)` or raw ISO dates in cells.
- Center numeric columns or mix alignments between header and cells.

**Copy and states**

- Column headers short nouns with units (`Qty`, `Unit price (€)`).

## Setup

```tsx
<Table variant="line" size="md" stickyHeader>
  <Table.Caption>Orders</Table.Caption>
  <Table.Header>
    <Table.Row><Table.ColumnHeader>Order</Table.ColumnHeader><Table.ColumnHeader numeric>Total</Table.ColumnHeader></Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row selected={isSelected}><Table.Cell>#1001</Table.Cell><Table.Cell numeric className="tabular-nums">{money.format(129)}</Table.Cell></Table.Row>
  </Table.Body>
</Table>
```

Supported props:

```text
variant: line | outline | striped
size: sm | md | lg
interactive, stickyHeader, stickyFirstColumn, showColumnBorder
captionPlacement: top | bottom
Row selected
ColumnHeader/Cell numeric, data-align: start | center | end
parts: Caption, Header, Body, Footer, Row, ColumnHeader, Cell
```

## Core Patterns

### Use semantic table parts

Use Table.Header/Body/Footer and ColumnHeader/Cell rather than div grids.

### Mark numeric columns

Use `numeric` on headers and cells for right alignment. It asserts that the
value *is* a number, so keep it for money, counts and measures.

### Align a column deliberately

`data-align="start | center | end"` on a ColumnHeader/Cell is a pure
presentation choice — reach for it when the column is not numeric, e.g. a
centred icon, status or boolean column.

```tsx
<Table.ColumnHeader data-align="center">In stock</Table.ColumnHeader>
<Table.Cell data-align="center">{inStock ? 'Yes' : 'No'}</Table.Cell>
```

Set `numeric` or `data-align`, not both — combining them with conflicting
directions leaves the winner up to stylesheet order.

### Use selected/interactive props

Use `selected` on rows and `interactive` on the root; do not add hover/selected
classes to rows.

## Common Mistakes

### HIGH Div-based data table

Wrong:

```tsx
<div className="grid grid-cols-3"><div>Order</div><div>Total</div></div>
```

Correct:

```tsx
<Table><Table.Header><Table.Row><Table.ColumnHeader>Order</Table.ColumnHeader></Table.Row></Table.Header></Table>
```

Source: libs/ui/src/organisms/table.tsx

### HIGH Inline row/cell styling

Wrong:

```tsx
<Table.Row className="hover:bg-gray-50 border-b" />
```

Correct:

```tsx
<Table interactive><Table.Row selected={selected} /></Table>
```

Source: libs/ui/src/tokens/components/organisms/_table.css

### MEDIUM Numeric alignment via class

Wrong:

```tsx
<Table.Cell className="text-right">{total}</Table.Cell>
```

Correct:

```tsx
<Table.Cell numeric>{total}</Table.Cell>
```

Source: libs/ui/src/organisms/table.tsx

## Validation Commands

```sh
rg -n "grid-cols.*(Order|Total|Price)|<table\\b|<Table\\.(Row|Cell|ColumnHeader)[^>]*className=.*(hover:|border-|text-right|p-)" apps
rg -n "<Table\\.Cell[^>]*className=\"[^\"]*text-right|<Table\\.ColumnHeader[^>]*className=\"[^\"]*text-right" apps
rg -n "<Table[^>]*variant=\"(default|bordered)\"|captionPlacement=\"(left|right)\"" apps
```

