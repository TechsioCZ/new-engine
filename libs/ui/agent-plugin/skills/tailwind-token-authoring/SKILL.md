---
name: tailwind-token-authoring
description: >
  Use when adding or changing Tailwind v4 tokens in @techsio/ui-kit, including
  @theme static, semantic aliases, two-layer component tokens, component CSS
  imports, Tailwind token utility class mapping, app override compatibility, and
  token validator commands.
metadata:
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  sources: "libs/ui/AGENTS.md libs/ui/token-contribution.md libs/ui/src/tokens/index.css libs/ui/src/tokens/_semantic.css libs/ui/src/tokens/_layout.css libs/ui/src/tokens/_spacing.css libs/ui/src/tokens/components/atoms/_button.css libs/ui/src/tokens/components/components.css libs/ui/scripts/validate-token-usage.js libs/ui/scripts/validate-token-definitions.js https://github.com/TechsioCZ/new-engine/issues/72 https://github.com/TechsioCZ/new-engine/issues/329"
---

# @techsio/ui-kit Tailwind Token Authoring

Use this for `libs/ui/src/tokens/**/*.css` and component token classes used from
`tv()`.

## Setup

Component token files use Tailwind v4 `@theme static` and two layers:

```css
@theme static {
  /* Reference layer */
  --color-alert-danger: var(--color-danger);

  /* Derived layer */
  --color-alert-bg-danger: var(--color-alert-danger);
  --color-alert-fg-danger: var(--color-fg-light);

  --padding-alert-md: var(--spacing-200);
  --radius-alert-md: var(--radius-md);
  --border-width-alert-md: var(--border-width-md);
}
```

Then import the component file from `src/tokens/components/components.css`.

## Core Patterns

### Map token namespace to Tailwind class

```tsx
const alert = tv({
  base: "rounded-alert-md bg-alert-bg-danger text-alert-fg-danger p-alert-md",
})
```

`--color-*` maps to `bg-*`, `text-*`, `border-*`, and related color utilities.
`--padding-*` maps to `p-*`. `--font-weight-*` maps to `font-*`.

### Keep component tokens app-overridable

```css
@theme static {
  --color-button-primary: var(--color-bg-primary-base);
  --color-button-bg-primary-base: var(--color-button-primary);
}
```

Use an unlayered override after the kit stylesheet at `:root`, `[data-theme]` and each nested scheme boundary (see [App Token Overrides](../app-token-overrides/SKILL.md)). Apps can change `--color-bg-primary-base` (with hover/active and paired foregrounds) globally or override
`--color-button-bg-primary-base` only when the component needs a specific exception.

### Use component utilities for focus

```tsx
const input = tv({
  base: "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-input-ring focus-visible:outline-offset-(length:--default-ring-offset)",
})
```

Use the supported style/width/offset custom-property pattern with the component ring color. Do not invent `outline-input-focus-style` or `outline-input-focus-ring`: neither emits CSS.

### Preserve token entrypoints

```css
@import "@techsio/ui-kit/tokens";
@import "@techsio/ui-kit/tokens-with-tailwind";
```

Use package token exports instead of deep-importing `src/tokens` from apps.

## Common Mistakes

### HIGH Raw component token value

Wrong:

```css
@theme static {
  --color-button-bg-primary-base: #009869;
}
```

Correct:

```css
@theme static {
  --color-button-primary: var(--color-bg-primary-base);
  --color-button-bg-primary-base: var(--color-button-primary);
}
```

Raw component values break the primitive to semantic to component token chain.

Source: libs/ui/AGENTS.md

### HIGH Abbreviated or unsuffixed token

Wrong:

```css
@theme static {
  --color-btn-primary: var(--color-bg-primary-base);
}
```

Correct:

```css
@theme static {
  --color-button-primary: var(--color-bg-primary-base);
  --color-button-bg-primary-base: var(--color-button-primary);
}
```

[AGENTS.md naming rules](../../AGENTS.md#naming-rules) are authoritative. Reference aliases may omit roles; derived color tokens must use `-bg`, `-fg`, or `-border`; component names are
not abbreviated.

Source: libs/ui/AGENTS.md

### HIGH Missing Tailwind token class

Wrong:

```tsx
const panel = tv({ base: "z-(--z-index)" })
```

Correct:

```tsx
const panel = tv({ base: "z-popover" })
```

Every custom token utility used in TSX must have a matching theme token or be a
recognized standard utility.

Source: libs/ui/scripts/validate-token-usage.js

### MEDIUM Legacy border token shape

Wrong:

```css
@theme static {
  --border-button-width-md: var(--border-width-md);
}
```

Correct:

```css
@theme static {
  --border-width-button-md: var(--border-width-md);
}
```

New work follows `--border-width-<component>`. Existing old shapes are legacy
unless a migration is explicitly in scope.

Source: libs/ui/AGENTS.md

### MEDIUM Unsupported focus utility names

Wrong:

```tsx
const trigger = tv({
  base: "focus-visible:outline-combobox-focus-style",
})
```

Correct:

```tsx
const trigger = tv({
  base: "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-combobox-ring focus-visible:outline-offset-(length:--default-ring-offset)",
})
```

Focus geometry uses the shared custom-property style/width/offset bridge;
color uses a registered component ring token. A plausible utility name is not
proof that Tailwind emits it.

Source: https://github.com/TechsioCZ/new-engine/issues/329

## Validation Commands

```sh
pnpm --dir libs/ui validate:token-usage
pnpm --dir libs/ui validate:token-definitions
pnpm --dir libs/ui validate:tokens
bunx biome check --write libs/ui/src/tokens/components/atoms/_button.css
```

