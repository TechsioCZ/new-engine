---
component_version: "1.0.0"
name: chart-usage
description: >
  Use after component-usage-ux when an app needs the @techsio/ui-kit Chart —
  a declarative data-visualization molecule built on TanStack Charts
  (@tanstack/charts + @tanstack/react-charts). One `type` prop covers line,
  area, bar, horizontal bar, scatter, pie and donut charts from the same
  data/x/y/series channels, with token-driven series colors, legend, tooltip,
  value formatting and selection callbacks.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/chart.tsx"
  - "libs/ui/src/tokens/components/molecules/_chart.css"
  - "libs/ui/stories/molecules/chart.stories.tsx"
  - "https://tanstack.com/charts/latest/docs/overview"
---

# @techsio/ui-kit Chart Usage

`Chart` is the data-visualization molecule. It owns a TanStack Charts
definition internally: you hand it rows plus `x`/`y` (and optionally `series`)
channels and pick a `type`; it picks the right marks and scales, wires the
tooltip and legend, and paints every series from the
`--color-chart-series-*` design tokens in fixed order.

## Setup

```tsx
import { Chart } from "@techsio/ui-kit/molecules/chart"

type RevenuePoint = { month: string; revenue: number; channel: string }

<Chart
  type="line"
  data={revenue}
  x="month"
  y="revenue"
  series="channel"
  legendLabel="Channel"
  yLabel="Revenue"
  formatValue={(value) => `${value / 1000}k €`}
  ariaLabel="Monthly revenue by sales channel"
  onSelect={(point) => setSelected(point)}
/>
```

`x`, `y` and `series` accept a field name or an accessor function
(`(datum) => value`). The source row flows unchanged into tooltips and
`onSelect`.

## Choosing a `type`

| `type` | Use for | Notes |
| --- | --- | --- |
| `line` | change over time | `points` adds dots, `smooth` curves the path |
| `area` | magnitude over time | multi-series stacks by default (`stacked={false}` overlaps) |
| `bar` | magnitude per category | multi-series groups by default (`stacked` stacks) |
| `bar-horizontal` | category ranking, long labels | value axis runs along x |
| `scatter` | relationship of two numeric fields | `x` must be numeric |
| `pie` / `donut` | composition of a small whole | `x` = slice label, `y` = slice value |

Never combine two value scales in one chart — render two charts instead.

## Props

- `data`, `x`, `y`, `series` — the channels described above.
- `stacked` — multi-series layout; defaults to stacked areas and grouped bars.
- `smooth` — line/area curve smoothing.
- `points` — dots on each data point; applies to `line` only (ignored by `area`).
- `grid` (default true) — value-axis grid lines.
- `legend`, `legendLabel` — legend defaults to on for multi-series and
  pie/donut; a single series needs no legend (the title names it).
- `xLabel`, `yLabel`, `formatValue` — axis labels and value tick formatting.
- `height` or `aspectRatio` (default 16/9) — fixed or proportional sizing;
  `initialWidth` is the SSR/first-frame fallback.
- `animate` (default true), `tooltip` (default true).
- `ariaLabel` (required), `ariaDescription` — accessibility naming.
- `onSelect(datum | null)` — click/keyboard selection of a mark.

## Tokens

- Series palette: `--color-chart-series-1..6`, assigned to series in fixed
  order, bridged to TanStack's `--ts-chart-*` variables by the `chart-base`
  utility. The six default steps were picked to pass CVD-separation and
  contrast validation on both light and dark surfaces; note that series-1
  resolves through a Figma override of `--color-blue-500`, so re-validate
  against resolved values rather than assuming the literal steps.
- Chrome: axis/tick/legend text and grid derive from `--color-chart-fg` via
  `currentColor`.
- Tooltip surface: `--color-chart-tooltip-bg/-fg/-border`,
  `--radius-chart-tooltip`, `--text-chart-tooltip`, `--padding-chart-tooltip`
  (aliases of the Tooltip atom tokens).
- Brand themes may override `--color-chart-series-*`, but replacement steps
  must re-pass palette validation; do not alias the brand accent directly.

## Rules

- Six series maximum — fold the tail into an "Other" row or split into
  multiple charts. The palette does cycle: a seventh series wraps back onto
  series-1 and becomes indistinguishable from it, legend swatch included.
  Chart logs a dev-mode warning when a dataset crosses six.
- Keep semantic status colors (`--color-success` etc.) out of series slots.
- More than one measure of different scale → separate charts, never dual axes.
- Pie/donut only for few-slice composition; ranking reads better as
  `bar-horizontal`.
