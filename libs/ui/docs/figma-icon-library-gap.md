# Figma icon library gap — designer handoff

**Date:** 2026-09-20
**Branch:** `feat/ui-data-table-code-connect`
**Figma:** [New Design System](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System) → page `🟧 Table2`
**Raised by:** building `Table2` (the DataTable component family) from code

---

## Summary

The Figma library publishes **4 token icons**. The codebase uses **96**.

The inventory below lists **six** DataTable affordances whose glyph was missing. Two of them
(the column-visibility cog and the filter operator) rendered as a **✕**, because
`Action Icon`'s default variant is `token-icon-close`. The other four simply could not be
drawn.

The icon pass fixes only those six rows. The sizing (§2), spacing (§3), row-tone (§4) and
`TableColumnHeader` (§5) findings are independent of it and stay open on their own terms.

---

## 1. BLOCKING — missing glyphs

**Published today:** `token-icon-check` · `token-icon-chevron-down` · `token-icon-close` · `token-icon-plus`

| Affordance | Glyph used in code | In Figma? | Current result |
|---|---|---|---|
| Sort — unsorted | `icon-[mdi--unfold-more-horizontal]` | ❌ | not drawable |
| Sort — ascending | `token-icon-chevron-up` | ❌ | not drawable |
| Sort — descending | `token-icon-chevron-down` | ✅ | correct |
| Column visibility cog | `icon-[mdi--cog-outline]` | ❌ | renders **✕** |
| Filter operator menu | `icon-[mdi--filter-variant]` | ❌ | renders **✕** |
| Row actions overflow | `token-icon-ellipsis-horizontal` | ❌ | not drawable |
| Column / row drag handle | `icon-[mdi--drag-vertical]`, `icon-[mdi--drag-horizontal]` | ❌ | not drawable |
| Expand / collapse | chevron rotated 180° | ⚠️ | workaround in use |

### `Action Icon` has no icon slot — this blocks the swap entirely

Worse than the missing glyphs: the published **`Action Icon`** component exposes only
`size`, `tone` and `state`. Its glyph is **baked in as a vector** (`icon-shape`) with **no
`INSTANCE_SWAP` property**, so the mark cannot be changed from an instance *even once the
right glyphs exist*.

That is why the toolbar's column-visibility control first rendered a ✕. It no longer depends
on `Action Icon`: in code that trigger is a full `Button` (`DataTable.ColumnVisibility`
renders `<Button icon="icon-[mdi--cog-outline]" variant="primary" />`), so `Table2.Toolbar`
now carries a **`Button`** instance with the label hidden and its `iconLeft` `INSTANCE_SWAP`
set to `token-icon-cog`. To update the toolbar cog, publish `token-icon-cog` so it can be
chosen in `Button`'s `iconLeft` slot. `Action Icon` is not involved (§7f). Every other
`Action Icon` across the library still has the constraint below.

**Fix required:** add an `INSTANCE_SWAP` icon property to `Action Icon` (mirroring the one
`Icon` already has as `icon#365:42`), *then* publish the glyphs below.

As a stand-in, `Table2.FilterRow`'s operator control was rebuilt using the plain `Icon`
component — which does expose a swap slot — showing a chevron for the conditions menu.

### Status: every glyph is drawn, pending adoption

All of them are now **drawn and wired** on the `🟧 Table2` page, in a section named
**Proposed token icons**, parsed from the exact MDI paths the code references (§8):

| Component | Source | Wired into |
|---|---|---|
| `Token Icon/token-icon-sort-unfold` | `mdi--unfold-more-horizontal` | `Table2.ColumnHeader` (`sort=none`) |
| `Token Icon/token-icon-chevron-up` / `-down` | `mdi--chevron-up` / `-down` | `Table2.ColumnHeader` (`sort=asc/desc`), `Table2.ExpandToggle` |
| `Token Icon/token-icon-filter` | `mdi--filter-variant` | `Table2.FilterRow` |
| `Token Icon/token-icon-cog` | `mdi--cog-outline` | `Table2.Toolbar` (`Button` `iconLeft`) |
| `Token Icon/token-icon-drag-vertical` | `mdi--drag-vertical` | `Table2.ColumnHeader` column-reorder grip |
| `Token Icon/token-icon-drag-horizontal` | `mdi--drag-horizontal` | `Table2.Row` row-reorder grip |
| `Token Icon/token-icon-ellipsis-horizontal` | `mdi--dots-horizontal` | row-actions overflow |

They are **local components, not published library assets**. The designer still needs to
adopt them into the `Icon` set's instance-swap options.

The rest of this subsection is kept as history: it describes the hand-drawn first pass,
which §8 replaced.

**Drawing note for whoever redraws these properly:** Figma's `vectorPaths` accepts only
`M L C Q Z`. MDI's compact comma form (`M16.59,5.41`), the `H`/`V` shorthands, and arc
(`A`) commands all fail to parse. Paths were normalised to space-separated explicit `L`
pairs, and the cog — which is arc-based — was rebuilt as a **computed** gear outline
(8 teeth alternating between an outer and a root radius) plus a four-Bézier hub circle.

Three further traps, each of which produced a wrong-looking icon that reported success:

- A subpath needs an explicit `Z`, or Figma silently drops it — `sort-unfold` first
  rendered as one chevron instead of two.
- `EVENODD` only cuts a hole when both subpaths live in the **same** `data` string. Two
  separate `vectorPaths` entries are independent shapes, so the cog came out solid.
- A new vector lands at the frame origin, not centred — every glyph needed explicit
  centring inside its 24×24 box.

Verify any redraw against a zoomed screenshot, not the 24px node: at icon size a wrong
glyph still looks plausible. The first `sort-unfold` pointed *inward* (a collapse mark)
rather than outward, and that was only visible at 10×.

### Minimum set to publish

1. `token-icon-chevron-up`
2. `token-icon-sort-unfold` — from `mdi--unfold-more-horizontal`
3. `token-icon-cog` — from `mdi--cog-outline`
4. `token-icon-filter` — from `mdi--filter-variant`
5. `token-icon-ellipsis-horizontal`
6. `token-icon-drag-vertical`: the column-reorder grip (`mdi--drag-vertical` in code)
7. `token-icon-drag-horizontal`: the row-reorder grip (`mdi--drag-horizontal` in code)

The two drag glyphs are not interchangeable. Code uses the vertical one on column headers
and the horizontal one on rows, so both have to be published.

Once published, these swap straight into `Table2.ColumnHeader`, `Table2.Row`,
`Table2.Toolbar` and `Table2.FilterRow`. No restructuring is needed, because the
`INSTANCE_SWAP` slots are already wired.

---

## 1b. Icon-only buttons: `radius/icon-control` disagrees with `Action Icon`

`Table2.IconButton` was built because a bare glyph is not a control — the toolbar cog and
the filter operator menus need a real hit target. It binds the `icon-control` collection
(`size/icon-control/md`, `radius/icon-control`, `color/icon-control/fg`,
`color/icon-control/bg/hover`), which is the kit's own icon-button token set.

Building it exposed a mismatch: **`radius/icon-control` resolves to 8px, but the published
`Action Icon` hardcodes a 4px corner radius** on every variant. One of the two is wrong.
Since `Action Icon` doesn't bind the token at all, the component is the likelier culprit.

Geometry otherwise agrees: 32×32 at `md`, centred, transparent at rest with a bound fill
on hover — which is why the cog looks unchanged until hovered. That is correct for a
borderless icon button, not a missing style.

## 2. `size=current` means different things in Figma and code

The Figma `Icon` set's size scale, measured:

| Variant | `current` | `xs` | `sm` | `md` | `lg` | `xl` | `2xl` |
|---|---|---|---|---|---|---|---|
| Renders at | **16px** | 12 | 14 | **20** | 24 | 30 | 40 |

In **code**, `current` means `1em` — which is **20px** at the table's `md` size.
In **Figma**, `current` is a hard-coded **16px**.

Anyone mirroring the code by choosing `current` gets a glyph 4px too small. This bug was hit
while building `Table2`: nine glyphs rendered at 16px against 20px everywhere else.

**Suggested fix:** rename Figma's `current` → `16`, or make it genuinely inherit.
Also note **`xl` = 30px is odd and off the 8-point grid** (see §3); `32` would be consistent.

---

## 3. Spacing off the 8-point grid

`.agents/skills/component-to-figma/SKILL.md` Rule 11 requires even values, preferably
8-point steps. Measured across the `Table2` family:

| Value | Where | Verdict |
|---|---|---|
| `4` | header label → glyph gap, filter cell gap | ✅ on grid |
| `6` | `StatusText` internals (inside Select) | ❌ off grid |
| `14` | toolbar gap, toolbar/footer padding, filter cell padding | ❌ off grid |
| `10` | cell + header vertical padding | ❌ off grid |
| `16`, `24` | Button internals, pager, footer gap | ✅ on grid |

**Root cause — this is not a Figma authoring error.** The values come from the token export:

```text
--spacing-200:             0.88rem  → 14.08px
--padding-table-cell-md-y: 0.63rem  → 10.08px
--border-sm:               0.06rem  →  0.96px   (should be 0.0625rem = 1px)
```

These are **two-decimal-rounded exports** of fluid `clamp()` values — the "A2 export precision"
item in `design-system-facelift-todo.md`. A `14.08px` gap sits 2px from the `16px` used inside
`Button`, which is exactly what reads as sloppy on screen.

**Suggested fix:** export at higher precision, or snap the component-facing spacing tokens to
the 8-point scale (`8 / 16 / 24`) and let only the fluid primitives carry fractional values.

---

## 4. Row tones exist in design but not in code

The existing `🟧 Table` page draws row states **Danger / Warning / Success / Info** (plus
`Active` variants of each). `DataTable` has **no `rowTone` API** — code supports only
`base / hover / selected / striped / nested-tint`.

The drawn fills are also raw, fully-saturated values rather than token references, which the
designer's own note already flags:

> *"Varianty co chybí dodělat + Dark mode + si pohrát s barevností – příliš ostré barvy, navázat jemnější"*

**Decision needed:** either add `rowTone` to `DataTable` (plus
`color/data-table/row/bg/{danger,warning,success,info}` aliased to the semantic status tokens),
or drop the tones from the design. They are deliberately **not** modelled in `Table2` today.

---

## 5. Published `TableColumnHeader` has no sort affordance

The published component exposes only `size`. It cannot express sorted / ascending / descending
at all — which is consistent with §1, since the glyphs don't exist.

`Table2.ColumnHeader` adds a `sortable` boolean and keeps direction as an instance swap on the
nested `sort-icon`, so it will work the moment §1 lands.

---

## Already fixed on the `Table2` page

For completeness, these were found in the same audit and are done:

- Header label was set to `FILL`, shoving the sort glyph to the far cell edge — label and glyph
  are now one hugging `sort-button` with a 4px gap, matching `inline-flex items-center gap-100`.
- All glyphs normalised to **20px** (32 of 32); icon buttons at 32px. Both sit inside the
  "size 20–32" guidance from `ui-ux-pro-max`.
- `color/table/row/fg/selected` created in Figma, retiring the *"TEMPORARY BRIDGE"* comment in
  `src/tokens/components/organisms/_table.css`.
- Page-size Select pinned to 96px instead of stretching the footer.
- Master-detail expander uses a **chevron**, not the ✕ the old Table page used.

---

## 7. Pre-export token audit (2026-09-21)

Run before re-exporting tokens from Figma. Two classes of problem, both fixed in the file.

### 7a. `Pagination` never bound its gap to its own token

The gap between page buttons was **hardcoded at 16px on all nine variants**, while
`spacing/pagination/list` sat unused beside it. So the token and the component disagreed,
and changing the token did nothing — which is exactly the mismatch that made the pager look
loose.

Fixed: all nine variants (`filled`/`outlined`/`minimal` × `sm`/`md`/`lg`) are now
**bound** to `spacing/pagination/list`.

**Final value: 4px (`Theme::size/4`)**, set per design decision. See §7d. The binding was
first made at 8px, because `ui-ux-pro-max` Touch Spacing asks for an 8px minimum between
touch targets. It was then deliberately tightened to 4px for density, and the export ships
`--spacing-pagination-list: var(--size-4)`. The 8px guideline is recorded as a known,
accepted exception in §7d. It is not a pending change.

### 7b. 52 broken alias entries — every radius in the system

`Theme::radius/*` aliased a **deleted variable in all six modes**, so the entire radius
scale resolved to nothing:

| Variable | Modes affected | Repaired to (from code) |
|---|---|---|
| `radius/none` | 6 | `0` |
| `radius/xs` | 6 | `4` (`0.25rem`) |
| `radius/sm` | 6 | `8` (`0.5rem`) |
| `radius/md` | 6 | `12` (`0.75rem`) |
| `radius/lg` | 6 | `16` (`1rem`) |
| `radius/2xl` | 6 | `32` (`2rem`) |
| `radius/full` | 6 | `999` (`62.44rem`) |
| `select::padding/select/trigger/{x,y}/{sm,md}` | 1 each | `6` / `10` |
| `textarea::padding/textarea/{x,y}/{sm,md,lg}` | 1 each | `6` / `10` / `16` |

**63 component tokens across ~35 components** aliased those broken radii — `button`,
`dialog`, `form-control`, `pagination`, `table`, `icon-control`, `popup-surface`,
`switch`, `steps` and more. Exporting before the repair would have emitted an empty or
wrong radius for essentially every component in the library.

All values were taken from `src/tokens/figma/variables.css`, so code stays the source of
truth. Post-repair audit: **0 broken aliases remaining**.

One judgement call to confirm: `radius/full` was set to `999` to match the code's
`62.44rem`. That figure looks like a rounded export of an intended "effectively infinite"
value — `9999` is the usual convention and renders identically. Worth normalising at the
same time as the A2 precision work.

### 7c. Pagination was bound to REMOTE library variables, not its own tokens

The deeper reason editing tokens appeared to do nothing. Every binding on the Pagination
items pointed at variable IDs carrying a **library key prefix**:

```
height → VariableID:2534b467476aedaf98deb5a8970ec7ddef301445/2589:6883
```

Those are **remote variables from an imported library**, not the local `pagination`
collection. So the local tokens were orphans: the export reads them, but the component
renders from something else entirely. Height, width, stroke weight and radius were all
affected; only the gap responded, because that one was explicitly re-bound first.

All nine variants are now bound to the local `pagination` collection.

**Worth auditing the other components before exporting** — if Pagination drifted this way,
others may have too, and the symptom is silent: tokens look right, the component ignores them.

### 7d. Final pagination values

| Token | Was | Now | Aliases |
|---|---|---|---|
| `spacing/pagination/list` | 16 | **4** | `Theme::size/4` |
| `spacing/data-table/pagination` | 24 | **16** | `Theme::size/16` |
| `height/pagination/sm` | 32 | **32** | `form-control::height/form-control/sm` |
| `height/pagination/md` | 40 | **44** | `form-control::height/form-control/md` |
| `height/pagination/lg` | 48 | **48** | `Theme::dimension/48` (deliberately NOT form-control) |
| `border-width/pagination` | 1 | **2** | `form-control::border-width/form-control` |

The **`sm` and `md` heights and the border width** now alias the form-control family rather
than holding their own values, so at those sizes pagination tracks Input / Select /
SearchForm / Combobox / NumericInput automatically. **`lg` does not**: it stays on
`Theme::dimension/48` (see below). Verified in the Table2 footer: the pagination item and
the page-size Select are both 44px tall at `md`.

Two things to be aware of:

- **`lg` stays 48, deliberately.** Aliasing it to `form-control` made it 70px, which is
  too large for a pagination button. `sm` (32) and `md` (44) still alias form-control
  because they genuinely match; `lg` does not. Worth noting the form-control scale itself
  is odd — `32 / 44 / 70` is a +12 step then a +26 step, so 70 may be the real anomaly.
- **4px gap is below the 8px minimum** for adjacent touch targets in the `ui-ux-pro-max`
  Touch Spacing guideline. A deliberate density choice, recorded here so it is not mistaken
  for an oversight.

### 7e. Pagination prev/next are text glyphs, not icons

In code the prev/next controls are **icon components**, `token-icon-pagination-prev` and
`token-icon-pagination-next`. In Figma they are **text characters**, `‹` (U+2039) and `›`
(U+203A), set in Inter Medium at the *same point size as the page digits*. A chevron glyph at a digit's
point size reads far smaller optically, which is why they looked undersized.

Interim fix: new `text/pagination/nav/{sm,md,lg}` tokens, one step up the type scale
(14 / 20 / 24 against the digits' 12 / 14 / 20), bound locally to all 18 glyph nodes —
they were bound to remote variables too, like everything else in this component.

The proper fix is to replace the text characters `‹` / `›` with instances of
`token-icon-pagination-prev` / `token-icon-pagination-next` once those are published, so
Figma matches code.

### 7f. The toolbar cog was the wrong component entirely

The column-visibility trigger in `Table2.Toolbar` was an instance of the local
`Table2.IconButton`, which mirrors the `ActionIcon` atom. `ActionIcon`'s default
state is genuinely transparent — the pill only appears on hover/active — so on
the canvas the cog read as a glyph floating in the toolbar rather than a control.

That was the wrong atom, not a missing fill. In code the trigger is a full
`Button`:

```tsx
<Button
  aria-label={translations.columnsLabel}
  icon="icon-[mdi--cog-outline]"
  size="sm"
  title={translations.columnsLabel}
  variant="primary"
/>
```

The toolbar now carries a real `Button` instance (`variant=primary`,
`theme=solid`, `state=default`) with the `Label` text hidden, `showLeftIcon`
true and `iconLeft` swapped to `token-icon-cog`. The button is a 44 × 44 square with the cog centred.

This is a deliberate divergence. In code an icon-only `Button` is a **wide**
rectangle, not a square. The padding is asymmetric: `--padding-button-md` is
`6px 20px` and `--padding-button-sm` is `4px 16px`. The height comes from
`h-form-control-*`, and the glyph is sized by the button's own font size (see the
next list). So:

| Code size | Height | Padding (y / x) | Glyph | Icon-only box |
|---|---|---|---|---|
| `sm` (what the toolbar uses today) | 32 | 4 / 16 | 14 | **46 × 32** |
| `md` | 44 | 6 / 20 | 20 | **60 × 44** |

Figma squares it off at 44 × 44, which is what an icon-only control should be.
The fix belongs in code: an icon-only `Button` needs a square hit area rather
than text-button padding around a glyph.

`Table2.IconButton` stays as the mirror of `ActionIcon` for the sub-buttons that
really are one (clear, prev/next, row edit). Its transparent default is correct.

**One divergence this surfaced, for the design side to decide:**

- **Size.** Code passes `size="sm"` to this Button (32px tall) while the search
  field and the adjacent action Button are md (44px), so in the browser the cog
  is visibly shorter than its neighbours. Figma uses md, per the md-only decision
  for this family. Either code should drop the `size="sm"`, or the toolbar should
  be sm throughout. Right now the two disagree.

*Correction to an earlier version of this section:* it claimed a second
divergence in the glyph size, on the assumption that an `Icon` with no `iconSize`
renders at 20px. It doesn't. `Icon` defaults to `size="current"`, which adds no
size class, so the glyph inherits the Button's font size: `--text-button-sm` =
`--text-sm` (14px) at `sm`, and `--text-button-md` = `--text-md` (20px) at `md`.
That is exactly what Figma's `Button` icon slots are (14 at `sm`, 20 at `md`), so
there is no glyph-size divergence inside `Button`.

## 8. Stop hand-drawing glyphs — parse them from `@iconify-json/mdi`

Everything in §1 was drawn by hand because Figma's `vectorPaths` API rejects
most real-world SVG (no arcs, no `H`/`V` shorthands, no comma-separated pairs).
That was the wrong tool. Two better routes exist, and we should use both.

### Route A — what this repo now does (no plugin, fully reproducible)

The codebase already ships the icon set as data. `libs/ui` depends on
`@iconify-json/mdi`, and every `icon-[mdi--*]` utility resolves against
`node_modules/.pnpm/@iconify-json+mdi@*/node_modules/@iconify-json/mdi/icons.json`.
That file holds the exact path data the browser renders.

Wrap a record as an SVG document and hand it to `figma.createNodeFromSvg()`,
which uses Figma's real SVG parser — arcs, fill rules and all:

```js
const icons = require("@iconify-json/mdi/icons.json")
const ic = icons.icons["cog-outline"]
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" ` +
            `viewBox="0 0 24 24">${ic.body}</svg>`
// then, inside use_figma:
const frame = figma.createNodeFromSvg(svg)
```

Keep each vector's natural `x`/`y` when reparenting it into the 24x24 component
— that offset *is* the glyph's position on the MDI grid, and zeroing it shoves
the icon into the corner.

This is exact by construction: the glyph in Figma and the glyph in the browser
come from the same bytes, and it re-runs on any machine with the repo checked
out. The `Table2` page's icons were all rebuilt this way — the cog, sort-unfold,
chevron-up and filter were replaced, and `chevron-down`, `pagination-prev`,
`pagination-next`, `ellipsis-horizontal`, `drag-vertical`, `row-edit` and
`table-empty` were added, closing the §1 BLOCKING list.

### Route B — the Iconify Figma plugin, for designers

For designers working in Figma directly, the official **Iconify** plugin
(Community → "Iconify", by Vjacheslav Trushkin) ships the same Iconify data,
including the full MDI set. Search `cog-outline`, drop it on the canvas, and it
is the identical glyph. A designer drawing an icon by hand instead of pulling it
from this plugin is how the library drifts from code.

**Recommended rule: no glyph in this file is ever drawn by hand.** It comes from
the Iconify plugin, or it comes from `@iconify-json/mdi` through
`createNodeFromSvg`. The only icons that should be original artwork are ones the
codebase does not have either.

### Still outstanding

The published `Icon` component's swap list is the blocker, not the artwork.
These components live on the `Table2` page and need adopting into the published
set before other files can use them. `Action Icon` still needs its
`INSTANCE_SWAP` slot (§1).

`Pagination` still renders prev/next as the text characters `‹` and `›` (§7e).
The icon components `token-icon-pagination-prev` / `token-icon-pagination-next`
now exist, so replacing the characters with them is unblocked — but `Pagination` is shared system-wide, so it is a
design-system change, not a `Table2` one.

## 9. Pre-export sign-off (2026-09-21)

Full audit of the file before the token re-export.

### Clean

| Check | Result |
|---|---|
| Local variables / values | 2 228 variables, 4 401 mode values across 54 collections |
| Broken aliases (pointing at a deleted variable) | **0** — the §7b repair holds |
| Values missing in a mode | **0** |
| `data-table` collection | 28 tokens, **all aliases, zero raw values**, scopes set on every one |
| `pagination` collection | 26 tokens, all aliases, zero raw values |
| Broken node bindings | **0** |
| Hardcoded text fill / font size in `Table2.*` | **0** |
| Hardcoded gap / padding in `Table2.*` | **0** |
| Unbound icon fills | **0** |
| Page frame overlaps | **0** across 15 sections |

*(Remote-library instances — Button, Input, Select, Pagination, SearchForm —
are excluded from the hardcode sweep: they carry their own library's bindings
by design.)*

### Fixed during this audit

Rebuilding the glyphs from SVG (§8) **dropped their variable bindings** — the new
vectors carried raw fills copied from the old ones. Eleven icon vectors were
hardcoded to `#1f2129`. All are rebound:

- 3 sort glyphs → `color/data-table/sort-icon/base`
- 4 filter glyphs → `color/data-table/filter-icon` *(new token, aliases `color/fg/secondary`)*
- 1 expander chevron → `color/data-table/expander`
- 1 toolbar cog → `button::color/button/fg/primary` (it sits on a primary Button)
- 2 `IconButton` cogs → `icon-control::color/icon-control/fg`

This is worth recording as a trap: `createNodeFromSvg` produces vectors with
plain paints, so any rebuild must re-apply bindings, not copy `fills` across.

### Exports but currently unused — intentional

8 of the 28 `data-table` tokens are bound to nothing in Figma, because the Figma
component does not draw those parts. They are kept deliberately so code has a
token to consume:

| Token | Why unused in Figma |
|---|---|
| `color/data-table/drag-handle` | column drag not modelled |
| `color/data-table/resize-handle`, `size/data-table/resize-handle` | column resize not modelled |
| `color/data-table/editor-error/fg`, `spacing/data-table/editor` | inline cell editing not modelled |
| `padding/data-table/detail` | master-detail panel not drawn (only its chevron) |
| `color/data-table/toolbar/fg` | the toolbar has no text of its own |
| `color/data-table/sort-icon/active` | **see below** |

`color/data-table/sort-icon/active` is the one that is arguably a genuine gap
rather than a deliberate one: `Table2.ColumnHeader` has a `sortable` boolean but
no asc/desc state, so the active sort colour is never shown. Adding
`sort=none|asc|desc` would use it and would match what the code renders.

### Ready to export

Nothing in the file blocks the export.

## 10. Status foreground contrast, and the `spacing` rename (2026-09-22)

Two Figma edits made after the 06:32 export, both needing a re-export.

### 10a. `spacing/data-table/actions` → `spacing/data-table/filter-control`

The token was named for the toolbar actions but bound to the filter cell. The
toolbar's actions row uses `spacing/data-table/toolbar` (14) and the filter
control uses this one (4) — code already had both values right, only the name
was misleading. Renamed to match where it is used; `data-table.tsx` consumes it
as `gap-data-table-filter-control`.

### 10b. `fg/status-error` and `fg/status-success` fell below WCAG AA

The 06:32 export moved both semantic foregrounds onto lighter ramp steps and
**deleted the `color/success/700` primitive**. Measured against
`color/fill/surface`:

| Mode | Surface | Error | Success |
|---|---|---|---|
| Light / neo-light / Business | `#f3f4f6` | `danger/400` **2.51** ❌ | `success/500` **2.07** ❌ |
| Dark / neo-dark | `#1f2937` | `danger/300` 7.73 ✅ | `success/300` 10.45 ✅ |
| Akros | `#f2f3f4` | `danger/600` 5.45 ✅ | `success/600` 6.26 ✅ |

Only the three light modes were affected — the dark modes and the newly added
Akros theme were already correct. These feed `--color-status-text-fg-*`, so the
failure covered every form validation message in the system.

The deletion was the direct cause on the success side: with `700` gone, **no
green left on the ramp clears AA on the light surface** — `success/600` is only
2.99:1. So the primitive was restored at its original `#15803d` (Akros gets
`#1e4502`, consistent with its own darker ramp).

Fixed, light modes only:

```
color/fg/status-error   → color/danger/700   #b91c1c   5.88
color/fg/status-success → color/success/700  #15803d   4.56
```

`danger/600` was not enough — it measures 4.39 against the grey surface. It read
as passing before only because the old check was run against pure white, where
it makes 4.83. **Status foregrounds must be measured against
`color/fill/surface`, not `#ffffff`** — most of them sit on the grey.

All six modes now pass AA for both tokens.

## 11. Code ⇄ Figma parity pass (2026-09-22)

Everything the codebase renders now has a Figma counterpart. The gaps listed in
§9 as "exports but currently unused — intentional" were mostly not intentional
at all; they were features Figma had a token for but no artwork.

### Component surface after the pass

| Component | Variants | Properties |
|---|---|---|
| `Table2.ColumnHeader` | 9 | `align` · **`sort` (none/asc/desc)** · `sortable` · **`showDragHandle`** · **`showResizeHandle`** |
| `Table2.Cell` | 9 | `align` · **`state` (default/editing/error)** · **`pinned`** |
| `Table2.Row` | 6 | `state` · `striped` · **`nested`** · **`showDragHandle`** |
| **`Table2.DetailPanel`** | 1 | new — the master-detail box a row expands into |

`sort=asc/desc` uses `color/data-table/sort-icon/active`, which had no consumer
before. The drag and resize handles default to hidden because in code both are
`opacity-0` until hover. `nested` and `pinned` are overlays rather than
backgrounds, mirroring why the CSS uses a shadow and a gradient layer: two
`bg-*` utilities on one element cannot both render.

A `colSpan` / `rowSpan` example was added to the Cell System section.

### Two new tokens

```
color/data-table/pinned-cell/bg   → table::color/table/bg
color/data-table/row/nested-tint  → table::color/table/row/bg/hover
```

The collection is now **30 tokens**, all aliases, no raw values.

### Still deliberately absent

**Virtualization** is a rendering strategy, not a visual state — there is
nothing to draw, and inventing a "virtualized" variant would be inventing a
design the code does not have.

`color/data-table/toolbar/fg` is bound to nothing in Figma because the toolbar
holds no text of its own (the search field and buttons carry their own
foregrounds). It is still consumed in code by the `toolbar` slot, so it stays.

### Two Figma API traps this pass turned up

- **A hidden instance reports zero children to the Plugin API.** *(Corrected: an
  earlier version of this note blamed `componentPropertyReferences` for "emptying"
  the instance. That diagnosis was wrong.)* Fifteen drag handles looked empty
  because they were hidden (`visible = false`, driven by `showDragHandle`), and
  a hidden instance's `children` comes back as `[]` even though it renders
  correctly the moment it is shown. To read or re-bind the glyph inside a hidden
  handle, set it visible, do the work, then restore `visible`. The wrapper frames
  added at the time are harmless, but they were not what fixed it.
- **A fresh instance's `componentProperties` keys are not reliably prefixed the
  way the definition names them.** Matching `INSTANCE_SWAP` by property *type*
  works; matching by a `"icon#"` name prefix silently found nothing and the swap
  never happened, leaving an empty slot that still looked fine on canvas.

## 12. Tree and master-detail demos (2026-09-23)

The Demos section covered sorting, filtering, pagination and the empty state but
not the two compositions that need more than one component to read correctly.
Both are now there, bringing the section to seven:

- **Tree / nested rows** — four rows at depths 0–2, expand toggles in the
  leading cell, `color/data-table/row/nested-tint` on the nested rows.
- **Master-detail (expanded row)** — an expanded row followed by
  `Table2.DetailPanel`, with collapsed rows either side.

### Why these two are composition frames, not component instances

The other demos are instances of a `Demo / …` component. These two cannot be:
an expand toggle has to sit **inside** the leading cell, and
`insertChild` into an instance subtree throws

```
Cannot move node. New parent is an instance or is inside of an instance
```

Instances are structurally immutable — you can override a property, not add a
child. So both demos are plain auto-layout frames composed from `Table2.*`
instances, which is also closer to how the code assembles a row.

Indentation has to eat into the leading cell rather than widen it. Leaving the
columns on `FILL` let the indent push every later column right, so each row's
columns landed at a different x. All columns are pinned to a fixed 240 instead.

### Decided: the nested-row tint is neutral

`color/data-table/row/nested-tint` aliases `color/table/row/bg/hover`, and
following that chain to the end explains the problem exactly:

```
nested-tint → table/row/bg/hover → fill/hover
            → light-dark(primary-200, primary-900)
```

**Hover in this system is a brand tint, not a neutral.** So nesting currently
inherits the brand colour, which is why a nested row reads as *selected* rather
than *nested*. Depth shading should be neutral and mode-aware.

A three-way comparison is rendered on the `Known gaps` section
(`nested-tint decision`):

| Option | Resolves to | Verdict |
|---|---|---|
| A — `color/fill/hover` (today) | `light-dark(primary-200, primary-900)` | brand tint; reads as selection |
| B — `color/fill/base` | `light-dark(black-5, white-5)` | neutral, but **identical to the striped row tint** — a nested row becomes indistinguishable from a zebra stripe |
| C — **`color/fill/active`** | `light-dark(black-15, white-15)` | neutral, mode-aware, clearly separated from the 5% stripe |

**Chosen: C.** `color/data-table/row/nested-tint` now aliases
`color/fill/active`. It is an existing semantic token, so no new primitive is
needed; it already carries a light/dark pair, so nesting stays legible in dark
mode; and at 15% against the stripe's 5% the two never collide.

The comparison stays on the `Known gaps` section as the record of why, retitled
"DECIDED: …" so it does not read as an open question.

**No code change was needed for this.** `_data-table.css` reads
`--color-data-table-row-bg-nested` and does not know or care what backs it —
the retarget happens entirely in Figma and arrives with the next export. That is
the payoff for putting a component token in the chain rather than letting the
utility reach straight through to a Table token.

Note the tint is applied once for any depth, not per level — the code uses
`data-[depth]:data-table-row-nested-tint`, a single class — so depth 1 and
depth 3 shade identically. The Figma demo matches that on purpose.

## 13. PR #627 review round (2026-09-24)

### Figma changes: code only picks these up after the next export

Per the repo rule, the exported token files under `src/tokens/figma/<mode>/` are
never edited by hand. Every change below was made in Figma and reaches code only
through an export.

**DataTable uses only DataTable tokens now.** `AGENTS.md` requires component code
to use component-specific token classes only, and DataTable still reached into
nine Table tokens. Each now has a `data-table` alias:

| New `data-table` variable | Aliases |
|---|---|
| `border-width/data-table` | `table::border/table/width` |
| `text/data-table/sm` | `table::text/table/sm` |
| `color/data-table/bg` | `table::color/table/bg` |
| `color/data-table/header/bg` | `table::color/table/header/bg` |
| `color/data-table/footer/bg` | `table::color/table/footer/bg` |
| `color/data-table/row/bg/hover` | `table::color/table/row/bg/hover` |
| `color/data-table/row/bg/selected` | `table::color/table/row/bg/selected` |
| `color/data-table/row/bg/striped/primary` / `secondary` | `table::color/table/row/striped/*` |
| `shadow/data-table/outline` | `table::shadow/table/outline` |

**Seven existing names renamed to the `AGENTS.md` naming rules.** The rules are
"derived colour tokens end in `-bg` / `-fg` / `-border`" and "border widths use
`--border-width-<component>`":

| Was | Now |
|---|---|
| `color/data-table/drag-handle` | `color/data-table/drag-handle/fg` |
| `color/data-table/expander` | `color/data-table/expander/fg` |
| `color/data-table/filter-icon` | `color/data-table/filter-icon/fg` |
| `color/data-table/resize-handle` | `color/data-table/resize-handle/bg` |
| `color/data-table/row/nested-tint` | `color/data-table/row/bg/nested` |
| `color/data-table/sort-icon/base` / `active` | `color/data-table/sort-icon/fg` / `fg/active` |

The collection is now **40 variables**, all aliases, each with WEB code syntax set.

**Select / Textarea padding re-aliased.** The §7b repair had written raw `6 / 10 /
16` into these ten padding tokens, so they exported as `0.38rem` etc. They now
alias `Theme::dimension/6`, `/10` and `/16` again.

**Akros alpha channels.** Sixteen Akros-mode colours were stored as an invalid
"alias + opacity" object (`{ color: <alias>, opacity: 5 }`). Figma cannot express
that, so the exporter fell back to `oklch(0 0 0)`: opaque black for
`color/transparent`, the `black/*` and `white/*` overlays, and all ten
outlined-button hover/active states. Each is now a real RGBA colour, built from
its referenced base in the Akros mode. Akros isn't registered as a theme yet, so
nothing rendered with the broken values.

### Code fix in the same round

`OPAQUE_HEADER_BG` was applied as an inline `style` to the filter cells and the
pagination bar. Inline style outranks a class, so it silently overrode their
`bg-data-table-filter-row-bg` / `bg-data-table-pagination-bg` classes, and
neither token ever reached the browser. Each surface now composites its own
token through `opaqueSurface()`.

### Figma-only fixes

- `Table2.Row` used the **column** grip glyph. Code uses `mdi--drag-vertical` for
  columns and `mdi--drag-horizontal` for rows, so `token-icon-drag-horizontal` was
  added from the MDI data and the six Row handles swapped to it.
- **Known gaps** on the Figma page now lists open items only.

### Review comments declined, with reasons

- *Rename other components' colour tokens (command, date-picker, drawer,
  file-upload, hotkeys, sidebar, tour).* Those collections belong to other
  components and arrived with the export; renaming them is their own change.
- *Convert `akros/variables.css` to `@theme static`.* The per-mode files are raw
  exporter output (`:root`, the same as `light/variables.css`). The `@theme static`
  layer is produced by `merge-figma-themes.mjs`. Neither is edited by hand.
- *Load order in `dark/variables.css`.* Per-mode files are never imported at
  runtime; only the merged `variables.css` is, and it contains every dependency.
- *Unify `spacing/pagination/list` on 8px.* The final value is 4px by design
  decision (§7a, §7d).
