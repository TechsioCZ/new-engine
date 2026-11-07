<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/pagination--2774-32388.md, edited. Storybook: Molecules/Pagination → UX guidelines. -->

# Pagination: UX guidelines

Pagination moves through the pages of one stable result set. The query,
filters and sort stay the same; only the page changes. The app owns the data,
the total and the page size.

## When to use

- Page-based navigation of results where position matters and users come
  back to it: admin tables, search results, article archives.

## Use something else when

| Need | Use instead |
| --- | --- |
| Stages of a task or a long form | `Steps` (never split a form with pages) |
| A sequence of slides | `Carousel` |
| A small set | show everything |
| Feed-like storefront browsing | a `Load more` Button with the count |

## Anatomy

- **Previous / Next**: go one page back or forward (`showPrevNext`).
- **Page links**: real `href` destinations (`getPageUrl`), with the current
  page marked.
- **Ellipsis**: stands for skipped pages. It is not a page.
- **Compact summary** (`compact`): `Page 3 of 12` instead of the numbers.
- Range text (`51–100 of 240`) and the page-size select live next to it, in
  the host (DataTable's pagination bar or the page).

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `variant=filled` / `outlined` / `minimal` | `variant="filled" \| "outlined" \| "minimal"` | Visual only; the data logic is the same. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Same control heights as Button and Tabs. |
| — | `page` / `defaultPage`, `count`, `pageSize` | The current page and the bounds, from the app's real result. |
| — | `siblingCount`, `boundaryCount` | How many numbers show around the current page and at the ends. |
| — | `compact`, `compactLabel` | Summary text for very narrow spaces. |
| first / last page | unavailable Prev / Next | Rendered as non-interactive placeholders, not buttons. |

## Behaviour

**May:** go to an available previous, next or specific page; update the
current page from the results actually loaded.

**Must not:** split one form or linear process into pages; promise a next
page that doesn't exist.

- Changing page keeps the query, filters and sort, and puts the page in the
  URL so back and refresh return to it.
- The current page always matches the data on screen. After a filter or
  page-size change shrinks the range, move to an existing page instead of
  showing an empty one.
- Selection across pages, if offered, has its own clearly scoped control
  outside Pagination; the page number is never a selected-items count.
- After changing page, scroll to the top of the list, not the page.

## Content and copy

- Range and total use the app locale: `51–100 of 240` — cs: `51–100 z 240`.
- Control names: `Previous page`, `Next page`, `Page 3` — cs:
  `Předchozí stránka`, `Další stránka`, `Stránka 3` (via `translations`).
- Page-size options are few (25, 50, 100) and the choice is remembered.

## Accessibility

- The kit renders a `nav` of real links, marks the current page with
  `aria-current="page"`, and makes unavailable Prev / Next non-focusable.
- Localise the `translations` and the root `aria-label`; RTL swaps only the
  arrow glyphs.
- The current page differs from the others by more than colour (`minimal`
  keeps an underline).

## Edge cases

- **Filter change on page 7 of orders**: the result has 3 pages, so the view
  moves to page 3 (or 1), never to an empty page 7.
- **Last page of an article archive**: `Next` is unavailable rather than
  promising more content.
- **Zero results**: no numbered pages, both directions inactive; the host
  shows its empty state.

## Related

- [Formatting](../../ux-guidelines/references/formatting.md): number ranges.
- [States](../../ux-guidelines/references/states.md): empty results.
- [DataTable](../../data-table-usage/references/ux.md): the pagination bar.
