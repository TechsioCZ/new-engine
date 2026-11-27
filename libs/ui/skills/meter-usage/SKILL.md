---
name: meter-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Meter, a
  horizontal ratio bar for dashboards (occupancy, order progress, budget use),
  single-value or stacked from segments.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
resources:
  - "references/ux.md"
sources:
  - "libs/ui/src/atoms/meter.tsx"
  - "libs/ui/src/tokens/components/atoms/_meter.css"
  - "libs/ui/stories/atoms/meter.stories.tsx"
---

# @techsio/ui-kit Meter Usage

Use Meter to show a known share of a known maximum as a bar: how full a
warehouse is, how many orders of a batch shipped, how much of a budget is
spent. It renders `role="meter"` with `aria-valuenow`, `aria-valuemin` and
`aria-valuemax`; the widths come from the values, so an app never writes a
`style` or a width class for it.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Meter`.

**Use it when**

- A dashboard tile or table cell shows a ratio: occupancy, quota, budget, completion.
- Two or more parts of one total sit side by side (spent and committed budget).

**Use something else when**

| Need | Use instead |
| --- | --- |
| Steps of a wizard or workflow | Steps |
| The user picks a value | Slider |
| Waiting for content to load | Skeleton |
| A trend over time | Chart |

**Do**

- Name it: `aria-label`, or `aria-labelledby` pointing at the visible label.
- Print the number (`64 %`, `€6,200 of €10,000`) next to it; the bar alone is not enough.
- Pick `severity` by meaning: `warning`/`danger` only when the value crosses a threshold.

**Don't**

- Pass `style` or width classes; set `value`/`max` or `segments`.
- Use colour as the only signal of a threshold; say it in the text too.

**Figma → code**

| Figma | Code |
| --- | --- |
| no Figma component yet | code is the only source |

Full UX page: [references/ux.md](references/ux.md). The same page renders in Storybook as *Atoms/Meter → UX guidelines*.

## Setup

```tsx
import { Meter } from "@techsio/ui-kit/atoms/meter"

<Meter aria-label="Warehouse occupancy" value={64} />

<Meter
  aria-labelledby="budget-label"
  max={10_000}
  segments={[
    { value: 6200, severity: "primary" },
    { value: 1800, severity: "warning" },
  ]}
/>
```

Props (from `src/atoms/meter.tsx`):

```text
value: number                (or segments, not both)
max?: number                 default 100
severity?: primary | secondary | neutral | info | success | warning | danger   default primary
size?: sm | md               default sm (0.5rem / 0.75rem tall); falls back to UIProvider
segments?: { value: number; severity: MeterSeverity }[]   stacked bar; aria-valuenow = sum
aria-label / aria-labelledby, className, ref, other div attributes (no style)
```

Values below 0 count as 0 and the bar never overflows: a value past `max`
fills the track and reports `aria-valuenow = max`.

## Common Mistakes

### HIGH Hand-built bar with an inline width

Wrong:

```tsx
<div className="h-2 rounded-full bg-fill-surface">
  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
</div>
```

Correct:

```tsx
<Meter aria-label="Occupancy" value={pct} />
```

Source: libs/ui/src/atoms/meter.tsx

### HIGH Unnamed meter

Wrong:

```tsx
<Meter value={64} />
```

Correct:

```tsx
<Meter aria-label="Warehouse occupancy" value={64} />
```

## Validation Commands

```sh
rg -n "style=\\{\\{\\s*width" apps
rg -n "<Meter(?![^>]*aria-label)" -P apps
```
