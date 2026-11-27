---
name: scroll-region-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit ScrollRegion for
  a named, keyboard-scrollable viewport for content wider or taller than its column.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  resources: "references/ux.md ../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  sources: ""
  contributor_sources: "libs/ui/src/atoms/scroll-region.tsx libs/ui/src/tokens/components/atoms/_scroll-region.css libs/ui/stories/atoms/scroll-region.stories.tsx"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit ScrollRegion Usage

Use ScrollRegion around content that can overflow its column, such as a static table or a document preview.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `ScrollRegion`.

**Use it when**

- A wide static Table on a narrow screen.
- A long preview inside a fixed-height area.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A DataTable | DataTable; it has its own scroll region |
| A dialog body | Dialog; its body already scrolls |

**Do**

- Name the region after its content (`Monthly revenue by region`).

**Don't**

- Nest scroll regions.
- Use it for the whole page.

**Copy and states**

- `label` names the content, not the mechanism ("Revenue table", not "Scroll area").

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Atoms/ScrollRegion → UX guidelines*.

## Setup

```tsx
import { ScrollRegion } from "@techsio/ui-kit/atoms/scroll-region"

<ScrollRegion label="Monthly revenue by region">
  <Table>…</Table>
</ScrollRegion>
```

Props (from `src/atoms/scroll-region.tsx`):

```text
label: string
orientation?: "horizontal" | "vertical" | "both"
busy?: boolean
...HTMLAttributes<HTMLElement>, ref
```

Words the component shows itself come from the `UiMessagesProvider` catalog;
pass `csUiMessages` (`@techsio/ui-kit/messages/ui-messages-cs`) for Czech.

## Common Mistakes

### HIGH Unreachable overflow

Wrong:

```tsx
<div className="overflow-x-auto"><Table>…</Table></div>
```

Correct:

```tsx
<ScrollRegion label="Revenue table"><Table>…</Table></ScrollRegion>
```

Source: libs/ui/src/atoms/scroll-region.tsx
