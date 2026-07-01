---
name: vibe-theme
description: Create a new code-authored ("vibed") brand theme from a brief — deriving a full, consistent, accessible token set in the codebase without a Figma export. Use when a customer needs a brand theme fast and there is no time to build it in Figma first. Produces a registered, toggle-selectable brand (not the default). The reverse of figma-token-binding.
---

# vibe-theme

Author a complete brand theme **in code** from a prompt (a brand brief), so a
customer theme can ship without first being built in Figma. The result is a
normal registered brand — selectable via the theme toggler alongside `base` and
`neo`, **not** the default (`DEFAULT_BRAND` stays `base`).

This is the mirror image of [`figma-token-binding`](../figma-token-binding/SKILL.md):
that skill pulls tokens Figma → code; this one produces the same artifact
(a per-mode brand folder pair) from a brief instead of an export. Because the
merge pipeline only reads `--name: value;` declarations, it does not care which
producer wrote them — a vibed brand and an exported brand are indistinguishable
downstream.

## Prime directive

**A vibed theme must be as disciplined as a Figma-exported one — consistent,
two-layered, and accessible.** Never ship a brand that:

- is missing tokens or has extra tokens vs. `base` (breaks the merge diff),
- introduces raw color literals into semantic/component tokens (breaks the
  two-layer rule — those layers must *alias*), or
- has fg/bg pairs below WCAG AA.

The `validate-brand.mjs` script enforces the first two as hard errors and flags
the third. Do not register or merge a brand that fails validation. When a
contrast check fails, **fix the palette** (darken/lighten the offending step or
re-point the semantic alias) and re-validate — do not silence it.

## How the system works (why this is a producer, not a new mechanism)

The theme pipeline is brand-agnostic. Every brand is a **full parallel token
set** — one folder per mode, each with the exact same ~1782 token names:

```
libs/ui/src/tokens/figma/light/        base brand, light mode  (source of truth)
libs/ui/src/tokens/figma/dark/         base brand, dark mode
libs/ui/src/tokens/figma/neo/          neo brand,  light mode
libs/ui/src/tokens/figma/neo-dark/     neo brand,  dark mode
libs/ui/src/tokens/figma/<brand>/      NEW brand,  light mode  ← you write this
libs/ui/src/tokens/figma/<brand>-dark/ NEW brand,  dark mode   ← and this
```

`merge-figma-themes.mjs` merges each brand's light+dark into `light-dark()`,
then **diffs each brand against base** and emits only the differences under
`[data-theme="<attr>"]` in `brand-overrides.css`. The runtime
(`theme-provider.tsx`) applies `data-theme="<attr>"` on `<html>` for the brand
axis and a `.light`/`.dark` class for the mode axis.

## The core rule: touch primitives, inherit the rest

`neo` overrides only ~37 of 1782 tokens, yet re-skins the entire library. That
works because every semantic and component token is a `var()` chain pointing at
the primitive scales — override the roots and the change cascades everywhere.

**A vibed brand starts as a byte-for-byte copy of base** (via `scaffold-brand.mjs`)
and edits ONLY the brand-defining surface. Untouched tokens stay identical to
base, so merge emits them as non-diffs and the brand inherits the whole system.
This is what keeps a vibed theme internally consistent *by construction*. Never
hand-author all 1782 values — that discards the cascade and turns every token
into a place a bug can hide.

## The brand-defining surface (what you edit)

Two tiers. Mirror what `neo`/`cyber` change (diff `neo` against `light` to see
the canonical set):

**Tier 1 — primitive scales (always edit).** The OKLCH color ramps that define
the brand:

- `--color-primary-100 … --color-primary-900` (light: 100 lightest → 900 darkest)
- `--color-primary-alpha-10` (and any other primary alpha variants present)
- `--color-secondary-100 … 900` if the brand has a distinct secondary/accent.

**Tier 2 — contrast-driven semantic re-aliases (edit only when contrast demands).**
When the brand's chosen background step is darker or lighter than base's, some
foregrounds must flip and some `bg-primary-*` aliases must re-point. The set neo
flips (adapt to your brand — do not copy blindly):

```
--color-bg-primary-base / -hover / -active        (which primary step is the fill)
--color-bg-light-primary-* , --color-bg-outlined-primary-*
--color-button-fg-primary                          → fg-reverse when fill is dark
--color-badge-fg-primary
--color-fg-accent-primary                          (accent-text step)
--color-product-card-button-cart-fg
--color-radio-card-*-solid-checked
--color-steps-indicator-fg-solid
--color-tabs-trigger-fg-solid-selected
```

**Tier 3 — structural tokens (edit only for a full restyle).** A brand may also
change shape, not just color — sharp vs. rounded corners, a denser type scale,
tighter padding. These live in the same folders and override the same way. Key
rules:

- **Radius (corners):** component radii alias scale roots
  (`--radius-button-md → --radius-md`). To make everything sharp, set the
  rectangular scale roots `--radius-xs/sm/md/lg/2xl` to `0rem` — it cascades to
  every component. Leave `--radius-full` alone so pills, switches, radio dots
  and avatars stay round (zeroing it squares them off, usually unwanted).
- **Type scale:** override the `--text-*` roots (and their `-min` fluid halves,
  e.g. `--text-sm` + `--text-sm-min`). Component text tokens alias these, so the
  whole system rescales. Changing body sizes shifts layout — verify.
- **Padding:** component padding tokens alias the **`--dimension-*`** scale,
  which is **shared with sizing** (`--dimension-20` feeds both
  `--padding-button-x-md` and some `--size-*`). Do **not** override
  `--dimension-*` roots — you'll resize unrelated things. Instead re-point the
  specific `--padding-*` tokens to a *different existing* `--dimension-*`
  (e.g. `--padding-button-y-md: var(--dimension-4)`). Keep them as `var(--…)`,
  never a raw literal — a raw literal on a token that aliased in base trips the
  validator's alias→literal error (and breaks the two-layer rule).
- **NOT tokenized — font family.** There is no `--font-family-*` token in the
  export pipeline, so a brand cannot swap the typeface through the brand folder.
  A mono/techy font needs a separate change: add a `--font-family-*` token +
  a `[data-theme="<brand>"] { font-family: … }` rule + load the webfont. Call
  this out to the user as a follow-up rather than pretending the brand covers it.

Everything you do NOT touch stays as the base copy and inherits.

Reference brand for a full structural restyle: `cyber` (neon cyan + magenta,
radius 0, tighter type, flatter buttons) — diff `figma/cyber/variables.css`
against `figma/light/variables.css`.

## Workflow

### 1. Capture the brand brief

From the prompt, pin down: primary hue (or seed hex/OKLCH), mood
(muted/vivid/dark), optional secondary/accent, and the customer name → brand key
(lowercase kebab-case, e.g. `acme`, `ocean-blue`).

### 2. Scaffold the folder pair

```sh
node .agents/skills/vibe-theme/scripts/scaffold-brand.mjs <brand>
```

Creates `figma/<brand>/variables.css` and `figma/<brand>-dark/variables.css` as
copies of `light/` and `dark/`. Token-name parity and "both modes present" are
now guaranteed.

### 3. Derive the OKLCH primitive scales (light + dark)

Build a perceptually even 100→900 ramp at the brand hue. Guidance:

- **Hold hue (H) roughly constant**; vary lightness (L) monotonically and let
  chroma (C) peak in the mid steps (400–600) and taper at the ends. Look at
  base's own primary ramp for the L/C shape to match.
- **Light mode:** 100 ≈ L 0.94–0.96 (tint), 500 ≈ the brand's "true" color,
  900 ≈ L 0.38–0.42 (shade).
- **Dark mode:** brighten the mid/dark steps (400–900) by ~L +0.05 so the brand
  reads on dark surfaces — this is what makes merge emit `light-dark()` for
  those steps. The light tints (100–300) usually stay the same.
- Keep alpha variants pointed at the same base color as their solid step.

Edit these values in place in both files. Do not touch token names.

### 4. Apply contrast-driven re-aliases

Decide, per mode, whether the primary fill (`--color-bg-primary-base`) is dark
enough to need white (`--color-fg-reverse`) foreground. If so, flip the Tier-2
foregrounds and re-point the `bg-primary-*` steps to match (see the neo set).
If the brand is light/pastel, you may need the *opposite* — keep dark
foregrounds and leave these at base.

### 5. Register the brand

Two hand-synced registrations (the merge script's comment calls this out):

- **`.agents/skills/figma-token-binding/scripts/merge-figma-themes.mjs`** — add
  to `BRANDS`:
  ```js
  { attr: "<brand>", light: "<brand>", dark: "<brand>-dark" },
  ```
- **`libs/ui/src/theme/theme-config.ts`** — add to `THEMES`:
  ```ts
  <brand>: { label: "<Customer Label>", modes: ["light", "dark"], attr: "<brand>" },
  ```
  Leave `DEFAULT_BRAND = "base"` unchanged — the brand is toggle-selectable, not
  the default.

### 6. Validate

```sh
node .agents/skills/vibe-theme/scripts/validate-brand.mjs <brand>
```

Must report **0 errors**. Resolve every contrast warning by adjusting the
palette and re-running — do not proceed with a failing AA pair.

### 7. Merge

```sh
node .agents/skills/figma-token-binding/scripts/merge-figma-themes.mjs
```

Regenerates `variables.css` + `brand-overrides.css`. Confirm a
`[data-theme="<brand>"]` block appears with only your intended overrides (a
handful of tokens, like neo's ~37 — if it's hundreds, you edited too much or
broke the cascade).

### 8. Verify in Storybook (mandatory — same rule as figma-token-binding)

`bunx nx run ui-kit:build`, then open Storybook and switch the brand toggler to
the new brand in **both** light and dark. Screenshot the component gallery. The
new brand must re-skin cleanly with no broken contrast, no base-brand bleed-through,
and no layout shift. Surface anything that looks off before committing.

## Round-trip to Figma (code → Figma)

A theme born in code should be pushable back to Figma so both worlds stay in
sync. This is the reverse of the export path and uses `use_figma` (load the
`figma-use` skill first) plus `figma-generate-library`:

1. Read the brand's per-mode folder pair.
2. For each Figma variable collection, add a **mode** for the brand (neo already
   proved the multi-mode-per-collection shape) and set the brand's values on the
   primitives you overrode.
3. Everything else inherits through the existing Figma alias chains — same
   "touch primitives, inherit the rest" principle, mirrored in Figma.

Because both directions share the same token-name universe and folder shape,
sync is symmetric: Figma → code via export + merge, code → Figma via this step.

## Output expectations

When done, produce:

1. **Brand brief** — the resolved hue/mood/secondary and brand key.
2. **Palette table** — the derived primary (and secondary) OKLCH ramp, light + dark.
3. **Re-alias decisions** — which Tier-2 tokens flipped and why (contrast).
4. **Validation result** — `validate-brand.mjs` at 0 errors, 0 unresolved warnings.
5. **Merge result** — the `[data-theme="<brand>"]` override count.
6. **Storybook verification** — light + dark screenshots, any findings.
7. **Registrations** — the BRANDS + THEMES diffs.

## Scripts

- `scripts/scaffold-brand.mjs <brand>` — copy base → new brand folder pair.
- `scripts/validate-brand.mjs <brand>` — parity + two-layer + contrast gate
  (standalone; not yet wired into the CI-blocking `pnpm validate:tokens`).

## Reference

- Canonical brand to mirror: `neo` (diff `figma/neo/variables.css` against
  `figma/light/variables.css` for the exact editable surface).
- Merge + runtime: `merge-figma-themes.mjs`, `theme-config.ts`,
  `theme-provider.tsx`.
- Sibling skill (the other direction): `figma-token-binding`.
