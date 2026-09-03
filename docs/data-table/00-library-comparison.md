# DataTable — library comparison and rationale

> Background for the decision on which library to build the new `DataTable` component in `libs/ui` on.
> Each library's documentation was fetched via **context7 MCP** (official sources) and mapped onto our requirement list.
> Analysis date: 2026-07-25.

## TL;DR

The hard requirement was: **headless, with open paths through props — able to shape the DOM and reach nested layers**, so the table fits our DS (Zag.js + Tailwind, DOM-first, `data-[...]` states, design tokens via CSS).

The whole comparison turns on **a single axis: canvas vs. DOM rendering.**

| Library | Rendering | Headless | Tailwind on cells | DS integration | Verdict |
|---|---|---|---|:--:|---|
| **TanStack Table** v8/v9 | **DOM** (you render it) | **yes, 100%** | **yes** | **1–2 / 5** | ✅ natural fit for the DS |
| **VTable** (Bytedance) | **canvas** (VRender) | no | no | 5 / 5 | ⚠️ most features out of the box, but outside the DS |
| **AntV S2** (Alibaba/Ant) | **canvas** (AntV/G) | no | no | 5 / 5 | ❌ pivot/analytics, not a styleable grid |
| ali-react-table (Alibaba) | DOM | partially | yes | 4 / 5 | ❌ dead project, Chinese-only docs, no context7 coverage |
| _(baseline)_ antd Table | DOM | no (CSS-in-JS) | override wars | 3 / 5 | ⚠️ not headless |

> **The "DS integration" scale is integration cost/effort (1 = least, 5 = most), not library quality.** That is why TanStack scores `1–2 / 5` and wins, while the canvas libraries score `5 / 5` and lose.

**A clarification on "the Alibaba table":** what we had in mind (`ali-react-table`) is effectively unmaintained, documented only in Chinese, with zero context7 coverage. The genuinely live "Alibaba/Ant Group" table is **AntV S2** — but that is a canvas pivot/analytics table. So VTable (Bytedance) and S2 (Alibaba) are **both canvas** and hit the same problem.

## Why canvas is a problem for our DS

VTable and S2 both draw cells as **pixels on a single `<canvas>`**:

- **No per-cell DOM nodes** → no `className`, no `data-[validation=error]`, no CSS variables, no Tailwind on the table's content.
- Styling goes through a **parallel JS "theme" object** (`themeCfg`, VRender style objects) — we would have to **duplicate our entire token system** into a second language and maintain a bridge adapter.
- "Nested layers through props" does not really exist — you only get **overlay escape hatches** (absolutely positioned HTML/React above the canvas for editors, filter menus, popups). That does not scale to styling every cell.
- Bonus problems: accessibility (ARIA on elements) and debugging (S2 needs a dedicated "G devtools" plugin).

That is the philosophical opposite of a Zag.js + Tailwind DS, whose whole premise is "you own the DOM and the styling, we own the behaviour".

## Requirement matrix (native support)

Legend: ✅ native · 🟡 logic yes / you build the UI (or via a plugin) · ⚙️ only through custom or external code · ❌ missing

| # | Requirement | TanStack | VTable | AntV S2 |
|---|---|:--:|:--:|:--:|
| 1 | Column filters with conditions | 🟡 logic, UI DIY | ✅ FilterPlugin (byCondition) | 🟡 `onFilter` pipeline |
| 2 | Header filter template | ⚙️ build it in `<th>` | ✅ `headerCustomLayout` | ✅ `custom-header`/`colCell` |
| 3 | Fulltext search | ✅ `globalFilter` | 🟡 search plugin | ⚙️ pre-filter the data |
| 4 | Sorting | ✅ `getSortedRowModel` | ✅ `sort` + comparator | ✅ `sortParams` |
| 5 | Empty data template | ⚙️ DIY | ✅ empty-tip | ✅ `placeholder` |
| 6 | Row actions | ⚙️ display column | ✅ `cellType:'button'`/icon | ⚙️ custom/overlay |
| 7 | Freeze columns L/R | 🟡 `columnPinning` (+CSS) | ✅ `frozenColCount`/`rightFrozenColCount` | ✅ `frozen{...}` |
| 8 | Sticky header | ⚙️ CSS `sticky` | ✅ native | ✅ `stickyHeader` |
| 9 | Striped rows | ⚙️ CSS `nth-child` | 🟡 via theme | 🟡 via theme |
| 10 | Infinite scroll / virtual | ⚙️ +`@tanstack/react-virtual` | ✅ strong native | ✅ strong native |
| 11 | ColSpan / RowSpan | ❌ header groups only | ✅ `customMergeCell` | ✅ `mergedCell` |
| 12 | onRowClick | ⚙️ `onClick` on `<tr>` | ✅ `click_cell`→row | ✅ `ROW_CELL_CLICK` |
| 13 | Selectable rows (checkbox) | 🟡 `rowSelection` state | ✅ `cellType:'checkbox'` | 🟡 cell selection |
| 14 | Column reorder | 🟡 `columnOrder` (drag=dnd-kit) | ✅ `dragOrder` | 🟡 via API |
| 15 | Row reorder | ⚙️ dnd-kit + mutate data | ✅ `rowSeriesNumber.dragOrder` | ⚙️ custom |
| 16 | Show/hide columns | ✅ `columnVisibility` | 🟡 `updateColumns` | ✅ `fields.columns` |
| 17 | Row custom content template | ✅ `cell` + `flexRender` | ✅ `customLayout`/VRender | ✅ subclass `DataCell` |
| 18 | Tree structure | ✅ `getExpandedRowModel` | ✅ strong `tree:true` | ✅ strong tree mode |
| 19 | Quick actions | ⚙️ display column | ✅ button/icon | ⚙️ interaction API |
| 20 | Inline row edit | ❌ DIY (`meta.updateData`) | ✅ `vtable-editors` | 🟡 editable-sheet/custom |
| 21 | Pagination (count, page size) | ✅ `getPaginationRowModel` | ✅ `pagination` | ✅ `pagination` |

**How to read this:** VTable and S2 win on ✅ count — they are "batteries-included". TanStack has more 🟡/⚙️ because it **deliberately ships no UI** — it gives you the state machine and you build the markup from your own atoms (which is an advantage for a DS, not a drawback).

## Integration effort for our DS (Zag.js + Tailwind)

- **TanStack — 1–2/5:** the same philosophy as Zag.js (logic only, zero markup/CSS). Filter inputs, checkboxes, pager and sort icons are rendered through our existing Zag atoms → the table inherits our tokens and the `data-[validation]` pattern for free. The cost: you build every piece of UI yourself, and add virtualization (`@tanstack/react-virtual`), drag (`dnd-kit`) and inline edit by hand; **rowSpan/colSpan on data cells is genuinely missing**.
- **VTable — 5/5:** canvas cannot be styled with Tailwind or wired to tokens. You get many features out of the box but lose the whole DS — cells are not members of the headless family, just an isolated widget behind a token→theme adapter. It only makes sense at canvas-scale performance (100k+ cells, pivot).
- **AntV S2 — 5/5:** the same, plus it is over-engineered for pivot analytics, and the English docs are a thin subset.
- **ali-react-table — 4/5 with high uncertainty:** DOM-based and virtualized, but a dead project with Chinese-only docs and no context7 coverage.

## Decision (final)

**Chosen: `@tanstack/react-table` v9.** For a **headless, Tailwind-styleable, DOM-accessible** grid inside a Zag.js DS it is architecturally the only clean fit. VTable (Bytedance) and AntV S2 (Alibaba) are **canvas** → they cannot use our stack (`--color-table-*` tokens, `tailwind-variants` slots, `data-[…]` states, Zag atoms), so they were ruled out. Bonus: `@tanstack/react-table` was already in the repo (`apps/medusa-be`), so no new third-party platform. The organism was first built against v8 and migrated to v9 before merge; v9 moves feature registration and the row models onto a module-scope `tableFeatures()` set and renames column pinning from `left`/`right` to `start`/`end`.

**Why not VTable/S2 despite more out-of-the-box features:** their canvas rendering would mean a parallel JS theme system (a duplicate of our token set), no per-cell DOM access through props, and losing accessibility and DOM-level testability. They only make sense as an **isolated canvas analytics widget** outside the DS (canvas-scale 100k+ cells, pivot).

**How we covered TanStack's weak spots:**
- colSpan/rowSpan on data cells → a custom `getCellSpan` prop (TanStack has none).
- virtualization / infinite scroll → `@tanstack/react-virtual` (windowing that preserves native table alignment) + `onReachEnd`.
- column & row reorder → `@dnd-kit`.
- inline edit → `meta.updateData` → `onCellEditCommit`.

**Implementation:** the `DataTable` organism in `libs/ui/src/organisms/data-table.tsx`, rendering through the existing presentational `Table` organism (so it inherits the `--color-table-*` tokens). It covers all 21 requirements, every feature exposes a callback, with Storybook stories carrying `play` interaction tests and the `data-table-usage` usage skill. The MVP is styled with existing and semantic tokens; component-level `--color-data-table-*` tokens and the Figma export follow once the MVP look is signed off.
