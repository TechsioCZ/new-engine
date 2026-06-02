---
name: app-token-overrides
description: >
  Use when changing app-specific @techsio/ui-kit visuals through semantic,
  typography, spacing, layout, radius, or component CSS token overrides while
  avoiding redundant token chains, duplicated JSX className styling, and
  permanent local API-gap workarounds.
type: core
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

### Prefer app semantic overrides

```css
@theme static {
  --color-primary: var(--brand-primary);
  --color-danger: var(--brand-danger);
}
```

This lets Button, Badge, Dialog, Toast, and other components inherit the app
scheme.

### Let semantic tokens remove component overrides

```css
@theme static {
  --color-primary: oklch(0.9 0.5 120);
}
```

If Button primary should use the app primary color, stop here. Do not also add
`--color-button-bg-primary: var(--color-primary)` when the UI-kit default chain
already points Button primary to `--color-primary`.

### Use component overrides only for real exceptions

```css
@theme static {
  --color-button-bg-primary: var(--color-cta);
}
```

Do this only when Button primary should intentionally reference a different
token/value than the app's general `--color-primary`.

### Keep className for layout composition

```tsx
<div className="grid gap-200 md:grid-cols-2">
  <Button>Save</Button>
</div>
```

Layout around components is fine. Component appearance belongs in tokens.

## Common Mistakes

### HIGH Redundant component token

Wrong:

```css
@theme static {
  --color-primary: oklch(0.9 0.5 120);
  --color-button-bg-primary: var(--color-primary);
}
```

Correct:

```css
@theme static {
  --color-primary: oklch(0.9 0.5 120);
}
```

Do not override component tokens when the corrected semantic layer already
drives the component to the right value.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

### HIGH Component override used instead of semantic source

Wrong:

```css
@theme static {
  --color-button-bg-primary: oklch(0.9 0.5 120);
  --color-badge-bg-primary: oklch(0.9 0.5 120);
  --color-link-fg-primary: oklch(0.9 0.5 120);
}
```

Correct:

```css
@theme static {
  --color-primary: oklch(0.9 0.5 120);
}
```

If multiple components should follow the same app primary color, set the
semantic source once instead of duplicating component overrides.

Source: https://github.com/TechsioCZ/new-engine/issues/72

### HIGH JSX className appearance fix

Wrong:

```tsx
<Button className="bg-surface text-fg-primary rounded-full" />
```

Correct:

```css
@theme static {
  --color-button-bg-primary: var(--color-cta);
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
