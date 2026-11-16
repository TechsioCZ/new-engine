<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/table--3938-1793.md, edited (DataTable-only text moved to the DataTable page). Storybook: Organisms/Table → UX guidelines. -->

# Table: UX guidelines

Table lays out comparable values in rows and columns so users can read and
compare the same attributes across records. It shows the data it's given; it
doesn't search, filter, sort, page or edit.

## When to use

- Static or lightly interactive tabular data: invoice lines, order items, spec
  sheets, comparison tables.
- Rows that open a record when clicked (`interactive`), or rows the app marks as
  selected.

## Use something else when

| Need | Use instead |
| --- | --- |
| Search, sort, filter, selection tools, paging or inline edit | `DataTable` |
| Data that can't be compared column by column | cards or a list |
| A trend over time | `Chart` |
| Layout of non-tabular content | grid or flex layout |

## Anatomy

`Table.Caption` (names the data), `Table.Header` with `Table.ColumnHeader`,
`Table.Body` with `Table.Row` and `Table.Cell`, optional `Table.Footer` for
totals.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `variant=line` | `appearance="line"` | Rows separated by lines. |
| `variant=outline` | `appearance="outline"` | A border around the table; doesn't change what it does. |
| `variant=striped` | `appearance="striped"` | Alternating rows for long rows. Stripes never read as selected or error. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` (default `md`) | Density only. |
| — | `interactive` | Rows with `onClick` get hover, a tab stop, and Enter / Space activation. |
| — | `Table.Row selected` | The row the app has selected (`aria-selected`). |
| — | `stickyHeader`, `stickyFirstColumn`, `showColumnBorder`, `captionPlacement="top" \| "bottom"` | Reading aids for long or wide tables. |
| — | `numeric`, `data-align` on ColumnHeader / Cell | Alignment: `numeric` for numbers, `data-align` for other columns. |

## Behaviour

**May:** show values by row and column; let a row open its record when
`interactive`.

**Must not:** treat one click as both selecting a row and opening its detail;
mix up no data, no matches and a failed load.

- A link or button in a cell doesn't turn the table into a grid: keep the
  normal tab order, no `role="grid"`, no arrow-key cell navigation.
- An interactive row has a visible destination or action; hover alone isn't
  the signal. Keyboard events from controls inside the row don't activate it.
- Every value stays with its row and column, including after the data
  refreshes.
- Table has no sort, filter or reorder controls. When the data needs them, use
  `DataTable`, whose glyphs mean: unfold arrows = sortable but not sorted
  yet; filter = open filter conditions (it never deletes the rows it hides);
  horizontal drag handle = move a row, vertical = move a column, each with a
  keyboard alternative.

## Content and copy

- A caption or heading names the data: `Order items` — cs: `Položky objednávky`.
- Column headers are short nouns with units: `Qty`, `Unit price (€)` — cs:
  `Množství`, `Cena za kus (Kč)`.
- Numbers end-aligned with tabular figures and equal precision per column;
  missing values `—`; dates and money through `Intl`
  ([Formatting](../../ux-guidelines/references/formatting.md)).
- No data, no matches and a failed load have different messages; the app
  renders them in place of the body ([States](../../ux-guidelines/references/states.md)).

## Accessibility

- The kit keeps native table semantics with column-scoped headers, so each cell
  is announced with its header.
- Selection sets `aria-selected`; pass `selected={false}` on selectable rows
  that aren't selected.
- Wide tables go in a labelled, keyboard-focusable horizontal scroll region,
  never a page that overflows on mobile.
- Links and buttons in cells are named and keyboard reachable.

## Edge cases

- **Data stops being comparable** (each record has different fields): switch
  to cards.
- **A total row**: put it in `Table.Footer` with the same alignment and a top
  border.

## Related

- [DataTable](../../data-table-usage/references/ux.md): the tool version with query, selection and edit.
- [Formatting](../../ux-guidelines/references/formatting.md): alignment in tables.
- [States](../../ux-guidelines/references/states.md): empty and error.
