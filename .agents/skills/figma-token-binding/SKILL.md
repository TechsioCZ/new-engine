---
name: figma-token-binding
description: Migrate a UI component to consume Figma-exported design tokens directly, replacing the codebase's derivation-based token chain. Use when binding a single component (button, input, dialog, …) to its Figma token export, keeping the rest of the system stable.
---

# figma-token-binding

End-to-end procedure for migrating **one component** at a time from the
derivation-based token system (`light-dark()` + `oklch(from … calc(l ± …))`)
to **literal Figma-export values** scoped via `.dark` class cascade.

Designed to be run repeatedly — once per component — until the whole library
is on Figma values and the OKLCH derivations can be deleted.

The Button migration in `libs/ui/src/atoms/button.tsx` is the canonical
reference implementation; mirror its layout when migrating other components.

## Prime directive

**Load Figma tokens and do not break the visual design from the previous
static version.** Every migration MUST be visually verified against the
pre-migration build. Any pixel that changes must be either:

1. An intentional alignment with Figma (designer's intent now reflected),
   reported to the user and approved before merging, OR
2. A bug — diagnose root cause with the user, not by reverting the
   migration.

The agent does not silently accept differences. Differences are surfaced,
explained, and decided by the user.

## What this migration actually does

| Before | After |
|---|---|
| Component token values computed from a handful of seed colors via `light-dark()` and OKLCH math | Component token values are literal `oklch(…)` per mode, exported from Figma |
| Single set of tokens; dark mode flips by changing `--state-*` deltas | Two sets of tokens: light defaults + `.dark` overrides |
| App-level brand overrides via reference-layer tokens (`--color-button-primary`) | App-level brand overrides will need to target flat names (`--color-button-bg-primary-base`) once bridges are removed |
| Token names: `--color-{component}-{slot}-{role}` | Token names: `--color-{component}-{slot}-{role}-{state}` (Figma's `-base` for default state, etc.) |

## Prerequisites

- Full Figma exports present at
  `libs/ui/src/tokens/figma/{light,dark}/variables.css`.
  These are the canonical source. Do not edit them; re-export from Figma when
  values change.
- Component-level CSS file at `libs/ui/src/tokens/components/{atoms,molecules,…}/_{name}.css`.
- Component implementation at `libs/ui/src/{atoms,molecules,…}/{name}.tsx`.
- Storybook running (`bunx nx run ui:storybook`) for visual verification.

## Workflow

### 1. Inventory the component's token surface

From the component `.tsx`, list every Tailwind utility that resolves to a
component-prefixed CSS variable. For Button:

```
bg-button-bg-{role}          → --color-button-bg-{role}
text-button-fg-{role}        → --color-button-fg-{role}
border-button-border-{role}  → --color-button-border-{role}
gap-button-{size}            → --spacing-button-{size}
p-button-{size}              → --padding-button-{size}
text-button-{size}           → --text-button-{size}
rounded-button-{size}        → --radius-button-{size}
border-(length:--…)          → arbitrary-value border-width vars
outline-button-ring          → --color-button-ring
```

Note any tokens from sibling component files (`_form-control.css` etc.) the
component reads — these stay untouched in this migration.

### 2. Split the Figma export into component fragments

Run the splitter to extract just this component's vars from the full export:

```sh
node .agents/skills/figma-token-binding/scripts/split-figma-tokens.mjs <component>
```

Output:

```
libs/ui/src/tokens/figma/light/<component>.css
libs/ui/src/tokens/figma/dark/<component>.css
```

The light file wraps declarations in `@theme static { … }`. The dark file
wraps in `:is(.dark, .always-dark) { … }`. Sizing tokens (identical in both
modes) appear only in the light file.

The splitter filters by the `--*-<component>-*` segment, excluding
composite components like `product-card-button-*` that contain the name but
are scoped to another atom.

### 3. Reconcile naming differences

Figma uses different conventions than the legacy live system. Compare and
list every name that differs. Common patterns from Button:

| Live (old) | Figma (new) | How to handle |
|---|---|---|
| `--color-button-bg-primary` | `--color-button-bg-primary-base` | Rename in component `.tsx` (utility class gains `-base`) |
| `--color-button-fg-primary` | `--color-button-fg-primary-base` | Same |
| `--border-button-width-sm` | `--border-width-button-sm` | Rename arbitrary-value reference in `.tsx`; matches the locked standard in `libs/ui/AGENTS.md` |
| `--padding-button-{sm,md,lg}` (shorthand) | `--padding-button-{x,y}-{sm,md,lg}` (split) | Keep `p-button-sm` in JSX; bridge in CSS: `--padding-button-sm: var(--padding-button-y-sm) var(--padding-button-x-sm)` |
| `--color-button-primary` (reference layer, used by downstream) | `--color-button-bg-primary-base` | Add a temporary alias in the component CSS (see step 5) |

### 4. Find downstream consumers of deleted tokens

Before rewriting the component CSS, grep for everything that depends on it:

```sh
grep -rnE "color-button-(primary|secondary|tertiary|warning|danger)[^-]|color-button-fg[^-]" \
  --include="*.css" --include="*.ts" --include="*.tsx"
```

For Button, the consumers we found:

- `libs/ui/src/tokens/components/molecules/_product-card.css` — reads `--color-button-primary`, `--color-button-fg`, etc.
- `apps/n1/src/tokens/_n1-components.css` — **overrides** `--color-button-primary` (brand customization).
- `apps/frontend-demo/src/tokens/_overrides-components.css` — same.
- `apps/frontend-demo/src/tokens/app-components/molecules/_product-card.css` — same as the lib's product-card.

**Read-side compat** is solved by aliases (step 5). **Write-side compat** (app
overrides) is a separate problem — see "App brand overrides" below.

### 5. Replace the component's `_<name>.css`

The new file should be small and contain only:

1. `@import` of both Figma fragments (light + dark).
2. Any bridge tokens (combined shorthand from split tokens).
3. Legacy aliases for downstream consumers, clearly marked deprecated.
4. Component-local utilities (e.g. `token-icon-button-spinner`) that are
   unrelated to Figma tokens.

See `libs/ui/src/tokens/components/atoms/_button.css` for the reference layout.

Delete every `oklch(from … calc(l + var(--state-hover)) c h)` derivation for
this component — Figma already encodes hover/active values literally.

### 6. Update the component `.tsx`

Apply every rename from step 3. For Button this was:

- `bg-button-bg-{role}` → `bg-button-bg-{role}-base`
- `text-button-fg-{role}` → `text-button-fg-{role}-base`
- `text-button-fg-{role}-light` → `text-button-fg-{role}-light-base`
- `text-button-fg-{role}-borderless` → `text-button-fg-{role}-borderless-base`
- `text-button-fg-outlined-{role}` → `text-button-fg-outlined-{role}-base`
- `border-button-border-{role}` → `border-button-border-{role}-base`
- `bg-button-bg-{role}-light` → `bg-button-bg-{role}-light-base`
- `bg-button-bg-borderless` / `-outlined` / `-disabled` → same with `-base`
- `disabled:text-button-fg-disabled` → `disabled:text-button-fg-disabled-base`
- `border-(length:--border-button-width-sm)` → `border-(length:--border-width-button-sm)`

Hover/active/light-hover/light-active utility names already match Figma and
do **not** change.

### 7. Verify

This step is **mandatory** for every component migration. Token diffs that
are technically correct on paper can still cause regressions in the live
build — Tailwind v4's PostCSS pipeline rewrites selectors, cascade layers
interact with overrides, and Figma's per-mode values can differ from the
derivation-based defaults in unexpected places. Always look at the rendered
page, not just the CSS source.

#### 7a. Static checks

1. `bunx biome check --write <changed-files>` — lint and format.
2. `bunx nx run ui-kit:build` (project name `ui-kit`, not `ui`).

#### 7b. Storybook + Chrome DevTools MCP visual diff

Storybook is the source of truth for visual verification. Always run the
**before** and **after** comparison; never assume "the math checks out so
the UI is fine."

1. Start Storybook from the UI library folder if it isn't already running:
   ```sh
   cd libs/ui && npm run storybook
   ```
   Assume a dev server is already running on its current port (do not
   restart unless you confirm it's down). The port is printed at startup;
   recent runs have used `http://localhost:55385/`.

2. Find the component's Variants story. URL pattern:
   ```
   http://localhost:<port>/?path=/story/atoms-<name>--variants
   ```
   For Button: `http://localhost:55385/?path=/story/atoms-button--variants`.

3. Capture **before** and **after** screenshots using Chrome DevTools MCP
   (when available in the session) for each theme:
   - Light (Storybook theme switcher → "light")
   - Dark (Storybook theme switcher → "dark")
   - Reverse (Storybook theme switcher → "reverse")
   - Auto in a system set to dark — verifies the `@media
     (prefers-color-scheme: dark)` fallback path

   Pseudocode (use whichever tool surface is available):
   ```
   navigate to http://localhost:<port>/?path=/story/atoms-button--variants
   for theme in [light, dark, reverse]:
     set Storybook globals.theme = theme
     wait for repaint
     screenshot iframe
   ```

4. Diff before/after pairwise:
   - **Pixel-identical** → migration is a non-event for the user. Report it
     and move on.
   - **Close but not identical** → likely OKLCH→sRGB rounding noise (ΔE < 1
     is invisible). Note as "no visible change."
   - **Visibly different** → STOP. This is a finding. Open a section in
     the report (see step 7d).

5. Sanity-check downstream components that read the legacy aliases — for
   Button that's the product-card stories. They should render identically
   because the alias resolves to the same color.

#### 7c. Fallback: inspect compiled CSS without DevTools MCP

If Chrome DevTools MCP isn't available, you can still confirm the cascade
landed correctly by fetching Storybook's compiled stylesheet directly:

```sh
curl -s http://localhost:<port>/static/css/main.css | \
  grep -nE "color-<component>-.*: #" | head -40
```

Check that:
- Light defaults appear inside `@layer theme { :root { … } }`.
- The class-based override appears at the **top level** as
  `:is(.dark, .always-dark) { … }` (top-level beats layered at equal
  specificity).
- The system-pref override appears as
  `@media (prefers-color-scheme: dark) { :root:not(.light):not(.always-light) { … } }`.
- Vendor-prefixed legacy forms (`:-webkit-any(…)`, `:-moz-any(…)`) may
  also appear — these are harmless side-effects of the PostCSS pipeline
  and do not match in modern browsers.

If the modern `:is(.dark, …)` block is missing, the dark fragment was
emitted with the wrong selector. Re-check the splitter output.

#### 7d. Document every visible difference

For each story where the rendered output changed visibly between before
and after:

```markdown
### Difference: <story-name> — <variant/theme/size/state>

- Before: <description, screenshot link, hex sample>
- After:  <description, screenshot link, hex sample>
- Root cause: <Figma intent | bug>
- Recommendation: <accept | investigate>
```

Present every difference to the user. Do not merge until each one is
either confirmed-intentional or fixed.

### 8. Cleanup (after all components migrate)

Defer until every component in the library has gone through this migration:

- Delete the legacy `--color-{component}-{role}` reference-layer aliases
  from each `_<component>.css`.
- Delete OKLCH `state` knobs from `_semantic.css` that no longer drive any
  component (`--state-hover`, `--state-active`, `--state-light-variant`, …)
  if nothing else uses them.
- Migrate app brand overrides (see below).
- Remove the bridge `--padding-{component}-{size}` shorthands if components
  switch to `px-/py-` utilities.

## App brand overrides

`apps/n1/src/tokens/_n1-components.css` does:

```css
--color-button-primary: oklch(0.4495 0 0);
--color-button-tertiary: #f6f6f6;
```

This was effective under the old architecture because Button read tokens
through `--color-button-primary`. After migration, Button reads
`--color-button-bg-primary-base` directly, so the override **silently no
longer applies**.

Three options to restore app brand customization:

1. **App migrates too** — change `apps/n1/_n1-components.css` to override
   the new flat names (`--color-button-bg-primary-base`,
   `--color-button-bg-primary-hover`, `--color-button-bg-primary-active`,
   `--color-button-border-primary-base`, …). Many more vars, but explicit.
2. **Fallback chain in fragment** — instead of literal Figma values in
   `figma/light/<component>.css`, wrap them as
   `var(--color-button-primary, oklch(…figma…))`. Then a legacy app override
   still wins. Adds complexity, breaks the "pure export" property.
3. **Brand override aliases** — at the app level, declare a single set of
   semantic-brand vars (`--color-brand-primary` etc.) and have **the Figma
   export reference them at the top of the chain**. Cleanest long-term, but
   requires coordinating Figma variables with the codebase.

Pick once for the library; document in the app's tokens README. Until then,
note in PR description which apps lose their brand override.

## Common gotchas

- **`@theme static` must be reachable from the Tailwind entry CSS.** The
  fragments under `tokens/figma/{light,dark}/` are imported transitively
  via `_button.css` ← `components.css` ← `_tokens-base.css` ← `index.css`.
  If you add the fragment but skip the import, Tailwind never sees the
  tokens and the utilities silently produce no styles.
- **Dark override must NOT be inside `@theme static`.** `@theme` is for
  declaring tokens; selectors inside it are ignored. Put `:is(.dark, …)`
  blocks at the top level of the CSS file.
- **Tailwind v4 utility generation is name-based.** A token named
  `--color-button-fg-primary-borderless-base` generates the utility
  `text-button-fg-primary-borderless-base` — long but consistent. Don't try
  to shorten names just for ergonomics.
- **Reading vs writing token names.** When the `.tsx` says
  `border-(length:--<varname>)`, the value inside the parens is **the CSS
  variable name**, not a utility class. It must match the literal token
  name from the fragment file.
- **Hover/active mode flip.** In the old system, `--state-hover` had
  opposite signs in light vs dark — so `oklch(from base calc(l ± .08) c h)`
  darkened in light, lightened in dark. Figma encodes both directions
  explicitly per token. After migration, the `--state-hover` knob no longer
  affects this component — that is intentional.

## Troubleshooting

### Dark text on a dark page when Storybook is in "auto" theme

**Symptom.** With Storybook's theme picker set to **auto**, on a system
that prefers dark mode, the page background turns dark (correct) but
component foregrounds stay at light-mode values (text becomes
unreadable). Switching the picker to "dark" fixes it.

**Cause.** Storybook's `withThemeByClassName` with `defaultTheme: "auto"`
adds **no class** to `<html>` in auto mode. The dark fragment's
`:is(.dark, .always-dark) { … }` selector doesn't match, so component
tokens stay at light values. Meanwhile `tokens/_semantic.css` does
include a `@media (prefers-color-scheme: dark)` block, so page-level
colors flip — producing the dark-on-dark mismatch.

**Fix.** The splitter now emits BOTH selectors for the dark fragment:
```css
:is(.dark, .always-dark) { /* overrides */ }
@media (prefers-color-scheme: dark) {
  :root:not(.light):not(.always-light) { /* same overrides */ }
}
```
This matches the existing convention in `tokens/_semantic.css`. If a
migration was performed before this fix, re-run the splitter for the
affected components and re-lint.

### `:is(…)` rewritten to `:-webkit-any(…)` / `:-moz-any(…)`

**Symptom.** Inspecting the compiled CSS shows the dark block as
`:-webkit-any(.dark, .always-dark) { … }` instead of the modern `:is()`
form.

**Cause.** Tailwind v4's PostCSS pipeline emits both the modern selector
and legacy vendor-prefixed fallbacks. This is by design — both blocks
appear in the compiled output. Modern browsers ignore the legacy forms
and match `:is()`. No action needed.

### Migration changed dark-mode colors compared to before

**This is expected.** The previous derivation system computed dark
hover/active via a symmetric lightness flip (`oklch(from base calc(l +
0.08) c h)`). Figma encodes designer-chosen dark values that are usually
visibly different — typically brighter — than the symmetric flip.

Surface these differences to the user (see step 7d). The user's
direction was "load Figma tokens, don't break design" — meaning Figma
*is* the intended new design. But the user still owns the decision on
each visible difference. The agent presents; the user accepts or asks
to investigate.

### App brand overrides stop working

Apps that override `--color-{component}-{role}` (the legacy reference-
layer token) keep working through the bridge aliases left in the
component CSS. Apps that override `--color-{component}-bg-{role}-base`
(the new flat name) take effect directly. There is no migration step
required for app overrides during this PR — they continue to work
through the alias. The follow-up cleanup task is to migrate app
overrides to the flat names and then delete the bridges.

## Skill output expectations

When you complete a component migration, produce:

1. **Token renames** — table of old → new names.
2. **Downstream files affected** — and whether they need follow-up.
3. **Lint result** — confirmation that biome ran clean.
4. **Build result** — `bunx nx run ui-kit:build` passes.
5. **Visual diff report** — one entry per story showing
   before/after pairs across light, dark, reverse, and (where relevant)
   system-pref-auto. Every visible difference must include:
   - A description of what changed (which token, which state).
   - Root-cause hypothesis (Figma intent vs. bug).
   - A recommendation (accept / investigate).
6. **User decisions captured** — for each visible difference, the
   user's call (accept / fix). If the user asks to investigate, do not
   merge until resolved.
7. **PR description draft** — including the visual diff summary and the
   list of "accepted Figma changes" so reviewers know what to expect.

## Reference files (Button)

- `libs/ui/src/tokens/figma/light/button.css` — light defaults inside `@theme static`.
- `libs/ui/src/tokens/figma/dark/button.css` — dark overrides under `:is(.dark, .always-dark)`.
- `libs/ui/src/tokens/components/atoms/_button.css` — fragment imports + bridge tokens + legacy aliases.
- `libs/ui/src/atoms/button.tsx` — updated utility class names.

## Script: `scripts/split-figma-tokens.mjs`

The splitter reads `tokens/figma/{light,dark}/variables.css` and writes
component fragments. Usage:

```sh
node .agents/figma-token-binding/scripts/split-figma-tokens.mjs <component-name>
node .agents/figma-token-binding/scripts/split-figma-tokens.mjs --list   # list available components
node .agents/figma-token-binding/scripts/split-figma-tokens.mjs --all    # split every component
```

It identifies a token as belonging to component `X` if and only if the
token name contains `-X-` as a discrete segment after the property prefix,
and the segment before `X` is in a known property prefix set
(`color`, `padding`, `spacing`, `text`, `radius`, `border-width`). This
rule keeps `--color-product-card-button-*` from being included in `button`.
