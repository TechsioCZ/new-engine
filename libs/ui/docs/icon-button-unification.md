# Icon sub-button unification — research & plan

> Status: implemented & shipped (PR #467). Code complete; Figma `ActionIcon`
> component + frame migration is the remaining follow-up.
> Decisions locked: glyph scale **16 / 20 / 24**; hover **shared bg-pill**
> (light+dark via `--color-fill-hover`/`--color-fill-active`). Clear ✕ uses the
> **neutral** tone (subtle gray pill) — NOT red. `danger` tone is reserved for
> genuinely destructive actions. Hit area is a compact inset square (24/32/40),
> not full control height.

## Scope
Small icon-only interactive elements embedded in larger controls: dropdown
**chevrons**, **clear (✕)**, **increment/decrement**, **search**, **close (✕)**,
**prev/next**, expand **chevrons**, step **indicators**.

## Root cause — three competing sizing mechanisms
Icons render as a glyph font sized by `font-size` (`Icon` `size` → `text-icon-*`).
Three different mechanisms currently decide that size:

| # | Mechanism | How size is chosen | Behavior |
|---|-----------|--------------------|----------|
| A | Explicit keyword | JS ternary → `text-icon-{xs,sm,md}` | Fixed px, breakpoints differ per component |
| B | `current` / inherited | Icon inherits container `text-*` | Fluid (clamp), tracks viewport |
| C | Component CSS token | `text-<component>-icon-{sm,md,lg}` | Fixed, each component defines its own |

Active glyph scale (`tokens/figma/variables.css`): xs=12 · sm=14 · md=20 · lg=24 · xl=30 · 2xl=40 px.

## Current state (glyph px per component × size)

| Component | Sub-button | Mech | sm | md | lg | Hover |
|-----------|-----------|:--:|:--:|:--:|:--:|-------|
| NumericInput | inc / dec | A | 12 | 14 | 20 | bg-pill + fg |
| Combobox | chevron | A | 14 | 20 | 20 ⚠ | bg-pill + fg |
| Combobox | clear ✕ | B | 24 | 24 | 24 ⚠⚠ | bg-pill + fg |
| Select | chevron | A | 14 | 20 | 20 ⚠ | color only, no bg ⚠ |
| Select | clear ✕ | B | 14 | 20 | 24 ⚠ | bg-pill + danger |
| Select | (xs size) | A | chevron→20, no xs branch ⚠ | | | |
| SearchForm | clear ✕ | B | 14 | 20 | 24 | unstyled → no hover bg ⚠ |
| SearchForm | search icon | B | inherits button text | | | button hover |
| Accordion | chevron | B | inherits header text | | | rotate |
| Tree-view | node icon | C | 14 | 20 | 24 | scale-125 ⚠ |
| Tree-view | branch indicator | C | 20 | 24 | 30 | scale-125 |
| Breadcrumb | separator / ellipsis | C | 12 | 14 | 20 | n/a |
| Steps | indicator icon | C | 14 | 20 | 24 | in box |
| Tabs | trigger icon | B | 14 | 20 | 24 | bg-pill |
| Carousel | prev / next / autoplay | C | 20 | 20 | 20 ⚠ | bg-pill + fg |
| Pagination | prev / next / ellipsis | B | inherits button text | | | button hover |
| Dialog / Toast / Popover | close ✕ | B | inherits | | | color only |

## Problems
1. No agreement on glyph size for the same role (clear ✕ = 24/24/24 vs 14/20/24).
2. Mismatch within one component (Combobox md: chevron 20 vs clear 24).
3. `lg` doesn't grow (chevrons stay 20).
4. Fluid (B) vs fixed (A) mix → icons drift relative to each other across widths.
5. Select `xs` has no chevron branch → falls to 20.
6. Hover wildly inconsistent: bg-pill / color-only / scale-125 / none.
7. Hit-area/padding tokens per-component, no shared standard.

## Proposed direction
One shared icon-button standard with 3 sizes (mapped to form-control sm/md/lg),
covering glyph size + hit-area/padding + unified hover (light+dark). A small
nested **helper atom** owns this so it is defined **once** (Figma + code), with
per-component override still allowed.

### Token layer — `tokens/components/_icon-button.css`
As shipped in `tokens/components/_icon-button.css`:
```css
@theme static {
  /* Glyph scale — fixed, decoupled from fluid body text */
  --text-icon-control-sm: 1rem;                /* 16px (new) */
  --text-icon-control-md: var(--text-icon-md); /* 20px */
  --text-icon-control-lg: var(--text-icon-lg); /* 24px */

  /* Compact inset hit area (8-pt grid) — not full control height */
  --size-icon-control-sm: var(--dimension-24);
  --size-icon-control-md: var(--dimension-32);
  --size-icon-control-lg: var(--dimension-40);

  --padding-icon-control-sm: var(--spacing-50);
  --padding-icon-control-md: var(--spacing-100);
  --padding-icon-control-lg: var(--spacing-150);
  --radius-icon-control: var(--radius-button-sm);

  /* Focus ring + disabled fg */
  --color-icon-control-ring:        var(--color-ring);
  --color-icon-control-fg-disabled: var(--color-fg-disabled);

  /* Neutral tone — glyph stays full-contrast; bg pill is the hover/active affordance */
  --color-icon-control-fg:        var(--color-fg-primary);
  --color-icon-control-bg-hover:  var(--color-fill-hover);
  --color-icon-control-bg-active: var(--color-fill-active);

  /* Danger tone — reserved for destructive actions */
  --color-icon-control-fg-danger:        var(--color-fg-primary);
  --color-icon-control-fg-danger-hover:  var(--color-danger-fg);
  --color-icon-control-bg-danger-hover:  var(--color-danger-light);
  --color-icon-control-bg-danger-active: var(--color-danger-light-active);
}
```
The interactive button (hit-area, glyph, hover/active pill) lives in the
`ActionIcon` atom (`src/atoms/action-icon.tsx`); chevrons read the
`--text-icon-control-*` glyph tokens directly.

### Migration (per component)
NumericInput, Combobox, Select, SearchForm, Accordion, Dialog, Toast, Popover,
Tabs, Pagination, Carousel, Tree-view, Breadcrumb, Steps, Phone-input — replace
bespoke ternaries / `current` / per-component CSS with the shared helper.
`xs` form sizes map to `sm` (16).

Out of scope: radio-card mark, checkbox/switch/slider marks, status-text icons.

### Validation
`pnpm validate:tokens`; `bunx biome check --write <files>`; `bunx nx run ui-kit:build`;
Storybook visual pass (sm/md/lg, light + dark) via browser agent.

### Figma
Mirror the helper as a nested component with a `size` variant; bind component
tokens `text/icon-control/{sm,md,lg}`, `color/icon-control/bg/hover[/danger]`
through semantic→core; explicit scopes + CSS code syntax. Validate every frame
by screenshot so the existing Figma file stays unbroken.
