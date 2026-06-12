---
name: table-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Table for
  semantic tabular data with caption, header, body, footer, rows, column
  headers, numeric cells, selected rows, variants, interactive rows, sticky
  header/first column, column borders, and size props.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/organisms/table.tsx"
  - "libs/ui/src/tokens/components/organisms/_table.css"
  - "libs/ui/stories/organisms/table.stories.tsx"
---

# @techsio/ui-kit Table Usage

Use Table for semantic tabular data. Do not use div grids for data tables when
table semantics are needed.

## Setup

```tsx
<Table variant="line" size="md" stickyHeader>
  <Table.Caption>Orders</Table.Caption>
  <Table.Header>
    <Table.Row><Table.ColumnHeader>Order</Table.ColumnHeader><Table.ColumnHeader numeric>Total</Table.ColumnHeader></Table.Row>
  </Table.Header>
  <Table.Body>
    <Table.Row selected={isSelected}><Table.Cell>#1001</Table.Cell><Table.Cell numeric>129 EUR</Table.Cell></Table.Row>
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
ColumnHeader/Cell numeric
parts: Caption, Header, Body, Footer, Row, ColumnHeader, Cell
```

## Core Patterns

### Use semantic table parts

Use Table.Header/Body/Footer and ColumnHeader/Cell rather than div grids.

### Mark numeric columns

Use `numeric` on headers and cells for right alignment.

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

