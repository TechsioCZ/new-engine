---
name: component-consistency-validation
description: >
  Use after changing @techsio/ui-kit component TSX, token CSS, Storybook
  stories, Figma Code Connect files, package exports, or validation scripts.
  Checks prop/variant/token/story/Figma consistency and recommends focused
  commands before maintainer handoff.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
sources:
  - "libs/ui/package.json"
  - "libs/ui/project.json"
  - "libs/ui/.storybook/main.ts"
  - "libs/ui/scripts/validate-token-usage.js"
  - "libs/ui/scripts/validate-token-definitions.js"
  - "libs/ui/scripts/run-component-tests.mjs"
  - "libs/ui/figma.config.json"
  - "libs/ui/skills/_artifacts/domain_map.yaml"
---

# @techsio/ui-kit Component Consistency Validation

Use this as the validation pass after changing a component slice.

## Setup

Pick checks by touched area:

```text
TSX only      -> Biome + build
Token CSS     -> token validators + build
Stories       -> Biome + Storybook build when visual/docs behavior changed
Zag/compound  -> build + Storybook/a11y or component tests when practical
Figma mapping -> figma connect parse
Release       -> ui-kit-publish-readiness
```

## Core Patterns

### Compare TSX props to stories

```text
src/atoms/button.tsx:
  variant: primary | secondary | tertiary | danger | warning
  theme: solid | light | borderless | outlined | unstyled
  size: sm | md | lg | current

stories/atoms/button.stories.tsx:
  argTypes.variant.options must match real variants
  argTypes.theme.options must match real themes
  argTypes.size.options must match real sizes
```

Stories must not document variants or props that the component cannot accept.

### Compare classes to token CSS

```text
TSX class: bg-button-bg-primary
CSS token: --color-button-bg-primary

TSX class: p-button-md
CSS token: --padding-button-md
```

Use the validators for missing token classes and unused token definitions.

### Check package exports by subpath

```tsx
import { Button } from "@techsio/ui-kit/atoms/button"
import { Carousel } from "@techsio/ui-kit/molecules/carousel"
```

The package exports wildcard subpaths for atoms, molecules, organisms,
templates, tokens, and utils. Do not expect a root barrel export.

### Check Code Connect when public props change

```sh
pnpm --dir libs/ui figma:connect:parse
```

Use `figma-sync-handoff` for follow-up ownership. Do not publish or edit Figma
unless the maintainer asks.

## Common Mistakes

### HIGH Variant drift between code and docs

Wrong:

```tsx
argTypes: {
  variant: { options: ["primary", "ghost"] },
}
```

Correct:

```tsx
argTypes: {
  variant: { options: ["primary", "secondary", "tertiary", "warning", "danger"] },
}
```

Storybook controls are copied by app developers, so undocumented or
nonexistent options become app bugs.

Source: libs/ui/src/atoms/button.tsx and libs/ui/stories/atoms/button.stories.tsx

### HIGH Token validation ignored

Wrong:

```text
Add className "z-(--z-index)" and skip token validation.
```

Correct:

```sh
pnpm --dir libs/ui validate:tokens
```

The token usage validator maps Tailwind utility namespaces to required CSS
custom properties.

Source: libs/ui/scripts/validate-token-usage.js

### HIGH Compound context hole

Wrong:

```tsx
<Carousel.Next />
```

Correct:

```tsx
<Carousel.Root slideCount={3}>
  <Carousel.Next />
</Carousel.Root>
```

Compound children rely on context guards such as
`Carousel components must be used within Carousel.Root`.

Source: libs/ui/src/molecules/carousel.tsx

## Validation Commands

```sh
bunx biome check --write libs/ui/src/atoms/button.tsx libs/ui/stories/atoms/button.stories.tsx
pnpm --dir libs/ui validate:tokens
bunx nx run ui:build
pnpm --dir libs/ui figma:connect:parse
pnpm --dir libs/ui build:storybook
pnpm --dir libs/ui storybook:a11y
pnpm --dir libs/ui test:components
```

Run only commands relevant to the changed area unless the maintainer asks for
a full readiness pass.

