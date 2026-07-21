---
name: figma-sync-handoff
description: >
  Use when @techsio/ui-kit component work should flag a Figma library or Figma
  Code Connect follow-up. Prepares a reminder and points to the
  component-to-figma skill; never edits Figma or runs Figma MCP tools
  automatically.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
sources:
  - "libs/ui/AGENTS.md"
  - "libs/ui/figma.config.json"
  - "libs/ui/src/atoms/figma/button.figma.tsx"
  - "libs/ui/src/molecules/figma/dialog.figma.tsx"
  - ".agents/skills/component-to-figma/SKILL.md"
---

# @techsio/ui-kit Figma Sync Handoff

Use this after component work changes public visuals, public props, variants,
tokens, or Code Connect mappings.

## Setup

Figma handoff is reminder-only:

```text
Changed public component API or visual behavior
-> mention component-to-figma follow-up
-> do not call Figma tools
-> do not publish Code Connect unless maintainer asks
```

The authoritative workflow is:

```text
.agents/skills/component-to-figma/SKILL.md
```

## Core Patterns

### Check Code Connect coverage

```sh
pnpm --dir libs/ui figma:connect:parse
```

Use parse as a local consistency check when Code Connect files change.

### Keep Figma props aligned with code props

```tsx
figma.connect(Button, "https://www.figma.com/design/...", {
  imports: ['import { Button } from "@techsio/ui-kit/atoms/button"'],
  props: {
    variant: figma.enum("variant", {
      primary: "primary",
      danger: "danger",
    }),
    theme: figma.enum("theme", {
      solid: "solid",
      outlined: "outlined",
    }),
  },
})
```

Public prop additions or renames should trigger a mapping review.

### Preserve token hierarchy in Figma

```text
primitive/core values -> semantic aliases -> component-specific aliases
```

Component-specific Figma variables should alias upper-layer variables when the
code token chain already provides them.

## Common Mistakes

### HIGH Automatic Figma side effect

Wrong:

```text
After editing Button.tsx, call Figma MCP and update the design file.
```

Correct:

```text
Report: "This changes public Button props/visuals. Per figma-sync-handoff,
consider running component-to-figma."
```

Figma credentials, active user, and library context may not be available.

Source: libs/ui/skills/_artifacts/domain_map.yaml

### HIGH Raw Figma component variable

Wrong:

```text
color/button/bg/primary = #009869
```

Correct:

```text
color/button/bg/primary -> alias color/primary
```

Code token architecture is the source of truth for Figma library variables.

Source: libs/ui/AGENTS.md

### MEDIUM Code Connect prop drift

Wrong:

```tsx
// Button adds theme="unstyled"; button.figma.tsx still omits it.
```

Correct:

```tsx
theme: figma.enum("theme", {
  solid: "solid",
  light: "light",
  outlined: "outlined",
  borderless: "borderless",
  unstyled: "unstyled",
})
```

Figma examples should not teach a stale public API.

Source: libs/ui/src/atoms/figma/button.figma.tsx

## Validation Commands

```sh
pnpm --dir libs/ui figma:connect:parse
bunx biome check --write libs/ui/src/atoms/figma/button.figma.tsx
```

Run `figma:connect:publish` only when the maintainer explicitly asks.
