<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Molecules/Chart → UX guidelines. -->

# Chart: UX guidelines

A Chart shows the shape of data: a trend, a comparison or a small composition.
It answers one question at a glance; exact values stay available in its data
table.

## When to use

- A trend over time (`line`, `area`), a comparison between categories (`bar`,
  `bar-horizontal`), a relationship between two numbers (`scatter`), or the
  parts of a small whole (`pie`, `donut`, at most 5 slices).
- Dashboards and reports where the pattern matters more than the exact figure.

## Use something else when

| Need | Use instead |
| --- | --- |
| Exact values the user looks up, copies or edits | `Table` or `DataTable` |
| A single KPI | a stat tile with the formatted number |
| A ranking, or a whole with more than 5 parts | `bar-horizontal`, not pie or donut |
| Two measures on different scales | two charts, never a dual axis |

## Anatomy

- **Plot**: marks, value-axis grid (`grid`), axis labels (`xLabel`, `yLabel`).
- **Legend**: shown for several series and for pie or donut; one series needs
  none (the title names it).
- **Tooltip**: inspection on hover and keyboard focus.
- **Data table**: the always-present `View chart data` disclosure with the same
  values, formatted.
- **Status**: replaces the plot when there's nothing valid to draw.

## Variants and states

There is no Figma component; these are the code options.

| Code | Meaning |
| --- | --- |
| `type="line" \| "area" \| "bar" \| "bar-horizontal" \| "scatter" \| "pie" \| "donut"` | Chosen by the question, not by looks. |
| `series`, `seriesDomain` | One colour per series from `--color-chart-series-1…6`, in fixed order. `seriesDomain` keeps colours stable when data is filtered. |
| `stacked`, `smooth`, `points` | Layout of several series; curve and dots for lines. |
| `height` or `aspectRatio` | Canvas size. Not the sm / md / lg control sizes. |
| empty data | `emptyLabel` status instead of empty axes. |
| invalid pie / donut data | `invalidLabel` status (negative, non-finite or zero-total values). |

There is no loading or error prop: the app shows a `Skeleton` while loading and
its own error message with `Try again` when the request fails.

## Behaviour

**May:** show a tooltip on hover or focus; report a chosen mark through
`onSelect` so the app can filter or open detail.

**Must not:** change data; tell series apart by colour alone; animate for users
who prefer reduced motion (the kit turns `animate` off for them).

- Six series at most. A seventh reuses series-1's colour, so fold the tail into
  `Other` or split the chart.
- Semantic status colours never fill series slots: red is not "the bad series".
- Escape closes the tooltip without moving focus.

## Content and copy

- The title says the metric and the period: `Revenue, last 30 days` — cs:
  `Tržby za posledních 30 dní`.
- Axis labels carry the unit; ticks and tooltips use the app locale through
  `formatValue` and `Intl`
  ([Formatting](../../ux-guidelines/references/formatting.md)).
- Localise `dataTableLabel`, `emptyLabel` and `invalidLabel` — cs:
  `Zobrazit data grafu`, `Pro toto období nejsou žádná data`.

## Accessibility

- `ariaLabel` is required; add `ariaDescription` for the takeaway.
- The kit always renders the data table alternative, keyboard-operable, even
  with `tooltip={false}`.
- Lines use distinct dash patterns that the legend repeats, so series survive
  greyscale and colour-vision deficiency.
- Accessor-function channels need `xLabel`, `yLabel` and `legendLabel` so the
  data table has headers.

## Edge cases

- **No data for the period**: the empty status, never blank axes; offer to
  change the period if a filter caused it.
- **Signed values in a pie**: rejected with the invalid status; use a bar chart.
- **Filtering a series out**: pass `seriesDomain` so the remaining series keep
  their colours.

## Related

- [States](../../ux-guidelines/references/states.md): the three empty states.
- [Formatting](../../ux-guidelines/references/formatting.md): numbers, money, dates.
- [Table](../../table-usage/references/ux.md): when exact values matter.
