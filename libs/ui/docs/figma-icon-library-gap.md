# Figma icon library gap — designer handoff

**Date:** 2026-09-20
**Branch:** `feat/ui-data-table-code-connect`
**Figma:** [New Design System](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System) → page `🟧 Table2`
**Raised by:** building `Table2` (the DataTable component family) from code

---

## Summary

The Figma library publishes **4 token icons**. The codebase uses **96**.

Three DataTable affordances therefore cannot be drawn at all, and today they silently render
as a **✕**, because `Action Icon`'s default variant is `token-icon-close`.

This is the single highest-value thing to fix: one icon pass unblocks four separate findings below.

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

### Minimum set to publish

1. `token-icon-chevron-up`
2. `token-icon-sort-unfold` — from `mdi--unfold-more-horizontal`
3. `token-icon-cog` — from `mdi--cog-outline`
4. `token-icon-filter` — from `mdi--filter-variant`
5. `token-icon-ellipsis-horizontal`
6. `token-icon-drag-vertical`

Once published, these swap straight into `Table2.ColumnHeader`, `Table2.Toolbar` and
`Table2.FilterRow` — no restructuring needed, the `INSTANCE_SWAP` slots are already wired.

---

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

```
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
