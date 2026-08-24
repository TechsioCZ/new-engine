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
 *
 * @stability TanStack Charts (`@tanstack/charts`, `@tanstack/charts-scales`,
 * `@tanstack/react-charts`) is pre-alpha upstream (its own README/MARKETING.md
 * disclaim production readiness pending https://github.com/TanStack/charts
 * PLAN.md gates). This molecule is a deliberate, explicit exception to
 * `@techsio/ui-kit`'s otherwise-stable public API while that upstream library
 * matures — expect breaking changes here to track upstream, independent of
 * this package's semantic-release versioning for its other exports.
 */
import {
  areaY,
  barX,
  barY,
  type ChartAxisOptions,
  type ChartColorOptions,
  type ChartDefinition,
  type ChartMark,
  type ChartPoint,
  type ChartTooltipInput,
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
import { scaleUtc } from "d3-scale"
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

/**
 * Sentinel that asks a mark to stroke with the color channel's resolved series
 * color. The marks treat `undefined` as "no stroke" and short-circuit before
 * the fallback, so only an explicit `null` reaches `null ?? resolvedColor`.
 * The channel type has no null member, hence the cast.
 */
const SERIES_STROKE_FROM_COLOR = null as unknown as string

const DONUT_INNER_RADIUS_RATIO = 0.6

/** Padding the polar layout insets by; mirrors the `inset` passed to polar(). */
const POLAR_INSET = 8

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
type ChartSpecInput<TDatum> = {
  marks: readonly ChartMark<unknown, any, any>[]
  x?: ChartAxisOptions<any> | null
  y?: ChartAxisOptions<any> | null
  color?: ChartColorOptions
  animate?: boolean
  tooltip?: false | ChartTooltipInput<TDatum, any, any>
  maxFocusDistance?: number
}

const defineChartSpec = defineChart as unknown as <TDatum>(
  spec: ChartSpecInput<TDatum>
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
  valueAxis: ChartAxisOptions<any>
  xAxis: ChartAxisOptions<any>
  bandAxis: ChartAxisOptions<any>
  /**
   * Tooltip config for a cartesian chart, told which channel carries the value
   * so `formatValue` lands on the same number the axis ticks format.
   */
  tooltipFor: (
    valueChannel: "x" | "y",
    swapped?: boolean
  ) => false | ChartTooltipInput<TDatum, any, any>
  /** Tooltip config for pie/donut, which read the value off the source row. */
  polarTooltip: () => false | ChartTooltipInput<TDatum, any, any>
  shared: {
    color?: ChartColorOptions
    animate: boolean
  }
}

/** TanStack's categorical palette is six entries wide and indexes it modulo its
 * length, so a 7th distinct series silently repaints as series-1. */
const MAX_SERIES = 6

type TooltipPoint = {
  xValue: unknown
  yValue: unknown
  datum: unknown
}

/**
 * Shared x-axis resolver for the continuous chart forms (line, area,
 * scatter): Date values get a UTC time scale so elapsed time between points is
 * preserved, numbers get a linear scale, and anything else is treated as
 * ordered categories on a point scale.
 *
 * Every row is checked, not just the first. TanStack's quantitative and
 * temporal scales hard-throw on the first value that does not match the scale
 * kind, which would take down the whole render tree — so one stringly-typed
 * row from an API (`"12"`, or a trailing `"Today"` bucket) degrades to the
 * point scale instead of crashing.
 */
function resolveXAxis<TDatum>(
  data: readonly TDatum[],
  getX: (datum: TDatum) => string | number | Date,
  xLabel?: string
): ChartAxisOptions<any> {
  const values = data.map(getX)
  if (values.length > 0 && values.every((value) => value instanceof Date)) {
    return { scale: () => scaleUtc(), nice: true, axis: { label: xLabel } }
  }
  if (values.length > 0 && values.every((value) => typeof value === "number")) {
    return { scale: scaleLinear, nice: true, axis: { label: xLabel } }
  }
  return {
    scale: () => scalePoint<string | number | Date>().padding(0.1),
    axis: { label: xLabel },
  }
}

function resolveBuild<TDatum>(
  config: BuildConfig<TDatum>
): ResolvedBuild<TDatum> {
  const getX = toAccessor(config.x)
  const getY = toAccessor(config.y)
  const getSeries =
    config.series == null ? undefined : toAccessor(config.series)
  const isPolar = config.type === "pie" || config.type === "donut"
  const showLegend = config.legend ?? (config.series != null || isPolar)
  const { formatValue } = config
  const valueTicks = formatValue ? { format: formatValue } : undefined

  warnOnSeriesOverflow(config.data, isPolar ? getX : getSeries)

  const tooltipBase = {
    use: chartTooltip,
    className: config.tooltipClassName,
  }
  // Axis labels are optional, but the library falls back to the literal
  // strings "x" and "y" when they are unset — so an unlabelled chart shows a
  // tooltip row called "x". Borrow the caller's own field name instead, which
  // is at least their vocabulary and their language. Undefined (never "") so
  // the library's own fallback stays reachable when the channel is a function.
  const channelName = (
    accessor: ChartAccessor<TDatum, unknown>,
    label?: string
  ) => label ?? (typeof accessor === "string" ? accessor : undefined)
  const xName = channelName(config.x, config.xLabel)
  const yName = channelName(config.y, config.yLabel)
  // The tooltip formats values with its own locale formatter and never
  // consults the axis tick formatter, so `formatValue` has to be handed to it
  // separately — otherwise the axis reads "81k €" and the tooltip "81,000".
  const formatChannel = (point: TooltipPoint, channel: "x" | "y") => {
    const value = channel === "x" ? point.xValue : point.yValue
    if (typeof value === "number" && formatValue) {
      return formatValue(value)
    }
    return String(value ?? "")
  }

  // `swapped` covers horizontal bars: barX passes { x: getY, y: getX }, so the
  // spatial x/y channels carry the opposite data than every other chart form.
  // Labels have to follow the data channel (xName/yName), not the spatial one
  // — resolve which data channel actually holds the value before naming rows.
  const tooltipFor = (valueChannel: "x" | "y", swapped = false) => {
    if (!config.showTooltip) {
      return false as const
    }
    const dataValueChannel: "x" | "y" = swapped ? "y" : valueChannel
    const valueName = dataValueChannel === "x" ? xName : yName
    const categoryName = dataValueChannel === "x" ? yName : xName
    const valueItem = {
      channel: valueChannel,
      label: valueName,
      // Only override the text when there is a formatter; otherwise leave it
      // undefined so the library formats the value itself.
      text: formatValue
        ? (point: TooltipPoint) => formatChannel(point, valueChannel)
        : undefined,
    }
    const categoryChannel: "x" | "y" = valueChannel === "x" ? "y" : "x"
    const categoryItem = {
      channel: categoryChannel,
      label: categoryName,
    }
    return {
      ...tooltipBase,
      items:
        valueChannel === "x"
          ? [valueItem, categoryItem]
          : [categoryItem, valueItem],
    }
  }

  const polarTooltip = () => {
    if (!config.showTooltip) {
      return false as const
    }
    // Polar points carry the d3 pie interval, and their x/y values are the
    // slice mid-angle in radians and mid-radius in pixels — meaningless to a
    // reader. Read the value straight off the source row instead.
    return {
      ...tooltipBase,
      items: [
        {
          id: "value",
          // No hardcoded English fallback — this string ships to storefronts
          // in other languages. `yLabel` is the localized name when given;
          // otherwise borrow the caller's own field name, which they control.
          label: yName,
          text: (point: TooltipPoint) => {
            const row = (point.datum as PieArcDatum<TDatum>).data
            const value = getY(row)
            return formatValue ? formatValue(value) : String(value)
          },
        },
      ],
    }
  }

  // Value axis: linear, niced, carrying the grid — chart chrome stays
  // recessive because grid/axis text derive from currentColor
  // (`--color-chart-fg`).
  const valueAxis = {
    scale: scaleLinear,
    nice: true,
    grid: config.grid,
    axis: { label: config.yLabel, ticks: valueTicks },
  }

  const xAxis = resolveXAxis(config.data, getX, config.xLabel)

  return {
    data: config.data,
    getX,
    getY,
    getSeries,
    stacked: config.stacked,
    points: config.points,
    curve: config.smooth ? d3Curve(curveMonotoneX) : undefined,
    grid: config.grid,
    xLabel: config.xLabel,
    yLabel: config.yLabel,
    valueTicks,
    valueAxis,
    xAxis,
    bandAxis: {
      scale: () => scaleBand<string | number | Date>().padding(0.3),
      axis: { label: config.xLabel },
    },
    tooltipFor,
    polarTooltip,
    shared: {
      color: showLegend
        ? { legend: colorLegend({ label: config.legendLabel }) }
        : undefined,
      animate: config.animate,
    },
  }
}

/**
 * Warns once per render when a dataset asks for more colors than the palette
 * can distinguish. TanStack wraps with `range[index % range.length]`, so the
 * 7th color renders identically to the 1st — including its legend swatch —
 * with no signal that two marks are now indistinguishable.
 *
 * Which channel carries color identity depends on the chart form: cartesian
 * charts color by `series`, but pie and donut color by slice, i.e. `x`. A
 * 9-slice pie overflows the palette exactly like a 9-series line chart does.
 */
function warnOnSeriesOverflow<TDatum>(
  data: readonly TDatum[],
  getColorIdentity?: (datum: TDatum) => string | number | Date
) {
  // `process` is guarded, not assumed: this is a browser-target ESM package and
  // the bare reference survives into dist, so an unbundled consumer (plain
  // <script type="module">, CDN, Deno) would throw ReferenceError on first
  // render of any chart that reaches this path.
  const isProduction =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production"
  if (getColorIdentity == null || isProduction) {
    return
  }
  const distinct = new Set(data.map((datum) => String(getColorIdentity(datum))))
  if (distinct.size > MAX_SERIES) {
    console.warn(
      `Chart: ${distinct.size} distinct colors exceeds the ${MAX_SERIES}-color palette; ` +
        "everything beyond the sixth reuses an earlier color and cannot be told apart. " +
        "Group the long tail into an “Other” bucket, or split into small multiples."
    )
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
    x: build.xAxis,
    y: build.valueAxis,
    ...build.shared,
    tooltip: build.tooltipFor("y"),
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
        // areaY skips stroke entirely when the option is `undefined`, so
        // multi-series areas would otherwise render with no outline at all —
        // worst in the overlapping layout, where the boundary is the only thing
        // separating two 25%-opacity bands. `null` clears that short-circuit and
        // then resolves to the series' own palette color, the same fallback
        // `fill` rides on.
        stroke: getSeries == null ? SERIES_1_PAINT : SERIES_STROKE_FROM_COLOR,
        strokeWidth: 2,
      }),
    ],
    x: build.xAxis,
    y: build.valueAxis,
    ...build.shared,
    tooltip: build.tooltipFor("y"),
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
      tooltip: build.tooltipFor("x", true),
    })
  }
  return defineChartSpec<TDatum>({
    marks: [barY(data, { x: getX, y: getY, ...barOptions })],
    x: build.bandAxis,
    y: build.valueAxis,
    ...build.shared,
    tooltip: build.tooltipFor("y"),
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
    x: { ...build.xAxis, grid: build.grid },
    y: build.valueAxis,
    ...build.shared,
    tooltip: build.tooltipFor("y"),
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
        inset: POLAR_INSET,
        marks: [
          radialArc(slices, {
            startAngle: "startAngle",
            endAngle: "endAngle",
            padAngle: "padAngle",
            innerRadius: donut
              ? ({ radius }) => radius * DONUT_INNER_RADIUS_RATIO
              : 0,
            cornerRadius: 2,
            // `z` is what gives each slice a group identity. radialArc reads
            // groups from `z` only — unlike radialLine/radialArea it does not
            // fall back to `color` — and the tooltip drops its title whenever
            // the group is null, so without this the slice name never renders.
            z: sliceLabel,
            color: sliceLabel,
            // No explicit `key`: an explicit one skips the uniqueness check,
            // and two rows sharing an x label (duplicate category names, two
            // "Other" buckets) would then collide onto one reconciled node and
            // drop a slice on re-render. The default row-index key is stable
            // here because the pie layout preserves input order (.sort(null)).
          }),
        ],
      }),
    ],
    ...build.shared,
    tooltip: build.polarTooltip(),
    // Deliberately NOT setting maxFocusDistance. Arc focus points sit at the
    // slice centroid, so the library's 48px default leaves parts of a large pie
    // hard to hover — but the value is fixed at spec time while the chart
    // renders responsively, and the same distance also gates clicks. Any
    // constant is therefore wrong at some width: too small and a big slice is
    // unreachable, too large and `onSelect(null)` can never fire because every
    // click resolves to a slice. Widening this needs a `focus` strategy that
    // hit-tests the arc against the measured layout, not a guess from
    // `initialWidth`. Tracked; the default at least keeps deselect correct.
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
