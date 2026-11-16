---
name: app-token-overrides
description: >
  Use when changing app-specific @techsio/ui-kit visuals through semantic,
  typography, spacing, layout, radius, or component CSS token overrides while
  avoiding redundant token chains, duplicated JSX className styling, and
  permanent local API-gap workarounds.
metadata:
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - tailwind-token-authoring
sources:
  - "libs/ui/skills/_artifacts/consumer_app_usage_rules.md"
  - "libs/ui/src/tokens/_semantic.css"
  - "libs/ui/src/tokens/components/atoms/_button.css"
  - "libs/ui/src/tokens/components/molecules/_dialog.css"
  - "libs/ui/src/tokens/components/components.css"
  - "https://github.com/TechsioCZ/new-engine/issues/72"
---

# @techsio/ui-kit App Token Overrides

Use this in app code when a UI-kit component visual does not match app design.

## Setup

Work down the token chain:

```text
1. Does the existing libs/ui token chain already produce the desired value?
2. Can an app semantic/typography/spacing/layout token solve it globally?
3. After semantic tokens are correct, does this one component still need to
   reference a different token/value than the default chain?
4. If no token/prop can express it, record a UI-kit API gap.
```

## Core Patterns

### Override the shipped semantic source

Import your stylesheet **after** the kit stylesheet. The Figma-backed primary
surface source is `--color-bg-primary-base`, not the legacy `--color-primary`.
Use an unlayered selector so it wins over generated brand selectors:

```css
:root, [data-theme] {
  --color-bg-primary-base: oklch(0.55 0.2 330);
  --color-bg-primary-hover: oklch(0.47 0.2 330);
  --color-bg-primary-active: oklch(0.42 0.2 330);
  --color-fg-on-primary-solid: white;
  --color-fg-on-primary-solid-neo: white;
}
```

Button, selected controls and other primary surfaces inherit these aliases.
Set **both** foreground sources: Button's `--color-button-fg-primary` reads
`--color-fg-on-primary-solid-neo` (in every brand, not just Neo); other primary
surfaces still read `--color-fg-on-primary-solid`. These are independent tokens,
so setting only one does not recolor every primary foreground. The white text
above meets 4.5:1 against all three pink surfaces; choose and measure a suitable
foreground whenever changing those surfaces. Pure magenta (`#ff00ff`), for
example, requires dark text, not white, to meet 4.5:1.

The legacy `--color-primary` affects older consumers only; it does **not**
recolor Figma-backed buttons. Do not create circular aliases between it and
`--color-bg-primary-base`.

When using nested scheme scopes, include `.light`, `.dark`, `.always-light`,
`.always-dark` and `.reverse` in your app override selector too. These scopes
intentionally re-resolve the default alias graph; repeat your app semantic
sources there if they should replace those defaults.

### Use component overrides only for exceptions

For one exceptional primary Button, use `--color-button-bg-primary-base`
(and its `-hover`/`-active` siblings), not the obsolete
`--color-button-bg-primary`. Keep text, border and focus contrast accessible.

### Keep className for layout composition

```tsx
<div className="grid gap-200 md:grid-cols-2">
  <Button>Save</Button>
</div>
```

Layout around components is fine. Component appearance belongs in tokens.

## Common Mistakes

### HIGH Legacy semantic alias mistaken for the current source

Overriding `--color-primary` alone will not recolor modern primary Buttons.
Override `--color-bg-primary-base` and its hover/active siblings instead, as
shown above. Verify the computed Button background in every supported mode.

### HIGH JSX className appearance fix

Wrong:

```tsx
<Button className="bg-surface text-fg-primary rounded-full" />
```

Correct:

```css
:root, [data-theme] {
  --color-button-bg-primary-base: var(--color-cta);
  --color-button-fg-primary: var(--color-fg-primary);
  --radius-button-md: var(--radius-full);
}
```

Use a component override only when Button really should diverge from semantic
primary/default mappings. Otherwise fix the semantic token.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

### HIGH Font weight token bypassed

Wrong:

```tsx
<Button className="font-bold" />
```

Correct:

```css
@theme static {
  --font-weight-button: 700;
}
```

`--font-weight-*` tokens map to `font-*` classes in TSX.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

### MEDIUM Container token misapplied

Wrong:

```css
@theme static {
  --spacing-card-gap: var(--container-xl);
}
```

Correct:

```tsx
<section className="max-w-xl">
  <ProductCard />
</section>
```

`--container-*` tokens are for width and max-width utilities, not spacing.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

### MEDIUM Permanent API gap workaround

Wrong:

```tsx
<Button className="px-200 py-unknown-token" />
```

Correct:

```text
Use existing size/theme/variant props or app token overrides. If none can
express the design, record a Button API/token gap for libs/ui.
```

Do not normalize one-off class hacks into app code.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

## Validation Commands

```sh
rg -n 'className=.*(bg-|text-|font-|px-|py-|rounded-)' apps/<app>
rg -n -- '--color-|--spacing-|--font-weight-|--container-' apps/<app>/src
bunx biome check --write apps/<app>/src
```
