---
name: vibe-theme
description: Create a new code-authored ("vibed") brand theme from a brief — deriving a full, consistent, accessible token set in the codebase without a Figma export. Use when a customer needs a brand theme fast and there is no time to build it in Figma first. Produces a registered, toggle-selectable brand (not the default). The reverse of figma-token-binding.
---

# vibe-theme

Author a complete brand theme **in code** from a prompt (a brand brief), so a
customer theme can ship without first being built in Figma. The result is a
normal registered brand — selectable via the theme toggler alongside `business`,
`akros` and `n1`, **not** the default (`business` stays first in `figma/brands.json`).

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

The brand validator rejects unknown tokens and fg/bg pairs below AA, and
reports two-layer breaks as warnings (the kit's own Figma brands still have a
few). Do not register or merge a brand that fails validation. When a
contrast check fails, **fix the palette** (darken/lighten the offending step or
re-point the semantic alias) and re-validate — do not silence it.

## How the system works (why this is a producer, not a new mechanism)

The theme pipeline is brand-agnostic. Every brand is a **full parallel token
set** — one folder per mode, each with the exact same set of token names as
base (parity guaranteed by `scaffold-brand.mjs`):

```
libs/ui/src/tokens/figma/light/        base foundation, light mode  (source of truth)
libs/ui/src/tokens/figma/dark/         base foundation, dark mode
libs/ui/src/tokens/figma/business/     business brand, light only (reused for both modes)
libs/ui/src/tokens/figma/<brand>/      NEW brand,  light mode  ← you write this
libs/ui/src/tokens/figma/<brand>-dark/ NEW brand,  dark mode   ← and this
```

`merge-figma-themes.mjs` merges each brand's light+dark into `light-dark()`,
then **diffs each brand against base** and emits only the differences under
`[data-theme="<attr>"]` in `brand-overrides.css`. The runtime
(`theme-provider.tsx`) applies `data-theme="<key>"` on `<html>` for the brand
axis and a `.light`/`.dark` class for the mode axis.

## The core rule: touch primitives, inherit the rest

`business` overrides only a small slice of tokens, yet re-skins the entire library. That
works because every semantic and component token is a `var()` chain pointing at
the primitive scales — override the roots and the change cascades everywhere.

**A vibed brand starts as a byte-for-byte copy of base** (via `scaffold-brand.mjs`)
and edits ONLY the brand-defining surface. Untouched tokens stay identical to
base, so merge emits them as non-diffs and the brand inherits the whole system.
This is what keeps a vibed theme internally consistent *by construction*. Never
hand-author the whole set — that discards the cascade and turns every token
into a place a bug can hide.

## The brand-defining surface (what you edit)

Two tiers. Mirror what `business`/`cyber` change (diff `business` against
`light` to see the canonical set):

**Tier 1 — primitive scales (always edit).** The OKLCH color ramps that define
the brand:

- `--color-primary-100 … --color-primary-900` (light: 100 lightest → 900 darkest)
- `--color-primary-alpha-10` (and any other primary alpha variants present)
- `--color-secondary-100 … 900` if the brand has a distinct secondary/accent.

**Tier 2 — contrast-driven semantic re-aliases (edit only when contrast demands).**
When the brand's chosen background step is darker or lighter than base's, some
foregrounds must flip and some `bg-primary-*` aliases must re-point. The set a
dark-fill brand flips (adapt to your brand — do not copy blindly):

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
foregrounds and re-point the `bg-primary-*` steps to match (see the Tier-2 list above).
If the brand is light/pastel, you may need the *opposite* — keep dark
foregrounds and leave these at base.

### 5. Register the brand

List it once in **`libs/ui/src/tokens/figma/brands.json`** (after `business`,
which stays first and the default):

```json
{ "key": "<brand>", "label": "<Customer Label>", "modes": ["light", "dark"] }
```

The merge script, the Storybook toolbars, the visual matrix and the generated
`src/theme/built-in-brands.ts` all read this list.

### 6. Merge and export

```sh
node .agents/skills/figma-token-binding/scripts/merge-figma-themes.mjs
node libs/ui/scripts/validate-token-scopes.js --write
```

### 7. Validate

```sh
pnpm --dir libs/ui exec vitest run tests/brand-themes.test.ts
```

Every built-in brand must pass the brand validator (known tokens only, WCAG AA
on the checked pairs). Resolve a contrast failure by adjusting the palette —
do not proceed with a failing AA pair.

Regenerates `variables.css` + `brand-overrides.css`. Confirm a
`[data-theme="<brand>"]` block appears with only your intended overrides (a
handful of tokens (comparable to the `business` block) — if it's hundreds, you edited too much or
broke the cascade).

### 8. Verify in Storybook (mandatory — same rule as figma-token-binding)

`bunx nx run ui-kit:build`, then open Storybook and switch the brand toggler to
the new brand in **both** light and dark. Screenshot the component gallery. The
new brand must re-skin cleanly with no broken contrast, no base-brand bleed-through,
and no layout shift. Surface anything that looks off before committing.

## A runtime brand instead of a kit brand

A brand does not have to ship in the kit. An application can store it as data
(`BrandDefinition`: `key`, `label`, `modes`, `tokens`) and pass it to
`AppThemeProvider`; no kit release is needed. For that path skip steps 2, 5 and
6: write only the overriding tokens (Tier 1 primitives, Tier 2 re-aliases) into
a JSON file, then validate it with the same validator the application runs:

```sh
pnpm --dir libs/ui build
node .agents/skills/vibe-theme/scripts/validate-brand.mjs <brand>.json
```

A brand with both modes writes a mode-dependent value as
`light-dark(<light>, <dark>)`.

## Round-trip to Figma (code → Figma)

A theme born in code should be pushable back to Figma so both worlds stay in
sync. This is the reverse of the export path and uses `use_figma` (load the
`figma-use` skill first) plus `figma-generate-library`:

1. Read the brand's per-mode folder pair.
2. For each Figma variable collection, add a **mode** for the brand (business, akros
   and n1 already prove the multi-mode-per-collection shape) and set the brand's values on the
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
4. **Validation result** — the brand validator at 0 errors.
5. **Merge result** — the `[data-theme="<brand>"]` override count.
6. **Storybook verification** — light + dark screenshots, any findings.
7. **Registration** — the `figma/brands.json` diff.

## Scripts

- `scripts/scaffold-brand.mjs <brand>` — copy base → new brand folder pair.
- `scripts/validate-brand.mjs <brand.json>` — runs the kit's brand validator
  (`@techsio/ui-kit/theme/brand-validator`) on runtime brand data.

## Reference

- Canonical brand to mirror: `business` (diff `figma/business/variables.css` against
  `figma/light/variables.css` for the exact editable surface).
- Merge + runtime: `merge-figma-themes.mjs`, `figma/brands.json`,
  `theme-config.ts`, `brand-validator.ts`, `theme-provider.tsx`.
- Sibling skill (the other direction): `figma-token-binding`.
