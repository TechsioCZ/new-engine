/**
 * Chart — @techsio/ui-kit molecule.
 *
 * @component Chart
 * @componentVersion v1.0.0
 * @skill chart-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the chart-usage skill's component_version and a changelog entry. Bump all three together.
 *
 * Declarative charting built on TanStack Charts (`@tanstack/charts` +
 * `@tanstack/react-charts`). One `type` prop switches between the popular
 * chart forms — line, area, bar, horizontal bar, scatter, pie and donut —
 * from the same `data`/`x`/`y`/`series` channels. Series colors flow from
 * the `--color-chart-series-*` design tokens (bridged onto TanStack's
 * `--ts-chart-*` palette variables by the `chart-base` utility), axis and
 * grid chrome inherit `--color-chart-fg` via `currentColor`, and the native
 * tooltip surface is styled by the `chart-tooltip` utility.
 */
import {
  areaY,
  barX,
  barY,
  type ChartDefinition,
  type ChartPoint,
  colorLegend,
  d3Curve,
  defineChart,
  dot,
  group,
  lineY,
  stack,
} from "@tanstack/charts"
import { polar, radialArc } from "@tanstack/charts/polar"
import { tooltip as chartTooltip } from "@tanstack/charts/tooltip"
import { scaleBand } from "@tanstack/charts-scales/band"
import { scaleLinear } from "@tanstack/charts-scales/linear"
import { scalePoint } from "@tanstack/charts-scales/point"
import { Chart as TanstackChart } from "@tanstack/react-charts"
import { curveMonotoneX, type PieArcDatum, pie } from "d3-shape"
import { useMemo } from "react"
import { tv } from "../utils"

export type { ChartPoint } from "@tanstack/charts"

/** The supported chart forms; each maps to one TanStack Charts mark family. */
export type ChartType =
  | "line"
  | "area"
  | "bar"
  | "bar-horizontal"
  | "scatter"
  | "pie"
  | "donut"

/** A channel: either a field name on the datum or an accessor function. */
export type ChartAccessor<TDatum, TValue> =
  | (keyof TDatum & string)
  | ((datum: TDatum) => TValue)

export type ChartProps<TDatum> = {
  /** Which chart form to render. Defaults to "line". */
  type?: ChartType
  /** Source rows. Each row flows through unchanged into tooltips and onSelect. */
  data: readonly TDatum[]
  /** Category / x-position channel. For pie and donut this is the slice label. */
  x: ChartAccessor<TDatum, string | number | Date>
  /** Numeric value channel. For pie and donut this is the slice value. */
  y: ChartAccessor<TDatum, number>
  /**
   * Optional series identity. Splits the data into one colored series per
   * distinct value, assigned the `--color-chart-series-*` tokens in fixed
   * order. Without it the chart renders a single series in series-1.
   */
  series?: ChartAccessor<TDatum, string | number>
  /**
   * Multi-series layout: stacked (true) or side-by-side/overlapping (false).
   * Defaults to true for "area" and false for "bar"/"bar-horizontal".
   */
  stacked?: boolean
  /** Draw a dot on every data point of a line chart. */
  points?: boolean
  /** Smooth line/area paths with a monotone curve instead of straight segments. */
  smooth?: boolean
  /** Grid lines on the value axis. Defaults to true. */
  grid?: boolean
  /**
   * Show the categorical color legend. Defaults to true when `series` is set
   * or the chart is a pie/donut, false otherwise.
   */
  legend?: boolean
  /** Optional title above the legend swatches. */
  legendLabel?: string
  /** Axis label for the category/x channel. */
  xLabel?: string
  /** Axis label for the value channel. */
  yLabel?: string
  /** Formats value-axis tick labels (e.g. currency). */
  formatValue?: (value: number) => string
  /** Fixed pixel height. When omitted, `aspectRatio` controls sizing. */
  height?: number
  /** Width/height ratio used when `height` is omitted. Defaults to 16/9. */
  aspectRatio?: number
  /** Deterministic first-frame width for SSR and hidden containers. */
  initialWidth?: number
  /** Animate mark transitions. Defaults to true. */
  animate?: boolean
  /** Show the built-in tooltip on hover/focus. Defaults to true. */
  tooltip?: boolean
  /** Accessible chart name. Required. */
  ariaLabel: string
  /** Longer accessible description. */
  ariaDescription?: string
  className?: string
  /** Fires with the source row of the selected point, or null on deselect. */
  onSelect?: (datum: TDatum | null) => void
}

const chartVariants = tv({
  slots: {
    root: "chart-base block w-full text-chart-fg",
    tooltip: "chart-tooltip",
  },
})

/** Single-series marks paint with series-1 directly so the tooltip does not
 * grow a synthetic group label just to reach the palette. */
const SERIES_1_PAINT = "var(--color-chart-series-1)"

const DONUT_INNER_RADIUS_RATIO = 0.6

function toAccessor<TDatum, TValue>(
  accessor: ChartAccessor<TDatum, TValue>
): (datum: TDatum) => TValue {
  if (typeof accessor === "function") {
    return accessor
  }
  return (datum) => datum[accessor] as TValue
}

/**
 * defineChart's const-generic overloads infer the axis option types from the
 * marks' channel outputs. With an unresolved generic TDatum those conditional
 * types never collapse, so every spec fails overload resolution even though
 * the runtime shape is a plain static chart spec. This loosened alias keeps
 * the mark constructors (lineY, barY, …) fully typed and only relaxes the
 * final spec assembly.
 */
type ChartSpecInput = {
  marks: readonly unknown[]
  x?: unknown
  y?: unknown
  color?: unknown
  animate?: boolean
  tooltip?: unknown
}

const defineChartSpec = defineChart as unknown as <TDatum>(
  spec: ChartSpecInput
) => ChartDefinition<TDatum>

type BuildConfig<TDatum> = {
  type: ChartType
  data: readonly TDatum[]
  x: ChartAccessor<TDatum, string | number | Date>
  y: ChartAccessor<TDatum, number>
  series?: ChartAccessor<TDatum, string | number>
  stacked?: boolean
  points: boolean
  smooth: boolean
  grid: boolean
  legend?: boolean
  legendLabel?: string
  xLabel?: string
  yLabel?: string
  formatValue?: (value: number) => string
  animate: boolean
  showTooltip: boolean
  tooltipClassName: string
}

type ResolvedBuild<TDatum> = {
  data: readonly TDatum[]
  getX: (datum: TDatum) => string | number | Date
  getY: (datum: TDatum) => number
  getSeries?: (datum: TDatum) => string | number
  stacked?: boolean
  points: boolean
  curve?: ReturnType<typeof d3Curve>
  grid: boolean
  xLabel?: string
  yLabel?: string
  valueTicks?: { format: (value: number) => string }
  valueAxis: unknown
  categoryAxis: unknown
  bandAxis: unknown
  shared: {
    color?: unknown
    animate: boolean
    tooltip: unknown
  }
}

function resolveBuild<TDatum>(
  config: BuildConfig<TDatum>
): ResolvedBuild<TDatum> {
  const getX = toAccessor(config.x)
  const isPolar = config.type === "pie" || config.type === "donut"
  const showLegend = config.legend ?? (config.series != null || isPolar)
  const valueTicks = config.formatValue
    ? { format: config.formatValue }
    : undefined

  // Value axis: linear, niced, carrying the grid — chart chrome stays
  // recessive because grid/axis text derive from currentColor
  // (`--color-chart-fg`).
  const valueAxis = {
    scale: scaleLinear,
    nice: true,
    grid: config.grid,
    axis: { label: config.yLabel, ticks: valueTicks },
  }

  // Category axis: point scale for continuous forms, band scale for bars.
  // A numeric first x value opts line/area into a linear axis.
  const firstDatum = config.data.at(0)
  const numericX = firstDatum != null && typeof getX(firstDatum) === "number"
  const categoryAxis = numericX
    ? { scale: scaleLinear, nice: true, axis: { label: config.xLabel } }
    : {
        scale: () => scalePoint<string | number | Date>().padding(0.1),
        axis: { label: config.xLabel },
      }

  return {
    data: config.data,
    getX,
    getY: toAccessor(config.y),
    getSeries: config.series == null ? undefined : toAccessor(config.series),
    stacked: config.stacked,
    points: config.points,
    curve: config.smooth ? d3Curve(curveMonotoneX) : undefined,
    grid: config.grid,
    xLabel: config.xLabel,
    yLabel: config.yLabel,
    valueTicks,
    valueAxis,
    categoryAxis,
    bandAxis: {
      scale: () => scaleBand<string | number | Date>().padding(0.3),
      axis: { label: config.xLabel },
    },
    shared: {
      color: showLegend
        ? { legend: colorLegend({ label: config.legendLabel }) }
        : undefined,
      animate: config.animate,
      tooltip: config.showTooltip
        ? { use: chartTooltip, className: config.tooltipClassName }
        : (false as const),
    },
  }
}

function buildLine<TDatum>(
  build: ResolvedBuild<TDatum>
): ChartDefinition<TDatum> {
  const { data, getX, getY, getSeries } = build
  return defineChartSpec<TDatum>({
    marks: [
      lineY(data, {
        x: getX,
        y: getY,
        z: getSeries,
        color: getSeries,
        points: build.points,
        curve: build.curve,
        stroke: getSeries == null ? SERIES_1_PAINT : undefined,
      }),
    ],
    x: build.categoryAxis,
    y: build.valueAxis,
    ...build.shared,
  })
}

function buildArea<TDatum>(
  build: ResolvedBuild<TDatum>
): ChartDefinition<TDatum> {
  const { data, getX, getY, getSeries } = build
  const isStacked = build.stacked ?? true
  return defineChartSpec<TDatum>({
    marks: [
      areaY(data, {
        x: getX,
        // Without explicit boundaries repeated x positions stack by series;
        // y1:0 opts out into overlapping per-series areas.
        ...(getSeries != null && isStacked ? { y: getY } : { y1: 0, y2: getY }),
        z: getSeries,
        color: getSeries,
        curve: build.curve,
        fill: getSeries == null ? SERIES_1_PAINT : undefined,
        fillOpacity: getSeries != null && isStacked ? 0.85 : 0.25,
        stroke: getSeries == null ? SERIES_1_PAINT : undefined,
        strokeWidth: 2,
      }),
    ],
    x: build.categoryAxis,
    y: build.valueAxis,
    ...build.shared,
  })
}

function barLayout(hasSeries: boolean, isStacked: boolean) {
  if (!hasSeries) {
    return
  }
  return isStacked ? stack() : group({ padding: 0.15 })
}

function buildBars<TDatum>(
  build: ResolvedBuild<TDatum>,
  horizontal: boolean
): ChartDefinition<TDatum> {
  const { data, getX, getY, getSeries } = build
  const isStacked = build.stacked ?? false
  const barOptions = {
    z: getSeries,
    color: getSeries,
    fill: getSeries == null ? SERIES_1_PAINT : undefined,
    layout: barLayout(getSeries != null, isStacked),
    // 4px rounded data ends; stacked segments stay square
    radius: getSeries != null && isStacked ? 0 : 4,
  }
  if (horizontal) {
    return defineChartSpec<TDatum>({
      marks: [barX(data, { x: getY, y: getX, ...barOptions })],
      // The value channel runs along x here, so it carries grid and format.
      x: {
        scale: scaleLinear,
        nice: true,
        grid: build.grid,
        axis: { label: build.yLabel, ticks: build.valueTicks },
      },
      y: build.bandAxis,
      ...build.shared,
    })
  }
  return defineChartSpec<TDatum>({
    marks: [barY(data, { x: getX, y: getY, ...barOptions })],
    x: build.bandAxis,
    y: build.valueAxis,
    ...build.shared,
  })
}

function buildScatter<TDatum>(
  build: ResolvedBuild<TDatum>
): ChartDefinition<TDatum> {
  const { data, getX, getY, getSeries } = build
  return defineChartSpec<TDatum>({
    marks: [
      dot(data, {
        x: getX,
        y: getY,
        z: getSeries,
        color: getSeries,
        // >=8px hit/read target per mark
        r: 4,
        fill: getSeries == null ? SERIES_1_PAINT : undefined,
      }),
    ],
    x: {
      scale: scaleLinear,
      nice: true,
      grid: build.grid,
      axis: { label: build.xLabel },
    },
    y: build.valueAxis,
    ...build.shared,
  })
}

function buildPolar<TDatum>(
  build: ResolvedBuild<TDatum>,
  donut: boolean
): ChartDefinition<TDatum> {
  const { data, getX, getY } = build
  const sliceLabel = (slice: PieArcDatum<TDatum>) => String(getX(slice.data))
  const slices = pie<TDatum>()
    .sort(null)
    .padAngle(0.02)
    .value((datum) => getY(datum))([...data])
  return defineChartSpec<TDatum>({
    x: null,
    y: null,
    marks: [
      polar({
        inset: 8,
        marks: [
          radialArc(slices, {
            startAngle: "startAngle",
            endAngle: "endAngle",
            padAngle: "padAngle",
            innerRadius: donut
              ? ({ radius }) => radius * DONUT_INNER_RADIUS_RATIO
              : 0,
            cornerRadius: 2,
            color: sliceLabel,
            key: sliceLabel,
          }),
        ],
      }),
    ],
    ...build.shared,
  })
}

function buildChartDefinition<TDatum>(
  config: BuildConfig<TDatum>
): ChartDefinition<TDatum> {
  const build = resolveBuild(config)
  switch (config.type) {
    case "area":
      return buildArea(build)
    case "bar":
      return buildBars(build, false)
    case "bar-horizontal":
      return buildBars(build, true)
    case "scatter":
      return buildScatter(build)
    case "pie":
      return buildPolar(build, false)
    case "donut":
      return buildPolar(build, true)
    default:
      return buildLine(build)
  }
}

export function Chart<TDatum>({
  type = "line",
  data,
  x,
  y,
  series,
  stacked,
  points = false,
  smooth = false,
  grid = true,
  legend,
  legendLabel,
  xLabel,
  yLabel,
  formatValue,
  height,
  aspectRatio,
  initialWidth = 640,
  animate = true,
  tooltip = true,
  ariaLabel,
  ariaDescription,
  className,
  onSelect,
}: ChartProps<TDatum>) {
  const { root, tooltip: tooltipSlot } = chartVariants()
  const tooltipClassName = tooltipSlot()

  const definition = useMemo(
    () =>
      buildChartDefinition({
        type,
        data,
        x,
        y,
        series,
        stacked,
        points,
        smooth,
        grid,
        legend,
        legendLabel,
        xLabel,
        yLabel,
        formatValue,
        animate,
        showTooltip: tooltip,
        tooltipClassName,
      }),
    [
      type,
      data,
      x,
      y,
      series,
      stacked,
      points,
      smooth,
      grid,
      legend,
      legendLabel,
      xLabel,
      yLabel,
      formatValue,
      animate,
      tooltip,
      tooltipClassName,
    ]
  )

  const isPolar = type === "pie" || type === "donut"

  const handleSelect = onSelect
    ? (point: ChartPoint<TDatum> | null) => {
        if (point == null) {
          onSelect(null)
          return
        }
        // Polar marks receive d3 pie intervals; unwrap back to the source row.
        onSelect(
          isPolar
            ? (point.datum as unknown as PieArcDatum<TDatum>).data
            : point.datum
        )
      }
    : undefined

  return (
    <TanstackChart
      ariaDescription={ariaDescription}
      ariaLabel={ariaLabel}
      aspectRatio={height == null ? (aspectRatio ?? 16 / 9) : undefined}
      className={root({ className })}
      definition={definition}
      height={height}
      initialWidth={initialWidth}
      onSelect={handleSelect}
    />
  )
}
