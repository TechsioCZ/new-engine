---
name: app-token-initialization
description: >
  Use when adopting @techsio/ui-kit in a new or existing apps/* project and
  setting up app semantic, typography, spacing, layout, radius, state, and
  minimal component token override files after a focused design-token interview.
metadata:
  type: "lifecycle"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "tailwind-token-authoring"
  sources: "../../references/consumer_app_usage_rules.md https://github.com/TechsioCZ/new-engine/issues/72"
  contributor_sources: "libs/ui/src/tokens/index.css libs/ui/src/tokens/_semantic.css libs/ui/src/tokens/_layout.css libs/ui/src/tokens/_spacing.css libs/ui/src/tokens/components/components.css"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit App Token Initialization

Use this in `apps/*`, not for changing `libs/ui` defaults.

## Setup

Start by asking whether values need to change at all.

```text
For this app, which UI-kit defaults should remain?
Which values are different: semantic colors, typography, spacing step,
layout containers, radius, shadows, feedback states, component-specific tokens?
```

Then create the smallest app token layer that expresses those differences.
Process CSS with Tailwind v4's PostCSS plugin. If the app does not already import
Tailwind, use only `@techsio/ui-kit/tokens-with-tailwind` instead of the two
imports below. Both public CSS entries register shipped package JavaScript via
package-relative `@source`; no app-side copying of component classes is needed.
Select built-in brands with data-theme (base has no attribute) and .light/.dark.
Akros and Business are light-only; start fixed Akros with
`<html class="light" data-theme="akros">`. AppThemeProvider defaults do not
force a brand over persisted preferences. Import app-owned overrides after kit
CSS with a matching theme selector or descendant scope; do not edit generated
Figma mappings or invent library brands folders.
Read [App Token Overrides](../app-token-overrides/SKILL.md) for the active token chain and scope rules.
`--color-primary` and `--color-button-bg-primary` are legacy aliases, not the shipped Button surface sources.
Set base, hover, active and both on-solid foreground roles together, and measure contrast.

```css
@import "tailwindcss";
@import "@techsio/ui-kit/tokens";

:root, [data-theme], .light, .dark, .always-light, .always-dark, .reverse {
  --color-bg-primary-base: var(--brand-primary);
  --color-bg-primary-hover: var(--brand-primary-hover);
  --color-bg-primary-active: var(--brand-primary-active);
  --color-fg-on-primary-solid: var(--brand-on-primary);
  --color-fg-on-primary-solid-neo: var(--brand-on-primary);
  --color-bg-secondary-base: var(--brand-secondary);
  --container-xl: 1200px;
}
```

## Core Patterns

### Initialize broad layers before component overrides

```css
:root, [data-theme], .light, .dark, .always-light, .always-dark, .reverse {
  --color-bg-primary-base: var(--brand-green);
  --text-md: 1rem;
  --spacing-100: 0.5rem;
}
```

Only add `_app-button.css` when the broad layer cannot express the component.

### Derive semantic roles from compact inputs

```text
Input: "main brand is green, danger is red, spacing steps by 2px"
Output: map primary/danger/state/spacing tokens, then inherit the rest.
```

Do not ask the maintainer to manually define every component token.

### Keep component override files sparse

```css
:root, [data-theme], .light, .dark, .always-light, .always-dark, .reverse {
  --color-button-bg-primary-base: var(--color-bg-primary-base);
}
```

Do not copy every UI-kit component token into the app.

## Common Mistakes

### HIGH Component overrides before semantic layer

Wrong:

```css
:root, [data-theme], .light, .dark, .always-light, .always-dark, .reverse {
  --color-button-bg-primary-base: #009869;
  --color-input-border: #009869;
  --color-badge-bg-success: #009869;
}
```

Correct:

```css
:root, [data-theme], .light, .dark, .always-light, .always-dark, .reverse {
  --color-bg-primary-base: var(--brand-green);
}
```

Start with semantic tokens, so components inherit consistently.

Source: ../../references/consumer_app_usage_rules.md

### HIGH Raw Figma CSS as final theme

Wrong:

```css
.button {
  background: #009869;
  border-radius: 999px;
  padding: 8px 20px;
}
```

Correct:

```css
:root, [data-theme], .light, .dark, .always-light, .always-dark, .reverse {
  --color-button-bg-primary-base: var(--color-bg-primary-base);
  --radius-button-md: var(--radius-full);
  --padding-button-md: var(--spacing-100) var(--spacing-250);
}
```

Figma output is input for token mapping, not the final app theme layer.

Source: ../../references/consumer_app_usage_rules.md

### MEDIUM Guessing theme without interview

Wrong:

```text
Infer all semantic colors and spacing from a screenshot.
```

Correct:

```text
Ask what changes and where; accept compact answers such as main colors or a
spacing rule, then propose the semantic mapping.
```

The app token setup should avoid unnecessary overrides.

Source: ../../references/consumer_app_usage_rules.md

## Validation Commands

```sh
pnpm --dir libs/ui validate:tokens
bunx biome check --write apps/<app>/src/tokens
```

For app work, also inspect JSX for token-first usage with `app-ui-kit-audit`.
