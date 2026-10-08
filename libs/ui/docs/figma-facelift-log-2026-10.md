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

## Check after the token export (code side)

Run after the user re-exports. Expected diff in `tokens/figma/*/variables.css`:
- [ ] All re-aliases from the table above, in every mode file.
- [ ] 4 new `--size-carousel-*` variables.

Code changes these Figma changes require:
- [ ] `carousel.tsx`: `Carousel.Previous` / `Next` / `Autoplay` become `ActionIcon`, with size from the carousel `size` context (`sm` → `sm`, `md` → `md`, `lg` / `full` → `lg`). This is B9.
- [ ] `carousel.tsx`: `Carousel.Indicator` becomes a 24 px button (`w-carousel-indicator`) that renders an 8 px dot (`size-carousel-indicator-dot`) inside it. Today the whole button is the dot.
- [ ] `_carousel.css`: `--width-carousel-indicator` alias still valid (now 24 px); add the dot alias.
- [ ] `_steps.css`: drop the hardcoded `--text-steps-icon: var(--text-md)` and use the per-size `--text-steps-icon-{sm,md,lg}`.
- [ ] Re-run Storybook a11y on Carousel and Steps and compare against the contrast table.
- [ ] Contrast block: re-run axe `color-contrast` on Tabs, TreeView, Badge, Input and every
      `Pages/Akros/*` story under base, dark, neo, neo-dark, business and akros; expect 0
      for the pairs listed above.
