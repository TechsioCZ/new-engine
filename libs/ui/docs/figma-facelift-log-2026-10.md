# Figma facelift log — October 2026

Work log for the design-system facelift done **in Figma first**. After each block the user
re-exports the tokens (`tokens/figma/<mode>/variables.css`, never hand-edited) and the
codebase is checked against this log.

File: [New-Design-System](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System)
Backlog this implements: [`design-system-facelift-todo.md`](./design-system-facelift-todo.md) § F.

---

## 2026-10-08 · Carousel, Steps, Table consolidation

### Root cause found: pages were bound to a remote library, not to the local variables

Every node on the Steps and Carousel pages was bound to **remote** variables. These are the
library copies (`VariableID:<hash>/…`) of the local collections, with the same names.
The token export reads the **local** variables. So before this change, editing a local
variable changed the code but not what the component drew in Figma. The two had silently
drifted apart. For example, `size/steps/indicator/md` was 30 locally but drawn at 28.

Fixed for these two pages by rebinding each remote binding to the same-named local variable
in the same-named collection: **Steps 533 bindings, Carousel 382**, with 0 unmatched.
**Other pages were not checked.** The same rebind script should be run page by page as each
component gets its facelift.

### Variables — re-aliased (local collections)

| Variable | Before | After | Why |
| --- | --- | --- | --- |
| `color/carousel/control/bg` | `color/fill/highlight` | `color/fill/surface` | bar, buttons and dots all shared one fill |
| `color/carousel/trigger/bg/base` | `color/fill/highlight` | `color/bg/transparent` | triggers are Action Icons, so the pill only shows on hover |
| `color/carousel/indicator/bg/base` | `color/fill/highlight` | `color/fg/placeholder` | inactive dot was 1.0 : 1 (invisible) |
| `color/carousel/indicator/bg/active` | `color/bg/primary/base` | `color/fg/primary` | active dot was ≈ 1.2 : 1 |
| `size/carousel/indicator` | `dimension/16` | `dimension/24` | now the **hit area** (WCAG 2.2 target size) |
| `spacing/carousel/indicator` | `dimension/6` | `dimension/0` | 24 px hit areas already space the 8 px dots 16 px apart |
| `spacing/carousel/control` | `dimension/16` | `dimension/8` | tighter bar |
| `color/steps/indicator/fg` | `color/fg/secondary` | `color/fg/primary` | default number was 2.4 : 1 in Dark |
| `color/steps/indicator/fg/current` | `color/white` | `color/fg/on-primary-solid-neo` | was 1.81 : 1 in Light |
| `color/steps/indicator/bg/complete` | `color/bg/success` | `color/success/700` | white check was 2.46 : 1 |
| `color/steps/indicator/border/complete` | `color/bg/success` | `color/success/700` | match bg |
| `color/steps/separator/bg/complete` | `color/bg/success` | `color/success/700` | match indicator |
| `color/steps/content/border/complete` | `color/bg/success` | `color/success/700` | match indicator |
| `color/steps/title/fg/complete` | `color/fg-accent/success` | `color/fg/status-success` | was 2.46 : 1 (Figma) / 3.3 : 1 |
| `color/steps/indicator/bg/solid/complete` | `color/bg/success` | `color/success/700` | solid variant, same fix |
| `color/steps/indicator/fg/solid/complete` | `color/fg/reverse` | `color/white` | dark fg on `success/700` failed in Dark |
| `color/steps/indicator/fg/solid/current` | `color/fg/reverse` | `color/fg/on-primary-solid-neo` | same fix as subtle |
| `color/steps/indicator/fg/solid` | `color/fg/on-primary-indicator` | `color/fg/primary` | white on 15 % overlay failed in neo-light |
| `color/steps/trigger/bg/complete` | `color/bg/success` | `color/fill/overlay` | green title on green bg failed; state is carried by the indicator |
| `color/steps/progress/range/bg` | `color/bg/primary/base` | `color/fg-accent/primary` | range vs track was ≈ 1.4 : 1 |
| `size/steps/indicator/md` | `dimension/30` | `dimension/32` | one scale with Action Icon (24 / 32 / 40) |
| `size/steps/indicator/lg` | `dimension/36` | `dimension/40` | 〃 |
| `text/steps/number/sm \| md \| lg` | `text/sm \| md \| lg` | `text/xs \| sm \| md` | number was too big for the circle |
| `text/steps/icon/sm \| md \| lg` | `text/sm \| md \| lg` | `dimension/16 \| text/icon/md \| text/icon/lg` | same glyph scale as Action Icon |

`color/fg/on-primary-solid-neo` is the only existing semantic token that passes on
`color/bg/primary/base` in **all six** modes. The name is a misnomer; a rename to
`color/fg/on-primary-base` belongs in the Theme collection clean-up.

### Variables — new (collection `carousel`, code syntax set)

| Variable | Alias | CSS |
| --- | --- | --- |
| `size/carousel/trigger/sm` | `dimension/24` | `--size-carousel-trigger-sm` |
| `size/carousel/trigger/md` | `dimension/32` | `--size-carousel-trigger-md` |
| `size/carousel/trigger/lg` | `dimension/40` | `--size-carousel-trigger-lg` |
| `size/carousel/indicator/dot` | `dimension/8` | `--size-carousel-indicator-dot` |

### Variables — scope fixes
`spacing/steps/text`: `ALL_SCOPES` → `GAP`. `radius/steps/separator`: `ALL_SCOPES` → `CORNER_RADIUS`.

### Contrast after the change (measured from the variables, all six Theme modes)

| Pair | need | Light | Dark | neo-light | neo-dark | Business | Akros |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Carousel inactive dot / bar | 3 | 4.39 | 3.04 | 4.39 | 3.04 | 4.39 | **2.56** |
| Carousel active dot / bar | 3 | 16.22 | 14.68 | 16.22 | 14.68 | 16.22 | 18.90 |
| Carousel arrow / bar | 3 | 16.22 | 14.68 | 16.22 | 14.68 | 16.22 | 18.90 |
| Steps current number | 4.5 | 9.84 | 10.71 | 4.81 | 4.81 | 5.48 | 13.21 |
| Steps complete check | 3 | 5.02 | 5.02 | 5.02 | 5.02 | 5.02 | 11.01 |
| Steps default number | 4.5 | 14.42 | 14.68 | 14.42 | 14.68 | 14.42 | 14.84 |
| Steps complete title / page | 4.5 | 5.02 | 14.34 | 5.02 | 14.34 | 5.02 | 6.96 |
| Steps current title / page | 4.5 | 5.81 | 12.09 | 4.81 | **4.19** | 7.41 | 21.00 |
| Steps description / page | 4.5 | 6.16 | **3.27** | 6.16 | **3.27** | 6.16 | 7.57 |
| Steps progress range / track | 3 | 4.14 | 8.36 | 3.43 | **2.89** | 5.29 | 13.21 |
| Steps solid current / complete / default | 4.5 / 3 / 4.5 | 9.84 / 5.02 / 12.73 | 10.71 / 5.02 / 13.93 | 4.81 / 5.02 / 12.73 | 4.81 / 5.02 / 13.93 | 5.48 / 5.02 / 12.73 | 13.21 / 11.01 / 14.84 |

The remaining failures, in **bold**, are all **Theme-level** semantics. Fixing them in a
component alias would only move the problem:
- Akros `color/fg/placeholder` = `#999999`.
- neo-dark `color/fg-accent/primary` = `#e60000` on near-black.
- Dark `color/fg/secondary` (facelift **C2**).

### Components — Carousel page (`🟢 Carousel`, 1188:2)
- New component sets:
  - `CarouselIndicator` (`state=default|active`): a 24 × 24 frame (`size/carousel/indicator`) around an 8 px ellipse (`size/carousel/indicator/dot`).
  - `CarouselIndicators`: three indicators, gap `spacing/carousel/indicator`.
  - `CarouselControl` (`size=sm|md|lg`): Prev and Next are **Action Icon** instances (neutral, the same size as the variant) with `token-icon-carousel-prev` / `-next`, plus `CarouselIndicators`. Fill `color/carousel/control/bg`, padding `padding/carousel/control`, gap `spacing/carousel/control`, radius `radius/carousel`.
- All 8 `Carousel` variants now contain a `CarouselControl` instance. `sm` maps to `sm`, `md` to `md`, and `lg` and `full` map to `lg`. Center variants centre the control.
- Variant `size=ful, Alignment=Center` was renamed to `size=full, Alignment=Center`.
- The 3 instances of the old `CarouselControl` (in the Control Position demos) were swapped to the new `md`.
- Removed: the orphan `CarouselPrevious` / `CarouselNext` instances (their main components no longer existed), the old `CarouselIndicator` set, the `CarouselIndicators` instance, and the old `CarouselControl` component.
- The "Properties & Tokens" section now carries the token table and this log.

### Components — Steps page (`🟢 Steps`, 1153:2)
- Main set `Steps` (`variant × size`): indicators are now 24 / 32 / 40, with number and check sizes 12 / 14 / 20 and 16 / 20 / 24.
- The demo grids (Indicator, Number, Orientation) were bound to the tokens instead of raw 24 / 28 / 32 sizes.
- Vertical orientation demo. These were the broken gaps the user reported:
  - The separator used to start 4 px under the circle and run into the next circle. It now has a symmetric `spacing/steps/text` gap above and below. Its length is `spacing/steps/separator-vertical` and its width is `size/steps/separator/width`.
  - All row, column and text gaps are bound to `spacing/steps/*`.
  - The demo shows only the **active** panel, as Zag renders it.
- New "Properties & Tokens" section at the bottom, with the props, the token table and this log.
- Not done: an `orientation` variant axis on the component set. It is still demo-only.

### Table consolidation
- Deleted the old `🟧 Table` page (1390:4). None of its 18 components had instances on any other page.
- `🟧 Table2` was renamed to `🟧 Table`. All 188 `Table2*` node names became `Table*` (for example `Table2.Cell` → `Table.Cell`), along with the page title texts.
- Node IDs are unchanged, so the 10 `data-table-*.figma.ts` Code Connect templates still resolve.
- The Table page now holds **both** tables, built from the same `Table.*` parts:
  - **`Table`** (3938:1793) is new. It is the static primitive (`organisms/table.tsx`), a component set with `variant` line|outline|striped × `size` sm|md|lg. Each variant has a caption, a header (4 × `Table.ColumnHeader`), a body (3 × `Table.Row`) and a footer (4 × `Table.Cell`). Sizes are bound to `padding/table/cell/{size}/x|y`, `text/table/{size}` and `padding/table/caption/{size}`. Outline uses `border/table/width` + `radius/table`.
  - **`DataTable`** (3399:330) is the former `Table2` assembly. The component, frame and title were renamed from `Table` to `DataTable` so the two don't collide.
- Rebound the Table page from remote library variables to local ones: 197 bindings. The remaining remote bindings are inside instances of remote library components (Token Icons, Icon) and follow those main components.
- Code Connect republished on 2026-10-08:
  - `table.figma.ts` now points at `3938-1793`.
  - The `data-table.figma.ts` comment changed from `Table2` to `DataTable`.
  - `carousel.figma.ts` gained the `full` size mapping, after the variant typo fix.
  - All templates uploaded without errors.
- Not done: the shadow `shadow/table/outline` on the outline variant (an effect, not bound).

### Page status
Carousel and Steps were already 🟢. They now meet the bar the emoji claims. Table stays 🟧.

---

## 2026-10-08 · Contrast fixes from the audit and the Notion board

Source: the Notion "Open" board (Akros contrast, Tabs, success badge, placeholder, selected
nav) and the audit table. All of these are token changes, made in Figma. Every pair below
was measured from the variables in all six Theme modes and passes ≥ 4.5 : 1, except where
noted.

### Component tokens (all modes)

| Variable | Before | After | Fixes |
| --- | --- | --- | --- |
| `color/tabs/trigger/fg/selected` | `color/bg/primary/base` | `color/fg/primary` | selected tab 1.23 : 1 (base) and Akros yellow on grey; the indicator carries the brand colour |
| `color/tabs/list/bg` | `color/fill/highlight` | `color/fill/surface` | inactive tab 4.18 : 1 (light), 1.66 : 1 (dark) → 5.6 / 5.64 |
| `color/tabs/trigger/fg/solid/selected` | `color/fg/on-primary-solid` | `color/fg/on-primary-solid-neo` | was 3.3 : 1 in Business |
| `color/tree-view/fg/selected` | `color/bg/primary/base` | `color/fg/primary` | TreeView selected 4.23 : 1 and the Akros "selected nav item" (`#fdc52f` on `#e2e2e2`, 1.22 : 1) — the Akros admin sidebar is a TreeView |
| `color/badge/fg/success` | `color/fg/light` | `color/base/dark` | Akros success badge 3.03 : 1 → 6.91 |
| `color/badge/fg/warning` | `color/fg/light` | `color/base/dark` | Akros warning badge 1.72 : 1 → 12.19 (also badges inside DataTable rows) |

### Theme tokens (per mode)

| Variable | Mode(s) | Before | After | Fixes |
| --- | --- | --- | --- | --- |
| `color/fg/secondary` | Dark, neo-dark | `#566277` (raw) | `color/neutral/400` | facelift **C2**: 3.26 : 1 on page, 2.38 : 1 on cards → 7.74 / 5.64 |
| `color/fg/placeholder` | Light, neo-light, Business | `color/neutral/500` | `color/neutral/600` | placeholder on the input fill 4.3 : 1 → 6.78 (focus 5.39) |
| `color/fg/placeholder` | Akros | `color/neutral/400` (`#999`) | `color/neutral/600` | Akros placeholder 2.85 : 1 → 6.78 (focus 5.35, hover 4.76) |
| `color/fg/placeholder` | Dark, neo-dark | `color/neutral/500` | `color/neutral/400` | 4.17 : 1 → 7.74; also separates placeholder from disabled (facelift E) |
| `color/bg-light/primary/base \| hover \| active` | neo-dark | `color/primary/100 \| 200 \| 300` (light tints) | `color/primary/800 \| 700 \| 600` | neo-dark used light-mode tints; mirrors what Dark already does. Outline-selected tab 1.22 : 1 → 6.42 |

**Still open (design decision):** the input **hover** fill is the brand tint `fill/hover`.
Placeholder on it is 3.64 : 1 (Dark) and 3.21 : 1 (neo-dark), on blue and red tints. Either the
form-control hover fill moves to a neutral (`fill/active`), or hover is accepted as transient.

### Code fixes in the same branch
| Item | Commit |
| --- | --- |
| Skeleton `aria-prohibited-attr` | `fix(ui): Skeleton no longer puts aria-label on a role-less div` — v1.0.1 |
| Pagination / DataTable pagination `aria-prohibited-attr` | `fix(ui): Pagination disabled prev/next render as a button` — v1.0.1 |
| FormNumericInput label not linked (axe `label`, critical) | `fix(ui): FormNumericInput label always targets the real input` — v1.1.1 |
| Akros Orders shipping column squeezed | `fix(ui): DataTable fixed layout keeps declared column widths` — v1.2.1 |
| "Akros not registered" | already on master (`847ca8b58`); all Akros demo stories set `brand: "akros"` |

Each fix was reproduced with axe-core 4.11 against Storybook before the change and verified
at 0 violations after it.

---

## 2026-10-08 · Export 18:15 verified, round 2 (needs another export)

The export `feat/figma-variables-20261008-1815` was cherry-picked and merged
(`merge-figma-themes.mjs`). Every variable in the two sections above matched, 28/28 component
re-aliases plus all per-mode Theme values, and `validate:tokens` passes. Code follow-ups landed:
- Carousel v1.1.0 (ActionIcon triggers, 24 px indicators).
- Steps needed no code change; its per-size icon classes already override the bare default.

Re-running axe `color-contrast` on the real stories with the exported tokens cleared Tabs,
TreeView, Badge, Input and Carousel in all six brand/mode combinations. It found 3 more Steps
issues that only the real `solid` variant shows. Fixed in Figma:

| Variable | Before | After | Why |
| --- | --- | --- | --- |
| `color/steps/trigger/bg/complete` | `color/fill/overlay` | `color/fill/surface` | solid complete title 4.05 : 1 → 4.56 |
| `color/fg-accent/primary` [neo-dark] | `color/primary/600` (`#e60000`) | `color/primary/400` | accent text on near-black 4.18 : 1 → 8.31 (also the progress range) |
| `color/steps/title/fg/solid/current` | — | `color/fg/primary` (**new**, `--color-steps-title-fg-solid-current`) | accent title on its own accent tint failed (neo-light 3.95, neo-dark 2.65); now 6.42 – 18.54 |

The Figma Steps solid variants bind the new token. **Code waiting for the next export:**
steps.tsx `solid` variant adds `title: "data-current:text-steps-title-fg-solid-current"`.

Still open at Theme level: neo-light `fg-accent/primary` (`#e60000`) on `fill/surface` is
4.37 : 1. That's accent text on grey cards, not used by Steps.

---

## Check after the token export (code side)

Run after the user re-exports. Expected diff in `tokens/figma/*/variables.css`:
- [x] All re-aliases from the table above, in every mode file.
- [x] 4 new `--size-carousel-*` variables.

Code changes these Figma changes require:
- [x] `carousel.tsx`: `Carousel.Previous` / `Next` / `Autoplay` become `ActionIcon`, with size from the carousel `size` context (`sm` → `sm`, `md` → `md`, `lg` / `full` → `lg`). This is B9.
- [x] `carousel.tsx`: `Carousel.Indicator` becomes a 24 px button (`w-carousel-indicator`) that renders an 8 px dot (`size-carousel-indicator-dot`) inside it. Today the whole button is the dot.
- [x] `_carousel.css`: no change needed — `size-carousel-indicator-dot` resolves straight from the exported `--size-*` token.
- [x] `_steps.css`: no change needed — the per-size `text-steps-icon-{sm,md,lg}` classes already override the bare default.
- [x] Re-run Storybook a11y on Carousel and Steps and compare against the contrast table.
- [x] Contrast block: re-run axe `color-contrast` on Tabs, TreeView, Badge, Input and every
      `Pages/Akros/*` story under base, dark, neo, neo-dark, business and akros; expect 0
      for the pairs listed above.

**Result (exports 18:15 + 18:50):** all items verified. Akros page demos went from 111 contrast
violations to 0. Tabs, TreeView, Badge, Input, Carousel and Steps component markup are clean in
all six brand/mode combinations.

## 2026-10-08 · Visual comparison: control family (Figma ↔ Storybook)

Method: measured every size of the control family in Storybook (Playwright, rendered box,
computed radius / font size) and the same component sets in Figma (`use_figma`), then compared.
Guidance from the `ui-ux-pro-max` skill: web target size is 24 CSS px (WCAG 2.2 AA) rather
than the native 44/48, state clarity, and read-only kept distinct from disabled.

### What was wrong

| Control | sm | md | lg | Note |
| --- | --- | --- | --- | --- |
| Button (code) | 32 · r8 | 44 · r12 | **56** · r16 | `lg` height came from padding + line-height |
| Button (Figma) | **34 · r4** | 44 · **r8** | **57.5 · r12** | stale remote variables, px line-heights 24 / 30 / 37.5 |
| Input / NumericInput / SearchForm | 32 | 44 | **70** | `height/form-control/lg` → `dimension/70` |
| Select / Combobox (code) | 32 | 44 | **60** | `lg` did not use the shared height token |
| Select `lg` trigger (Figma) | 32 | 44 | **54, unbound** | |
| PhoneInput | 32 | 44 | 56 / **70** | code / Figma disagreed |
| Pagination | 32 | 44 | **48** | `height/pagination/lg` → `dimension/48` |
| Tabs trigger | **33 / 36** | **50** | **68 / 70** | padding-derived, off the 4 px grid |

Root causes:
1. **Every control page was still bound to remote library copies** of the variables (the
   problem first found on Steps / Carousel). Figma drew stale values, for example a 4 px Button
   radius where the local and exported token is 8.
2. Three different `lg` heights: 56 (Button), 60 (Select, Combobox) and 70 (form controls).
3. Hard-coded pixel line-heights in Figma text layers, which do not match code's 1.5.
4. `Tabs.Trigger` had a duplicate variant name (`outline / md / selected` twice, with
   `outline / lg / selected` missing), so the component set was in an error state.

### Figma changes

- Rebound remote → local on Button, Input, NumericInput, Select, Combobox, SearchForm,
  PhoneInput, Pagination and Tabs: **≈ 6 400 bindings**, every one matched. The remote
  `Semantic/Color` collection maps to local `Theme` by unique name.
- `height/form-control/lg`: `dimension/70` → **`dimension/56`**.
- `size/form-control/{sm,md,lg}` now alias `height/form-control/*`, so there is one scale
  instead of two parallel ones. `size/combobox/*` follows through it.
- `height/pagination/lg`: `dimension/48` → `height/form-control/lg`.
- Button variants (360): height bound to `height/form-control/{size}`; label line-height set to 150 %.
- Select `lg` trigger: height `height/form-control/lg`, radius `radius/select/lg`.
- Tabs.Trigger (36): height bound to `height/form-control/{size}`, line-height 150 %.
  The mis-named variant was renamed to `variant=outline, size=lg, state=selected`.
- Scopes: `dimension/56` and the 14 `date-picker` size variables moved off `ALL_SCOPES`.

**Result in Figma:** Button, Input, NumericInput, SearchForm, Select, Combobox, PhoneInput and
Pagination all measure **32 / 44 / 56** with radius **8 / 12 / 16**. Tabs triggers are 32 / 44 / 56.

### Code changes waiting on the next export

- [x] Cherry-pick the export and run the merge script; `--height-form-control-lg` should become `3.5rem`.
- [x] `button.tsx` `lg`, `select.tsx` `lg` trigger and `combobox.tsx` `lg` control use
      `h-form-control-lg` (+ `rounded-*-lg`) like `sm` / `md` already do.
- [x] `tabs.tsx` triggers use `h-form-control-{size}`.
- [x] Re-measure: every control renders 32 / 44 / 56.

### Still open from this pass

- Select `xs` (28 in Figma, 30 in code) and CascadeSelect `xs` (36) are off the control scale.
  This needs a decision on whether `xs` stays as a compact step (for example 24 or 28) or goes.
- Read-only Rating is still a focusable 20 px radiogroup (axe `target-size`). A display
  rating should be `role="img"` with an "x out of 5" label.
- The remaining ~40 component pages have not been rebound yet. Rebind before their facelift.

## 2026-10-09 · Full relink, small-size unification, contrast pass

### Relinking (mandatory, done for the whole file)

- **Variables:** every page was rebound from remote library copies to the local variables
  (≈ 25 000 more bindings on top of the control family), including overrides inside instances.
- **Components:** 2 919 instances of **remote library components** were swapped to their local
  twins by name (380 distinct components). 96 components existed only in the library
  (mostly Token Icons, plus Select item, Tooltip and similar parts). They were copied locally into
  *Icon page → "Relinked library components (local copies, 2026-10-09)"* and their internals
  were rebound.
- 210 stale size overrides on nested icon instances (size can't be overridden there) were
  cleared with `resetOverrides`; layer names were restored.
- **Verification:** 66 / 66 pages, **0 remote variable bindings, 0 remote component instances.**

### Small controls (Overview → Component comparison)

- Select / CascadeSelect `xs` triggers now use the small control height (`height/form-control/sm`,
  32 px) and radius. In Figma, Select `xs` = `sm` = 32 px / r8 / 16 px text.
- Small field text is 16 px everywhere. `text/input|textarea|numeric-input|combobox|phone-input|date-picker/sm`
  and the Select / CascadeSelect trigger and value `xs`/`sm` text → `text/base` (16). Code already
  floored editable fields at 16 px for iOS (`_reset.css`); Select stayed at 14 px, so it looked
  smaller next to Input and Combobox. `text/label/sm` is pinned to `text/sm` so labels stay 14 px.
- CascadeSelect text variables were renamed `…/trigger-sm` → `…/trigger/sm` (same CSS names).
  New `radius/cascade-select/lg`.

### Contrast (all six modes: Light, Dark, neo-light, neo-dark, Business, Akros)

Semantic text (4.5 : 1 on base **and** surface):

| Token | Fix |
| --- | --- |
| `fg-accent/warning` | Light, Business → warning/700; neo-dark → warning/600 |
| `fg-accent/success` | Light, Business, neo-light → success/700 |
| `fg-accent/danger` | Light, Business → danger/700; neo-dark → danger/400 |
| `fg/status-warning` (C1) | Light, neo-light, Business → warning/700; Akros → warning/800 |
| `fg-accent/primary` | neo-light → primary/700 |
| `fg-accent/secondary`, `tertiary` | neo-dark → secondary/600, tertiary/400 |

New semantic tokens for control boundaries and states (C3, 3 : 1):

| Token | Value | Used by |
| --- | --- | --- |
| `color/border/control` | neutral/500 | form-control border (Input, Textarea, NumericInput, Select, Combobox, SearchForm), Checkbox, Switch, Slider, Radio |
| `color/bg/control-checked` | success/700 (dark modes and Akros: /600) | Checkbox checked and indeterminate, Switch checked |
| `color/border/control-selected` | primary/600 (Business /500, Akros tertiary/500) | Radio checked borders |
| `color/border/danger·success·warning` | → `fg-accent/*` | every control validation border, `border/*-focus` |
| `color/fg/on-selected` | white; Akros → `fg/primary` | Select item, Table row, popup item selected text |

Other component fixes: Select trigger hover text → `fg/primary`; NumericInput / Combobox trigger hover icons
→ `fg-accent/primary`; danger ActionIcon hover → `fg-accent/danger`; RadioCard and DatePicker text
on primary fills → `fg/on-primary-solid-neo`; RadioCard subtle-checked → `fg/primary`; status
icons (`icon/fg/*`) → `fg-accent/*`.

**38 raw colour values in neo-light / neo-dark** were left over from an older copy (neo-dark had
light pastel `bg-light/*` tints) and are now aliased to the same palette steps as Light / Dark.

Decorative separators (`border/primary`, table, popup, PhoneInput divider) stay at 1.4 : 1 because
WCAG 1.4.11 doesn't apply to dividers.

**Audit result in Figma:** 0 semantic text tokens below 4.5 : 1, and 0 control boundary or state tokens
below 3 : 1, in any mode.

### Flagged, not changed

- Akros `color/fill/base` resolves to **#000000**, and `form-control/bg` aliases it. Is that intended?

### Code changes waiting on the next export

- [x] Cherry-pick the export and merge; `--height-form-control-lg` → 3.5rem; new `--color-border-control`,
      `--color-bg-control-checked`, `--color-border-control-selected`, `--color-border-danger|success|warning`,
      `--color-fg-on-selected`, `--radius-cascade-select-lg`.
- [x] Commit the control-scale code: Button / Select / Combobox / CascadeSelect `lg` on `h-form-control-lg`,
      Select / CascadeSelect `xs` on `h-form-control-sm`, Tabs triggers on `h-form-control-*`.
- [x] Re-measure every control at 32 / 44 / 56. **Result (export 2026-10-09 12:23):** Button, Input, NumericInput,
      SearchForm, Select (`xs` = `sm`), Combobox, CascadeSelect, PhoneInput, Pagination and Tabs render 32 / 44 / 56 px
      with radius 8 / 12 / 16 (Pagination keeps 8), and small field text is 16 px.
- [ ] Run axe `color-contrast` across all stories in all six modes.
