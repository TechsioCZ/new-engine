<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/datatable--3399-330.md and table-cell, table-columnheader, table-detailpanel, table-emptystate, table-expandtoggle, table-filterrow, table-iconbutton, table-paginationbar, table-row, table-toolbar docs, edited. Storybook: Organisms/DataTable → UX guidelines. -->

# DataTable: UX guidelines

DataTable shows a collection that users search, sort, filter, select, edit and
page through. The app owns the query; the table keeps rows, results, ranges and
indicators consistent with it.

## When to use

- Collections users search, sort, filter, select, edit inline and page
  through. The default for admin lists.
- Any list that is the main content of a page (orders, products, customers).

## Use something else when

| Need | Use instead |
| --- | --- |
| A small static table (spec sheet, invoice lines) | `Table` |
| Data that can't be compared column by column | cards or a list |
| Browsing products visually | a `ProductCard` grid |
| A trend over time | `Chart` |
| Editing a whole record with cross-field validation | the drawer or a full form, not inline edit |

## Anatomy

- **Toolbar**: global search, view controls and up to three own actions;
  more go into a `Menu`. The page's primary action lives in the page header,
  not here.
- **Column headers**: name, unit, sort indicator, optional filter.
- **Filter row**: typed controls per column (`enableColumnFilters` + `meta.type`).
- **Rows and cells**: the records; a row's actions live in `rowActions`.
- **Expand toggle and detail panel**: `enableExpanding` + `renderExpandedRow`,
  owned by the same parent row.
- **Pagination bar**: page, range and page size.
- **Empty state**: one of three cases (below).

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| toolbar / filter row / pagination `size=md` | `size="sm" \| "md" \| "lg"` | One size for every nested control. `sm` for scanning, `md` when rows are edited inline. |
| column header `sort=none` | sortable, unsorted | The column can be sorted but isn't yet. |
| column header `sort=asc` / `desc` | the current sort | Shown only once the data is actually sorted that way. |
| `state=loading` | `loading`, `loadingMore` | First load shows skeleton rows; a refresh keeps the rows. |
| `Table.IconButton` | `ActionIcon` | There is no Table.IconButton component; icon actions are ActionIcon with an `aria-label`. |

## Behaviour

**May:** read values by row and column; search, filter, sort, select and run
row actions, each with its own purpose and on the right records.

**Must not:** treat one click as both selecting a row and opening its detail;
mix up an empty database, a filter with no matches and a load error.

- Row click = read (detail drawer). Edit and delete live in `rowActions`,
  delete last with `tone: "danger"`. Expanding a row never selects it.
- A filter change updates both the results and the pagination.
- A failed sort, filter or page load reverts the indicator and keeps the
  previous rows recognisable, with a way to retry. Don't show the new sort
  arrow as applied.
- Refreshing never blanks the table: keep the rows and show progress in the
  toolbar.
- Inline edit follows the [value lifecycle](../../ux-guidelines/references/value-lifecycle.md):
  the draft, the confirmed value and any error belong to the right row and
  column. Cancel restores the last saved value; moving focus never silently
  commits another row's edit. The kit locks sorting, filtering and paging
  while a row is being edited.

## Content and copy

- Column headers are short nouns in sentence case, with units when shared:
  `Price (€)` — cs: `Cena (Kč)`.
- Numbers, money and percentages are end-aligned with tabular figures; text
  and dates are start-aligned. Missing values render as `—`
  ([Formatting](../../ux-guidelines/references/formatting.md)).
- Search placeholder: `Search <objects>…` — cs: `Hledat objednávky…`.
- Inline edit success → toast `<Object> saved`; errors stay on the cell editor.
- Three empty states, chosen from the app's state through `translations` or
  `renderEmpty`:
  1. first use (explain and offer create),
  2. no matches (name the filter, offer `Clear filters`),
  3. load error (say it failed, offer `Try again`).

  A failed load never reads as `No records`.

## Accessibility

- Header-to-cell association, units and row identity stay readable.
- Links and buttons in cells are named and keyboard reachable. They don't make
  the table an ARIA grid: keep the normal tab order and don't add arrow-key
  cell navigation.
- A truncated value that matters for a decision is fully readable without
  hover (focus, the detail panel or a wider column).
- Expand toggles use a chevron, never ×, and say whether the row is expanded.
- The page-size select has an accessible name even without a visible label.
- Drag reordering always has a keyboard alternative.

## Edge cases

- **Filter returns nothing**: offer to change the filter; never claim there
  are no orders at all.
- **Sort request fails**: revert the header to its previous sort and keep the
  rows.
- **Validation fails while editing a row**: the editor stays open with the
  draft and the message on the cell; sorting, filtering and paging stay locked
  until the user saves or cancels.

## Related

- [Formatting](../../ux-guidelines/references/formatting.md): alignment in tables.
- [States](../../ux-guidelines/references/states.md): empty, loading.
- [Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md): the CRUD loop.
- [Dialog](../../dialog-usage/references/ux.md): the detail drawer.
