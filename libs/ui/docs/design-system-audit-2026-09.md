# @techsio/ui-kit — design-system audit

**Date:** 2026-09-12
**Scope:** `libs/ui/src` (tokens, atoms, molecules, organisms) as consumed by the 41 new
`Pages/*` composition stories.
**Method:**
- UI/UX rule set: `ui-ux-pro-max` skill (WCAG 2.2 A/AA + Apple HIG + Material guidance).
- Automated: **axe-core 4.11.1** run against six built pages in light *and* dark mode.
- Measured: computed CSS custom properties resolved through a canvas probe (real sRGB
  values, so `oklch`/`lab`/`light-dark()` are resolved the way a browser paints them).
- Manual: source review of every component's public API while building the pages.

Everything below is a **measured or reproduced** finding, not an opinion about taste.

| Severity | Meaning |
| --- | --- |
| 🔴 **High** | Fails WCAG 2.2 AA, breaks in one theme, or forces every consumer to work around it. Fix before the kit is used in an accessibility-regulated product. |
| 🟠 **Medium** | Real friction or risk: inconsistent API, silent token drift, missing primitive. Costs time on every app. |
| 🟡 **Low** | Polish, naming, documentation. Fix opportunistically. |

---

## 🔴 High

### H1 · The accent colour fails text contrast wherever it marks selection
`--color-primary` resolves to `#8ec5ff` in light mode. Every component that uses it as a
*selected/active* foreground lands between **1.2:1 and 1.4:1** — axe flags it on every
admin page.

| Surface | Measured | Required |
| --- | --- | --- |
| TreeView selected item (`--color-tree-view-fg-selected`) | **1.4:1** (`#8ec5ff` on `#e2e2e3`) | 4.5:1 |
| Tabs selected trigger | **1.23:1** (`#8ec5ff` on `#d1d5dc`) | 4.5:1 |
| Tabs indicator / selected border vs page | 1.81:1 / 1.65:1 | 3:1 (non-text) |

This is the single most visible failure: it hits the sidebar on *every* screen. The current
selected state is communicated almost entirely by a colour nobody can read.
**Fix:** darken `--color-primary` for light mode (keep the light tint for dark mode), or split
into `--color-primary` (fill) and `--color-primary-fg` (text/icon on light surfaces).

> **The `business` brand already does most of this.** Measured under `data-theme="business"`:
> tabs indicator **1.81 → 5.48:1**, primary button fill **→ 5.48:1**, TreeView selected item
> **1.4 → 4.72:1** against the card surface (axe still reports **4.23:1** against the selected
> row's own tint, so it is 0.27 short on that one pair). The base brand is the outlier here —
> the fix is to port Business's `--color-primary-*` ramp back into base.

### H2 · Status colours fail contrast in light mode, pass only in dark
`StatusText` is the kit's validation/help component and it is the one used by `FormInput`,
`FormTextarea`, `Switch`, `Slider`, `RadioCard` and `PhoneInput`.

| Token | Light | Dark | Required |
| --- | --- | --- | --- |
| `--color-status-text-fg-error` | **2.77:1** | 10.61:1 | 4.5:1 |
| `--color-status-text-fg-success` | **2.28:1** | 14.34:1 | 4.5:1 |
| `--color-status-text-fg-warning` | **2.15:1** | 12.06:1 | 4.5:1 |
| `--color-success` / `--color-warning` / `--color-danger` as text | 2.28 / 2.15 / 2.77 | ok | 4.5:1 |

The semantic palette was clearly tuned against a dark background and the light halves were
never re-measured. A user cannot read a form error on a white page.

### H3 · `--color-fg-secondary` fails in dark mode
Mirror image of H2, in the other theme. Measured `#566277`:

| Background | Measured | Required |
| --- | --- | --- |
| `--color-base` (page) | **3.26:1** | 4.5:1 |
| `--color-surface` (card) | **3.05:1** | 4.5:1 |
| Table row (`#1f2937`) | **2.38:1** | 4.5:1 |

One page (`Pages/Patterns/CRUD workflow`) produces **12 axe contrast violations in dark
mode and 2 in light**. Secondary text is descriptions, help text, timestamps, SKUs — the
bulk of an admin UI.

### H4 · Control boundaries and state fills miss the 3:1 non-text threshold (light)

| Token | Measured | Required (WCAG 1.4.11) |
| --- | --- | --- |
| `--color-form-control-border` (every input, select, combobox) | **1.4:1** | 3:1 |
| `--color-checkbox-border-base` | **1.4:1** | 3:1 |
| `--color-checkbox-bg-checked` | **2.28:1** | 3:1 |
| `--color-switch-bg-checked` | **2.28:1** | 3:1 |
| `--color-table-border` vs table bg | **1.27:1** (light) / **1.03:1** (dark) | — (separators; still effectively invisible in dark) |

A checked switch and an unchecked switch are barely distinguishable for a low-vision user,
and inputs have no perceivable edge.

### H5 · Form errors are neither announced nor programmatically associated
`StatusText` renders a plain `<div>` — **no `role="alert"`, no `aria-live`, no `id`** — and
`FormInput` / `FormTextarea` / `FormCheckbox` / `Select` / `Switch` / `Slider` place it after
the control **without `aria-describedby`**.

```
aria-describedby used in:  numeric-input.tsx, radio-card.tsx, data-table.fields.tsx   (3 of ~20 form-capable components)
role="alert" / aria-live:  data-table.tsx only
```

A screen-reader user submitting a form hears nothing and, on focusing the field, gets no
hint or error text. This is the kit's largest single a11y gap, and it is *inconsistent*:
`NumericInput` and `RadioCard` already do it right, so the pattern exists but was not applied.

### H6 · Component-level ARIA bugs found by axe
Each reproduced on a built page, all inside kit components (not story code):

| Component | Rule | Impact | Detail |
| --- | --- | --- | --- |
| `Steps` | `aria-required-children` | critical | `role="tablist"` contains `div[aria-current]` children that the role does not permit |
| `PhoneInput.CountryPicker` | `button-name` | critical | trigger points at `aria-labelledby="select:…:label"` but **no element with that id is rendered** → no accessible name |
| `Carousel` | `aria-hidden-focus` | serious | inactive slides are `aria-hidden` yet still focusable (4 nodes) |
| `Pagination` | `aria-prohibited-attr` | serious | disabled prev/next render as `<a>` without `href`, so `aria-label` is prohibited (no role) |
| `Carousel.Indicators` | `target-size` | serious | **16×16 px**, below the WCAG 2.2 AA 24×24 minimum |

### H7 · The Figma export silently overrides hand-written component tokens
`tokens/_tokens-base.css` imports `figma/variables.css` **last**, and 20 tokens are declared
in both places. Example — `tokens/components/_form-control.css` documents:

```css
/* Formula: border×2 + button-padding-y×2 + 1lh */
--height-form-control-sm: calc(var(--border-width-form-control) * 2 + var(--spacing-50) * 2 + 1lh);
```

…but the computed value in the browser is `2rem` (the Figma constant). The documented
formula — and the comment explaining why buttons and inputs line up — is dead code. Any
future contributor editing `_form-control.css` will see no effect and lose an hour.
**Fix:** make the overlap explicit (generate a report at build time, or move the 20
conflicting tokens out of the hand-written files entirely).

---

## 🟠 Medium

### M1 · `variant` means two different things
| Component | `variant` vocabulary | What it encodes |
| --- | --- | --- |
| `Button` | primary, secondary, tertiary, danger, warning | **semantic intent** (+ separate `theme` for style) |
| `Badge` | primary … info, success, warning, danger, outline, discount, dynamic | intent **and** style **and** data mode |
| `Tabs` | default, line, solid, outline | **visual style** |
| `Steps` | subtle, solid | visual style |
| `RadioCard` | outline, subtle, solid | visual style |
| `Table` | line, outline, striped | visual style |
| `ActionIcon` | *(none — uses `tone`: neutral, danger)* | intent, third name |

Three names (`variant`, `theme`, `tone`) for two concepts. Consumers cannot predict any
component's API from another's.

### M2 · Three validation APIs
`validateStatus="default|error|success|warning"` in ~20 components, `invalid?: boolean` in
`Checkbox` and `NumericInput`, and `Input` takes the status through its **`variant`** prop.
Wiring a form means remembering which of the three each field speaks.

### M3 · Touch targets are web-minimum only
Measured on a rendered page: of 57 interactive targets, **48 are under 44 px high** and 2 are
under 24 px. `--size-icon-control-sm` is exactly `24px` — the WCAG 2.2 AA floor, with no
margin for the spacing exception — and DataTable's filter-condition buttons render at exactly
24×24. Sort triggers measure **48×21**. Fine for mouse, unusable-grade for touch, and there is
no documented "use `md` on touch surfaces" guidance.

### M4 · Typography tokens are defined but not applied
- The kit's own base sets `body { font-family: system-ui, sans-serif }`, ignoring
  `--font-sans` / `--font-body` / `--font-heading` from `theme.css`. Every app must re-set it.
- `--text-md--line-height` **does not exist** (xs, sm, lg all have one), so `text-md` —
  used for every `SectionCard` heading — falls back to `normal` (~1.2).
- Scale gap: `--text-sm` = 14 px, `--text-md` = 20 px. There is no 16 px step, so the
  recommended 16 px body size is unreachable without arbitrary values.

### M5 · Missing primitives every app has to hand-roll
While building 41 realistic pages I had to write these from scratch, all of them standard:
**empty state**, **KPI / stat tile**, **page header with breadcrumb+actions**, **app shell
(sidebar/topbar)**, **timeline**, **bulk-action bar**, **key–value detail list**. Plus missing
form primitives: **date/time picker** (DataTable's own docs admit date filters fall back to
native inputs), **password field with show/hide**, **file upload/dropzone**, **avatar**,
**inline alert/banner** (Toast is transient, `StatusText` is field-level).

### M6 · Hardcoded English in component internals
`Dialog` ("Close dialog", trigger "Open"), `Popover` ("Close popover"), `Toast`
("Close notification"), `Menu` ("Menu"), `Select` ("Select an option", "Clear selection"),
`Combobox` ("Select option"), `SearchForm` ("Search..."), `Skeleton` ("Loading content"),
`Header` ("Toggle mobile menu"), `DataTable` inline-edit ("Save row", "Cancel edit").
`DataTable` has a full `translations` prop — the rest of the kit has nothing, so a Czech or
German app ships English screen-reader labels.

### M7 · `Icon` is permanently `aria-hidden="true"`
Correct for the common decorative case, wrong as an absolute: a meaningful standalone icon
(status glyph, trend arrow) cannot be exposed without wrapping it in your own
`<span className="sr-only">`. The skill's `icon-context` rule is explicit that the same glyph
changes semantics by use. Add a `decorative={false}` / `label` escape hatch.

### M8 · Nothing enforces the accessible name on icon-only controls
`ActionIcon` and icon-only `Button` accept no required label — `ActionIcon`'s props are
`Omit<ButtonHTMLAttributes, "children">`, so `<ActionIcon icon="…" />` compiles and ships an
unlabelled button. A typed `aria-label: string` (required when there are no children) would
make this impossible.

### M9 · `Chart` and `Footer` ignore reduced motion
Every other component uses `motion-reduce:` / `motion-safe:`. `molecules/chart.tsx` animates
by default (`animate` prop defaults to `true`) and `organisms/footer.tsx` transitions without
a guard. `Carousel` has a pause control but its `autoplay` does not consult
`prefers-reduced-motion` in JS.

### M10 · The a11y gate does not gate
`scripts/storybook-a11y.sh` defaults `A11Y_REPORT_FAIL_ON_VIOLATIONS=false`, so the sweep
reports and exits green. The violations in H1–H6 have presumably been produced on every run
and nothing stopped them from landing.

### M11 · Elevation is carried by borders that are almost invisible
`--color-surface` vs `--color-base` measures **1.05:1 (light) / 1.07:1 (dark)** — cards are
separated from the page only by a 1.27–1.4:1 border. In dark mode that border drops to
**1.03:1**, so card boundaries effectively vanish. Either raise the surface step or raise the
border contrast; currently neither carries the hierarchy.

---

## 🟡 Low

- **L1 · `customTrigger` has two different types** — `boolean` on `Dialog`, `ReactNode` on
  `Menu`. Same name, opposite contract.
- **L2 · `Badge` only accepts `children: string`** — no icon, no `<strong>`, so a status badge
  can never pair colour with a glyph (the "don't rely on colour alone" mitigation).
- **L3 · `Combobox.defaultValue` is typed `string | string[]` but cast to `string[]`** —
  passing the documented `string` throws `e.join is not a function` at runtime (hit while
  building the settings page).
- **L4 · `FormNumericInput` requires `children`** (the whole `NumericInput.Control`
  composition) while `FormInput` / `FormTextarea` are self-contained. Asymmetric for no reason.
- **L5 · `Image` defaults to `size="full"` (`w-full`)**, which silently beats any width class
  you pass; you must know to set `size="custom"`. Surprising default for an atom.
- **L6 · `Gallery.thumbnailSize` takes a raw `number`** while every other size prop in the kit
  is a token scale (`sm|md|lg`).
- **L7 · `Pagination` requires `getPageUrl`** even when paging is client-side state; the
  DataTable has to pass a throwaway href. An optional `onPageChange`-only mode would be simpler.
- **L8 · Heading levels are fixed** — `Dialog.title` is always `<h2>`, `TreeView.Label` always
  `<h3>`. In a page that already has an `<h2>`, the hierarchy skips or repeats. Add an `as` prop.
- **L9 · `--color-fg-placeholder` and `--color-fg-disabled` resolve to the same luminance**
  (4.83:1 both), so "empty" and "disabled" look identical in a form.
- **L10 · No skip-link primitive** for keyboard users on the sidebar layouts.
- **L11 · `Table` exposes both `numeric` and `align`** with overlapping meaning; the source
  comment itself warns not to set both.

---

## Appendix · Does the `business` brand fix any of this?

The `Pages/*` stories now open in `data-theme="business"`, so the same measurements were taken
again under it.

| Finding | Base brand | Business brand | Verdict |
| --- | --- | --- | --- |
| H1 tabs indicator | 1.81:1 | **5.48:1** | fixed |
| H1 primary button fill | — | **5.48:1** | fixed |
| H1 TreeView selected item | 1.4:1 | **4.72:1** (4.23:1 on the selected-row tint) | mostly fixed |
| H2 status error / success / warning text | 2.77 / 2.28 / 2.15 | **2.77 / 2.28 / 2.15** | unchanged |
| H4 form-control border | 1.4:1 | **1.4:1** | unchanged |
| H4 checkbox / switch checked fill | 2.28:1 | **2.28:1** | unchanged |
| M11 table border | 1.27:1 | **1.27:1** | unchanged |

So the brand layer fixes the accent family and nothing else — H2, H4 and M11 live in tokens
Business does not override, which means **every brand inherits them**. Fixing them once in the
base ramp fixes them everywhere; fixing them per brand does not scale.

---

## What is already right

Worth saying, because it is unusual: the kit gets the hard parts right.

- **Focus rings** on every interactive component, via tokens, with `focus-visible` (not
  `:focus`) and an offset — no `outline: none` anywhere.
- **Reduced motion** respected in 30 of 32 components.
- **Zag.js foundations** give real keyboard support, roving tabindex and typeahead for free.
- **`DataTable`** is genuinely strong: `aria-sort`, `aria-busy`, keyboard row activation,
  `role="alert"` on inline-edit validation, a live region for status, a full `translations`
  contract and drag handles with dnd-kit keyboard bindings.
- **Text contrast where it matters most is excellent**: `fg-primary` measures 17.85:1 (light)
  and 20.13:1 (dark); solid button and badge fills are all 6.2–10.7:1.
- **Token architecture** (primitive → semantic → component, with Figma as source of truth and
  brand overrides) is the right shape — H7 is a wiring problem, not a design problem.

---

## Suggested order

1. **Re-measure the light palette** (H1, H2, H4) — one pass over `--color-primary`, the three
   status colours and the form-control/checkbox/switch tokens fixes the majority of the axe
   violations.
2. **Re-measure `--color-fg-secondary` in dark** (H3).
3. **Wire `aria-describedby` + `role="alert"` through the `Form*` wrappers** (H5) — copy what
   `RadioCard` already does.
4. **Fix the five component ARIA bugs** (H6).
5. **Turn `A11Y_REPORT_FAIL_ON_VIOLATIONS` on in CI** (M10) so 1–4 cannot regress.
6. Then the API convergence work (M1, M2, L1–L6), which is mechanical but wide.

---

### Reproducing the measurements

```bash
pnpm --dir libs/ui build:storybook
python3 -m http.server 6018 --directory libs/ui/storybook-static
cp node_modules/.pnpm/axe-core@4.11.1/node_modules/axe-core/axe.min.js libs/ui/storybook-static/
# then, in the story iframe:
#   axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } })
#   document.documentElement.classList.add('dark')  // and run again
```

Contrast numbers were produced by painting each token onto a 1×1 canvas and computing the
WCAG relative-luminance ratio, so `oklch`, `lab` and `light-dark()` are resolved exactly as
the browser paints them.
