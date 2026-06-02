---
name: app-token-initialization
description: >
  Use when adopting @techsio/ui-kit in a new or existing apps/* project and
  setting up app semantic, typography, spacing, layout, radius, state, and
  minimal component token override files after a focused design-token interview.
type: lifecycle
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - tailwind-token-authoring
sources:
  - "libs/ui/skills/_artifacts/consumer_app_usage_rules.md"
  - "libs/ui/src/tokens/index.css"
  - "libs/ui/src/tokens/_semantic.css"
  - "libs/ui/src/tokens/_layout.css"
  - "libs/ui/src/tokens/_spacing.css"
  - "libs/ui/src/tokens/components/components.css"
  - "https://github.com/TechsioCZ/new-engine/issues/72"
---

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

```css
@import "@techsio/ui-kit/tokens";

@theme static {
  --color-primary: var(--brand-primary);
  --color-secondary: var(--brand-secondary);
  --container-xl: 1200px;
}
```

## Core Patterns

### Initialize broad layers before component overrides

```css
@theme static {
  --color-primary: var(--brand-green);
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
@theme static {
  --color-button-bg-primary: var(--color-primary);
}
```

Do not copy every UI-kit component token into the app.

## Common Mistakes

### HIGH Component overrides before semantic layer

Wrong:

```css
@theme static {
  --color-button-bg-primary: #009869;
  --color-input-border: #009869;
  --color-badge-bg-success: #009869;
}
```

Correct:

```css
@theme static {
  --color-primary: var(--brand-green);
}
```

Start with semantic tokens, so components inherit consistently.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

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
@theme static {
  --color-button-bg-primary: var(--color-primary);
  --radius-button-md: var(--radius-full);
  --padding-button-md: var(--spacing-100) var(--spacing-250);
}
```

Figma output is input for token mapping, not the final app theme layer.

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

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

Source: libs/ui/skills/_artifacts/consumer_app_usage_rules.md

## Validation Commands

```sh
pnpm --dir libs/ui validate:tokens
bunx biome check --write apps/<app>/src/tokens
```

For app work, also inspect JSX for token-first usage with `app-ui-kit-audit`.
