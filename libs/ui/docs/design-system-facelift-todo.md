# @techsio/ui-kit — consistency facelift · TODO

**Date:** 2026-09-12
**Supersedes nothing** — this is the actionable backlog. The measurement detail for the
accessibility findings lives in [`design-system-audit-2026-09.md`](./design-system-audit-2026-09.md);
this file adds the **spacing / rhythm** and **helper-component unification** work and merges
everything into one ordered list.

**Reference system:** [Astryx](https://astryx.atmeta.com) (Meta, React 19 + StyleX). Two
things it does that we should copy outright:

1. **One flat 4px spacing scale** — `--spacing-0 … --spacing-12` (0, 2, 4, 6, 8, 12, 16, 20,
   24, 28, 32, 36, 40, 44, 48 px), integers only, exposed as `gap={4}` step props on layout
   components. Its rules are explicit: *stick to the scale; if a value isn't on it, reconsider
   the design; never mix tokens with raw px in the same component.*
2. **One semantic icon registry** — `close`, `chevronDown`, `chevronLeft`, `chevronRight`,
   `check`, `moreHorizontal`, `arrowsUpDown`, `funnel`, … resolved through the active theme,
   so every close button and every chevron in the system is the same glyph, and a theme can
   swap the whole icon set without touching component code.

Legend: 🔴 High · 🟠 Medium · 🟡 Low. Each item is written as a task with its evidence.

---

## A · Spacing, rhythm and sizing

### 🔴 A1 · Collapse the two competing spacing scales into one
We ship **two unrelated spacing systems** and the docs point at the one components barely use.

| Scale | Shape | Where it is used |
| --- | --- | --- |
| `--spacing-50 … --spacing-950` | Utopia **fluid `clamp()`** | app/story code — this is what `AGENTS.md` and the usage skills tell you to write (`p-200`, `gap-100`) |
| `--dimension-0 … --dimension-576` | fixed rem constants from Figma | **~90 %** of component-internal padding/gap tokens |

Measured share of component `--padding-*` / `--gap-*` tokens: **≈230 bound to `--dimension-*`,
23 bound to `--spacing-*`.** The two scales do not align, so a story's `p-250` (20 px) sitting
next to a component's `--dimension-16` (16 px) is a 4 px mismatch nobody decided on.

- [ ] Pick **one** scale as the source of truth (recommendation: fixed px, 4 px base, like
      Astryx — fluid spacing inside components is what produces the sub-pixel values in A2).
- [ ] Re-map the other scale onto it as thin aliases, then delete the aliases in a later major.
- [ ] Update `AGENTS.md`, `tailwind-token-authoring` and every `*-usage` skill to name the
      surviving scale — today they teach the scale the components don't use.

### 🔴 A2 · The Figma export rounds rem to 2 decimals and produces sub-pixel spacing
Measured at a 1440 px viewport:

| Token | Exported | Renders | Intended |
| --- | --- | --- | --- |
| `--dimension-6` | `0.38rem` | **6.08 px** | 6 px |
| `--dimension-10` | `0.63rem` | **10.08 px** | 10 px |
| `--dimension-18` | `1.13rem` | **18.08 px** | 18 px |
| `--dimension-22` | `1.38rem` | **22.08 px** | 22 px |
| `--dimension-30` | `1.88rem` | **30.08 px** | 30 px |
| `--text-sm` | `0.88rem` | **14.08 px** | 14 px |

`--dimension-10` is the **most-used spacing value in the whole kit (57 tokens)** and it is
wrong by 0.08 px everywhere. Real rendered artefacts today: Accordion trigger **50.16 px**,
Textarea **84.16 px**, Carousel control **56.16 px**, indicator radius **999.04 px**.
Sub-pixel box edges are what makes borders look soft and columns look "almost aligned".

- [ ] Fix `merge-figma-themes.mjs` to emit `px` (or full-precision rem) for dimension/size
      tokens instead of 2-decimal rem.
- [ ] Add a token test that fails when any `--dimension-*` / `--spacing-*` resolves to a
      non-integer pixel value at 16 px root.

### 🟠 A3 · The spacing steps aren't a grid
Resolved values of the app scale at 1440 px: **2, 4, 10, 14, 20, 25, 30, 34, 40, 45, 60** —
gaps of 2, 6, 4, 6, 5, 5, 4, 6, 5, 15. Component internals use **0, 4, 6, 8, 10, 16, 18, 20,
22, 24, 28, 30, 36, 40, 44, 60, 120** — 17 distinct values, five of them off a 4 px grid.
Astryx uses 15 steps, all multiples of 4 except two deliberate half-steps.

- [ ] Define the target scale explicitly (proposal: `0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64`).
- [ ] Map every existing value to its nearest step and record the diff per component before
      changing anything — this is a visual-regression-sensitive change.
- [ ] Name steps by magnitude (`space-4` = 4 px), not by an abstract 50–950 ladder; nobody can
      tell today whether `spacing-350` is bigger or smaller than `dimension-30`.

### 🟠 A4 · Same nominal size, different rendered box
Measured on `Overview/Component comparison`:

| Component (`md`) | Control height | Inner control | Padding |
| --- | --- | --- | --- |
| Input | 44 px | — | 10.08 / 10.08 |
| Select trigger | 44 px | — | 10.08 / 10.08 |
| Combobox | 44 px | **input 40 px** | 10.08 / 10.08, trigger padX **4** |
| NumericInput | 44 px | **input 40 px** | 10.08 / 10.08, trigger padX 10.08 |

Outer heights agree (good), but the nested inputs lose 4 px and the trailing triggers use
three different horizontal paddings. At `sm` the same pattern repeats (32 px control,
28 px inner input).

- [ ] Give every composite form control one shared inner-padding token so the text baseline
      is identical across Input / Select / Combobox / NumericInput / PhoneInput.
- [ ] Add a Storybook story that renders all form controls in one column at each size with a
      ruler overlay; make it a visual-regression target.

### 🟠 A5 · The documented `form-control` height formula is dead code
`tokens/components/_form-control.css` documents
`--height-form-control-sm: calc(border*2 + spacing-50*2 + 1lh)` with a comment explaining that
buttons and inputs must share a height — but `figma/variables.css` is imported **last** and
redefines it to `2rem`. **20 tokens are declared in both places**; Figma silently wins.

- [ ] Emit a build-time report of every token declared in both layers (fail CI above a
      threshold, or after an allow-list).
- [ ] Delete the shadowed hand-written declarations, or move them out of the Figma namespace.

### 🟠 A6 · Type scale has no 16 px step and one missing line-height
`--text-sm` = 14 px, `--text-md` = 20 px — a 42 % jump with nothing in between, so the
recommended 16 px body size is unreachable. `--text-md--line-height` **is not defined**
(xs, sm, lg all are), so `text-md` — every `SectionCard` heading — falls back to `normal`
(≈1.2). Separately, the kit's own base sets `body { font-family: system-ui }`, overriding
`--font-sans` / `--font-body`.

- [ ] Add a 16 px step and re-point "body" at it.
- [ ] Add `--text-md--line-height`.
- [ ] Make the base stylesheet use the font tokens instead of `system-ui`.

### 🟡 A7 · Radius changes with control size
`sm` → 8 px, `md` → 12 px on form controls, while Badge stays 8 px at every size. Decide
whether radius is a function of size or of component role, and document it either way.

---

## B · Sub-components and helper parts (the unification work)

> *"Small sub-components and helper components must be unified — close buttons, chevrons, etc.
> The design system must respect standards and consistency."*

Today the kit has the right pieces (`ActionIcon`, `Label`, `popup-surface-base`, a generic
glyph set) but **no contract that says they must be used**, so each component re-invents its
own close button, its own chevron, its own separator. Nothing here is broken visually by
luck — the aliases happen to resolve to the same glyphs — but nothing prevents the next
component from diverging, and the drift has already started in sizes, labels and techniques.

### 🔴 B0 · Write the sub-part contract first
Everything else in this section is unenforceable until the rules exist. The target is
Astryx's model: a **closed semantic registry** plus **parts that inherit from their root**.

- [ ] Publish `docs/sub-part-contract.md` with, at minimum:
  - **One name per concept.** `Trigger` opens something. `Control` is the box that wraps an
    input. `Item` is a row in a collection. `Indicator` is the *state* glyph of the part that
    owns it. `Separator` is a rule. No component invents a synonym.
  - **One implementation per affordance.** An icon-only sub-button is `ActionIcon`, never
    `<Button icon>`, never a raw `<button>`. A form label is the `Label` atom. A floating
    panel is `popup-surface-base`.
  - **Parts inherit, they don't re-declare.** `size`, `variant` and validation state come from
    the root's context. A part exposes `size` only when it can legitimately differ.
  - **Glyphs come from the registry** (B8), never from a per-component alias.
- [ ] Add the contract to `component-authoring` and `zag-compound-components` skills so new
      components are generated against it.
- [ ] Add a validation script (extend `component-consistency-validation`) that fails on:
      a new `token-icon-<component>-*` alias, an icon-only `<Button>` inside `libs/ui/src`,
      a floating panel that doesn't use `popup-surface-base`.

### 🔴 B1 · Close / clear / dismiss — 6 tokens, 4 part names, 3 sizes, 3 labels
One affordance, implemented six times.

| Where | Part name | Icon token | Size | Accessible name |
| --- | --- | --- | --- | --- |
| Dialog | *(internal)* | `token-icon-dialog-close` | `md` | hardcoded "Close dialog" |
| Popover | `Popover.CloseTrigger` | `token-icon-close` | `md` | hardcoded "Close popover" |
| Toast | *(internal)* | `token-icon-toast-close` | `sm` | hardcoded "Close notification" |
| Select | `Select.ClearTrigger` | `token-icon-select-clear` | `toControlSize(size)` | hardcoded "Clear selection" |
| Combobox | *(internal)* | `token-icon-combobox-clear` | `size ?? "md"` | prop |
| SearchForm | `SearchForm.ClearButton` | *(own)* | own logic | prop |
| Header | *(internal)* | `token-icon-header-close` | `current` | "Toggle mobile menu" |

All seven end up at `@apply token-icon-close`, so the glyph is right today by coincidence.

- [ ] Ship one `CloseButton` helper over `ActionIcon`: required `label`, size derived from the
      container's size context, single glyph, single hover pill.
- [ ] Standardise the part name — `CloseTrigger` for "dismiss the surface", `ClearTrigger` for
      "empty the value". Retire `ClearButton`.
- [ ] Delete the six aliases; keep `token-icon-close`.

### 🔴 B2 · Chevrons — 13 aliases over 4 glyphs, and two different open/close techniques
Aliases in use: `accordion-chevron`, `combobox-chevron`, `select-indicator`,
`select-indicator-open`, `tree-indicator`, `tree-indicator-open`, `pagination-prev`,
`pagination-next`, `carousel-prev`, `carousel-next`, `breadcrumb-separator`,
`numeric-input-increment`, `numeric-input-decrement` — plus generic `increment` / `decrement`.
All resolve to `chevron-up/down/left/right`.

| Technique | Components |
| --- | --- |
| Rotate the chevron 180° on open | Accordion, Combobox, Popover, Select |
| **Swap the glyph** (+ `hover:scale-125`) | TreeView |

`Select` declares `token-icon-select-indicator-open` *and* rotates — the swap token is dead code.

- [ ] Standardise on rotation (animates for free, one glyph to theme).
- [ ] Collapse to the four generic chevrons; keep a directional alias only where RTL must flip it.
- [ ] Delete `select-indicator-open`, `tree-indicator-open`, and TreeView's `hover:scale-125`.

### 🟠 B3 · Check marks — 3 glyphs, 4 aliases, two stroke weights for the same meaning
`token-icon-check` (`mdi--check`), `token-icon-check-bold` (`mdi--check-bold`),
`token-icon-check-circle`, plus aliases `menu-check`, `steps-check`, `select-check` → `check`,
and `token-icon-checkbox` → **`check-bold`**.

So a checked `Checkbox` and a selected `Select` item render the *same semantic* with
**different stroke weights**, and they can appear in the same list.

- [ ] Pick one tick for "selected/checked" and one for "completed/success"; document which is which.
- [ ] Collapse the aliases.

### 🟠 B4 · `Indicator` means five different things
| Part | What it actually renders |
| --- | --- |
| `Accordion.Indicator` | chevron |
| `Popover.Indicator` | chevron |
| `Tabs.Indicator` | the sliding underline |
| `Steps.Indicator` | the numbered circle (or a check) |
| `Carousel.Indicator` | a pagination dot |
| `Select.ItemIndicator` / `RadioCard.ItemIndicator` | the selected check / radio dot |

Five semantics on one name means no consumer can predict what `X.Indicator` will render.

- [ ] Rename by role: `*.ExpandIcon` (chevron), `*.SelectionMark` (check/dot), `*.ActiveBar`
      (tabs underline), `*.StepMarker`, `*.PageDot`. Keep `Indicator` only for selection marks.

### 🟠 B5 · `Control` means two different things
`Input.Control`, `NumericInput.Control`, `SearchForm.Control`, `Select.Control`,
`Combobox.Control`, `PhoneInput.Control` = *the box that wraps the field*.
`Carousel.Control` = *the bar holding prev/next/indicators*.

- [ ] Rename `Carousel.Control` → `Carousel.Toolbar` (or `.Controls`).

### 🟠 B6 · Floating panels don't all share the panel surface
`popup-surface-base` and `popup-item-base` exist and are used by **Select, Combobox, Menu**.
**Popover and PhoneInput's country panel roll their own** radius, shadow and padding.
(Dialog is a modal surface — deliberately different, but say so in the contract.)

- [ ] Move Popover and PhoneInput onto the shared utilities.
- [ ] Make the panel surface the only way to build a floating layer (validation rule in B0).

### 🟠 B7 · Separators — two part names, six token families, one 1px rule
Parts: `Breadcrumb.Separator`, `Steps.Separator`, `Footer.Divider`.
Token families: `breadcrumb-separator`, `menu-separator`, `popup-separator`, `steps-separator`,
`footer-divider`, `phone-input-divider` — each with its own colour, height and margin.

- [ ] One `--separator-*` base (colour + thickness); per-component tokens keep only *spacing*.
- [ ] One part name: `Separator`. Retire `Divider`.

### 🟠 B8 · No semantic icon registry — this is what makes B1–B3 keep happening
`IconType` is `` `token-icon-${string}` | `icon-[${string}]` ``, a template-literal type, so
**every string compiles**; a typo fails at runtime. There is no published list of icons the
system guarantees, and a brand theme cannot swap the icon set the way Astryx's
`defineTheme({ icons })` does.

- [ ] Publish a closed union of semantic names — `close`, `chevron-up/down/left/right`, `check`,
      `more`, `search`, `sort`, `filter`, `columns`, `external`, `calendar`, `clock`, `info`,
      `success`, `warning`, `error`, `copy`, `menu`, `plus`, `edit`, `delete` — and accept a raw
      `icon-[…]` string only as a documented escape hatch.
- [ ] Resolve the registry through the theme layer, so `data-theme="business"` can ship its own set.
- [ ] Per-component aliases become illegal (B0 validation).

### 🟠 B9 · Finish the `ActionIcon` migration
`ActionIcon`'s own docblock calls it "**the single icon-only sub-button used inside larger
controls**", yet icon-only `<Button>` is still used in `DataTable` (row save / cancel /
actions), `Carousel` (5 call sites), `NumericInput` (2), `Accordion`, `Tabs`.
Continues [icon-button-unification](./icon-button-unification.md) — SearchForm was the pilot.

- [ ] Migrate the remaining call sites.
- [ ] Mirror the change in Figma (noted as pending in the original unification doc).

### 🟠 B10 · Sub-parts re-declare `size` instead of inheriting it
12 sub-parts accept their own `size` even though the root already provides one through context.
That is how a `md` Combobox ends up with a `md` clear button and a `sm` trigger.

- [ ] Remove `size` from parts that cannot legitimately differ from their root; where it stays,
      default it to the context value rather than to a literal.

### 🟡 B11 · `*.Label` is a form label in five components and a heading in one
`Select`, `SearchForm`, `PhoneInput`, `RadioCard` and `RadioGroup` all render the `Label` atom.
`TreeView.Label` renders an `<h3>`.

- [ ] Rename `TreeView.Label` → `TreeView.Title` (and give it an `as` prop, see E).

### 🟠 B12 · Three names for one prop concept
`Button` → `variant` (intent) + `theme` (style); `ActionIcon` → `tone`;
`Tabs` / `Steps` / `RadioCard` / `Table` → `variant` (style).

- [ ] Freeze the vocabulary: `variant` = semantic intent, `appearance` = visual treatment,
      `size` = scale. Alias the old names for one minor, then remove.

### 🟠 B13 · Validation is expressed three ways
`validateStatus` (≈20 components), `invalid?: boolean` (`Checkbox`, `NumericInput`), and
`Input` takes it through **`variant`**.

- [ ] Standardise on `validateStatus`; keep `invalid` as a deprecated alias.

### 🟡 B14 · `customTrigger` has two contracts
`boolean` on `Dialog`, `ReactNode` on `Menu`.

- [ ] Make both `ReactNode`; `undefined` means "render the default trigger".

## C · Accessibility (carried over from the audit, unchanged priority)

### 🔴 C1 · Status colours fail contrast in light mode
`--color-status-text-fg-error` **2.77:1**, `success` **2.28:1**, `warning` **2.15:1** against
`--color-base`; all pass in dark. This is the component every form error uses.
**Not fixed by the `business` brand** — it lives in base tokens every brand inherits.
- [ ] Re-tune the light halves to ≥ 4.5:1.

### 🔴 C2 · `--color-fg-secondary` fails in dark mode
**3.26:1** on page, **3.05:1** on card, **2.38:1** on table rows. One page produced **12 axe
violations** in dark. - [ ] Re-tune.

### 🔴 C3 · Control boundaries and state fills below 3:1 (light)
Form-control border **1.4:1**, checkbox border **1.4:1**, checkbox/switch checked fill
**2.28:1**, table separator **1.27:1** (light) / **1.03:1** (dark). Also not brand-fixable.
- [ ] Re-tune to ≥ 3:1 (WCAG 1.4.11).

### 🔴 C4 · Form errors are not announced or associated
`StatusText` renders a bare `<div>` — no `role="alert"`, no id — and `FormInput` /
`FormTextarea` / `FormCheckbox` / `Select` / `Switch` / `Slider` never set `aria-describedby`.
Only `NumericInput`, `RadioCard` and `DataTable` do it correctly.
- [ ] Wire `aria-describedby` + `role="alert"` through the `Form*` wrappers, copying `RadioCard`.

### 🔴 C5 · Five component ARIA bugs (reproduced with axe 4.11)
- [ ] `Steps` — `role="tablist"` contains `div[aria-current]` children the role forbids *(critical)*
- [ ] `PhoneInput.CountryPicker` — `aria-labelledby` points at an id that is never rendered → no accessible name *(critical)*
- [ ] `Carousel` — inactive slides are `aria-hidden` but still focusable *(serious)*
- [ ] `Pagination` — disabled prev/next render as `<a>` without `href`, so `aria-label` is prohibited *(serious)*
- [ ] `Carousel.Indicators` — **16×16 px**, below the WCAG 2.2 AA 24×24 minimum *(serious)*

### 🔴 C6 · The accent colour is unreadable as a selected state *(base brand only)*
TreeView selected item **1.4:1**, selected Tabs trigger **1.23:1**. The `business` brand
already fixes most of this (**5.48:1** indicator, **4.72:1** tree item).
- [ ] Port Business's `--color-primary-*` ramp into base.
- [ ] Chase the last 0.27 on the selected-row tint (axe still reports 4.23:1 there).

### 🟠 C7 · Touch targets are web-minimum only
48 of 57 interactive targets on a real page render under 44 px; `--size-icon-control-sm` is
exactly 24 px (the WCAG floor); sort triggers measure 48×21.
- [ ] Document "use `md` on touch surfaces", and raise the sort trigger to ≥24 px.

### 🟠 C8 · Hardcoded English in ten components
`Dialog`, `Popover`, `Toast`, `Menu`, `Select`, `Combobox`, `SearchForm`, `Skeleton`,
`Header`, `DataTable` inline edit. Only `DataTable` has a `translations` prop.
- [ ] Add a kit-wide `translations` contract (or a light i18n context).

### 🟠 C9 · `Icon` is permanently `aria-hidden="true"`
A meaningful standalone icon cannot be exposed without a hand-written `sr-only` span.
- [ ] Add `decorative={false}` / `label`.

### 🟠 C10 · Nothing enforces an accessible name on icon-only controls
`<ActionIcon icon="…" />` compiles and ships an unlabelled button.
- [ ] Require `aria-label` in the type when there are no children.

### 🟠 C11 · `Chart` and `Footer` ignore reduced motion; `Carousel.autoplay` doesn't check it
- [ ] Guard all three.

### 🟠 C12 · The a11y gate does not gate
`scripts/storybook-a11y.sh` defaults `A11Y_REPORT_FAIL_ON_VIOLATIONS=false`.
- [ ] Turn it on in CI **after** C1–C5, so the fixes can't regress.

---

## D · Missing primitives

Built by hand while making the 41 `Pages/*` stories, all of them standard:
- [ ] 🟠 `EmptyState`, `StatCard`, `PageHeader`, `AppShell` (sidebar/topbar frame), `Timeline`,
      `BulkActionBar`, `DetailList` (key–value block)
- [ ] 🟠 Form gaps: **date/time picker** (DataTable falls back to native inputs today),
      **password field with show/hide**, **file upload / dropzone**, **avatar**,
      **inline alert/banner** (Toast is transient, `StatusText` is field-level)
- [ ] 🟡 `SkipLink` for the sidebar layouts

---

## E · Small API papercuts

- [ ] 🟡 `Combobox.defaultValue` is typed `string | string[]` but cast to `string[]` → passing
      a string throws `e.join is not a function`
- [ ] 🟡 `FormNumericInput` requires `children` while `FormInput` / `FormTextarea` don't
- [ ] 🟡 `Image` defaults to `size="full"` (`w-full`), silently beating any width class
- [ ] 🟡 `Gallery.thumbnailSize` takes a raw `number` while every other size prop is a token scale
- [ ] 🟡 `Pagination` requires `getPageUrl` even for client-side paging
- [ ] 🟡 `Badge` accepts only `children: string` — no icon can be paired with the colour
- [ ] 🟡 Heading levels are fixed (`Dialog.title` always `h2`, `TreeView.Label` always `h3`) — add `as`
- [ ] 🟡 `--color-fg-placeholder` and `--color-fg-disabled` resolve to the same luminance (4.83:1)
- [ ] 🟡 `Table` exposes both `numeric` and `align` with overlapping meaning

---

## Suggested order

1. **A2** (export precision) — one script change, removes sub-pixel noise everywhere and must
   land before any spacing re-map, or the re-map bakes the rounding in.
2. **C1 – C5** (contrast + form a11y + the five ARIA bugs) — these are the legal-exposure items.
3. **C12** — turn the gate on so 2 can't regress.
4. **A5** (token shadowing report) — makes the rest of the token work trustworthy.
5. **B0** (the sub-part contract + validation rules) — write it before touching any part, or
   the unification below has nothing to hold it in place.
6. **B1, B2, B3, B8** (close button, chevrons, check marks, icon registry) — high visual
   payoff, low risk, and this is the "facelift" the kit is actually asking for.
7. **B4 – B7, B9 – B11** (naming, shared panel surface, separators, ActionIcon migration,
   size inheritance) — mechanical, wide, safe behind visual regression.
8. **A1, A3, A4** (scale unification + rhythm) — the big one; do it component group by
   component group, behind the same visual-regression suite.
9. **B12 – B14, D, E** — API convergence and the missing primitives, as capacity allows.
