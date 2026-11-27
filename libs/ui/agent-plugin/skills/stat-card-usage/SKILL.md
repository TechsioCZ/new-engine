---
name: stat-card-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit StatCard for
  KPI tiles (label, dominant value, trend badge, hint, follow-up link) and the responsive StatRow grid.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  resources: "references/ux.md ../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  sources: ""
  contributor_sources: "libs/ui/src/molecules/stat-card.tsx libs/ui/src/tokens/components/molecules/_stat-card.css libs/ui/stories/molecules/stat-card.stories.tsx"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit StatCard Usage

Use StatCard for one key number and StatRow to lay out several. The tile is tinted, never outlined.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `StatCard`.

**Use it when**

- A dashboard or list page summary: totals, counts, averages.
- A number with its change against the previous period.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A trend over time | Chart |
| A single status | Badge |
| A label and value list | DetailList |

**Do**

- Pass values already formatted (`Intl.NumberFormat`).
- Use `trend` to colour the delta: up is good, down is bad.
- Keep four tiles or fewer per row.

**Don't**

- Put charts or long text in a tile.
- Use colour alone for meaning; the delta text carries it.

**Copy and states**

- Label: a short noun (`Revenue`); delta with its sign (`+12.4 %`); hint says the period (`Last 30 days`).

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Molecules/StatCard → UX guidelines*.

## Setup

```tsx
import { StatCard, StatRow } from "@techsio/ui-kit/molecules/stat-card"

<StatRow>
  <StatCard delta="+12.4 %" label="Revenue" trend="up" value="€48,210" />
  <StatCard label="Orders" value="1,204" />
</StatRow>
```

Props (from `src/molecules/stat-card.tsx`):

```text
label: ReactNode
value: ReactNode
delta?: string
trend?: "up" | "down" | "flat"
hint?: ReactNode
icon?: IconType
action?: ReactNode
size?: "sm" | "md"
StatRow: HTMLAttributes<HTMLDivElement>
```

Words the component shows itself come from the `UiMessagesProvider` catalog;
pass `csUiMessages` (`@techsio/ui-kit/messages/ui-messages-cs`) for Czech.

## Common Mistakes

### HIGH Unformatted value

Wrong:

```tsx
<StatCard label="Revenue" value={String(48210.5)} />
```

Correct:

```tsx
<StatCard label="Revenue" value={currency.format(48210.5)} />
```

Source: libs/ui/src/molecules/stat-card.tsx
