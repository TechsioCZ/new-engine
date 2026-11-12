/**
 * Chart — @techsio/ui-kit molecule.
 *
 * @component Chart
 * @componentVersion v1.3.0
 * @skill chart-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the chart-usage skill's component_version and a changelog entry. Bump all three together.
 *
 * Declarative charting built on TanStack Charts (`@tanstack/charts/react`).
 * One `type` prop switches between the popular
 * chart forms — line, area, bar, horizontal bar, scatter, pie and donut —
 * from the same `data`/`x`/`y`/`series` channels. Series colors flow from
 * the `--color-chart-series-*` design tokens (bridged onto TanStack's
 * `--ts-chart-*` palette variables by the `chart-base` utility), axis and
 * grid chrome inherit `--color-chart-fg` via `currentColor`, and the native
 * tooltip surface is styled by the `chart-tooltip` utility.
 *
 * @stability TanStack Charts follows semantic versioning from 1.0. This
 * molecule follows `@techsio/ui-kit`'s public API versioning.
 */
import {
  areaY,
  barX,
  barY,
  type ChartAxisOptions,
  type ChartColorOptions,
  type ChartFocusPreset,
  type ChartPoint,
  type ChartScene,
  type ChartTooltipAnchorContext,
  type ChartTooltipContent,
  type ChartTooltipInput,
  type ChartTooltipPosition,
  type ChartTooltipRow,
  type ChartValue,
  colorLegend,
  colorLegendItems,
  type DomChartDefinition,
  d3Curve,
  dot,
  group,
  lineY,
  type RenderChartSvgOptions,
  type SceneNode,
  stack,
} from "@tanstack/charts"
import { polar, radialArc } from "@tanstack/charts/polar"
import { Chart as TanstackChart } from "@tanstack/charts/react"
import { scaleBand } from "@tanstack/charts/scales/band"
import { scaleLinear } from "@tanstack/charts/scales/linear"
import { scalePoint } from "@tanstack/charts/scales/point"
import { renderChartSvg } from "@tanstack/charts/svg"
import { tooltip as chartTooltip } from "@tanstack/charts/tooltip"
import { scaleUtc } from "d3-scale"
import { curveMonotoneX, type PieArcDatum, pie } from "d3-shape"
import { useMemo, useRef, useState } from "react"
import { usePrefersReducedMotion } from "../internal/reduced-motion"
import { useUiMessages } from "../messages/ui-messages-provider"
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
  /** Stable identity order across filters and remounts; use the full unfiltered domain. */
  seriesDomain?: readonly (string | number)[]
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
  /**
   * Human series name shown in the tooltip row of a single-series chart and pie (e.g. "Tržby"). Falls back to
   * `yLabel`; the raw `y` field name is never shown. Multi-series rows use the `series` values.
   */
  valueLabel?: string
  /** Formats the tooltip title from the category / x value. Numbers are plain `String`; dates use a fixed `en-US` medium format unless `locale` is set. */
  formatCategory?: (value: string | number | Date) => string
  /** Formats values in the tooltip. Defaults to `formatValue`, then locale number formatting. */
  formatTooltipValue?: (value: number) => string
  /** BCP 47 locale for the default tooltip number and date formatting (e.g. "cs-CZ"). Unset: numbers are plain `String` and dates use a fixed `en-US` medium format. */
  locale?: string
  /** Fixed pixel height. When omitted, `aspectRatio` controls sizing. */
  height?: number
  /** Width/height ratio used when `height` is omitted. Defaults to 16/9. */
  aspectRatio?: number
  /** Deterministic first-frame width for SSR and hidden containers. */
  initialWidth?: number
  /**
   * Animate mark transitions. Defaults to true, or false when the user prefers
   * reduced motion.
   */
  animate?: boolean
  /** Show the built-in tooltip on hover/focus. Defaults to true. */
  tooltip?: boolean
  /** Accessible chart name. Required. */
  ariaLabel: string
  /** Longer accessible description. */
  ariaDescription?: string
  className?: string
  /** Localized labels for the always-available data alternative and fallback states. */
  dataTableLabel?: string
  emptyLabel?: string
  invalidLabel?: string
  /** Fires with the source row of the selected point, or null on deselect. */
  onSelect?: (datum: TDatum | null) => void
}

const chartVariants = tv({
  slots: {
    root: "chart-base block w-full text-chart-fg",
    tooltip: "chart-tooltip popup-layer!",
    alternative: "overflow-auto text-chart-data text-chart-fg",
    summary:
      "cursor-pointer rounded-chart-tooltip focus-visible:outline-chart-fg",
    cell: "border-chart-tooltip-border border-b p-chart-cell text-start",
    legend: "flex flex-wrap gap-chart-legend text-chart-data text-chart-fg",
    legendItem: "inline-flex items-center gap-chart-item",
    fallback: "p-chart-fallback text-chart-data text-chart-fg",
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

type BuildConfig<TDatum> = {
  type: ChartType
  data: readonly TDatum[]
  x: ChartAccessor<TDatum, string | number | Date>
  y: ChartAccessor<TDatum, number>
  series?: ChartAccessor<TDatum, string | number>
  /** Stable identity order across filters and remounts; use the full unfiltered domain. */
  seriesDomain?: readonly (string | number)[]
  stacked?: boolean
  points: boolean
  smooth: boolean
  grid: boolean
  legend?: boolean
  legendLabel?: string
  xLabel?: string
  yLabel?: string
  formatValue?: (value: number) => string
  valueLabel?: string
  formatCategory?: (value: string | number | Date) => string
  formatTooltipValue?: (value: number) => string
  /** Unset: the UiMessagesProvider locale; without one, numbers are plain `String` and dates use a fixed `en-US` medium format. */
  locale?: string
  animate: boolean
  showTooltip: boolean
  tooltipClassName: string
}

type ResolvedBuild<TDatum> = {
  data: readonly TDatum[]
  getX: (datum: TDatum) => string | number | Date
  getY: (datum: TDatum) => number
  getSeries?: (datum: TDatum) => string | number
  seriesDomain?: readonly (string | number)[]
  stacked?: boolean
  points: boolean
  curve?: ReturnType<typeof d3Curve>
  grid: boolean
  xLabel?: string
  yLabel?: string
  valueTicks?: { format?: (value: number) => string }
  valueAxis: ChartAxisOptions<number>
  xAxis: ChartAxisOptions<ChartValue>
  bandAxis: ChartAxisOptions<ChartValue>
  /**
   * Tooltip config for a cartesian chart, told which channel carries the value
   * so the value formatter lands on the same number the axis ticks format.
   */
  tooltipFor: (
    valueChannel: "x" | "y"
  ) => false | ChartTooltipInput<TDatum, ChartValue, ChartValue, "dom">
  /** Tooltip config for pie/donut, which read the value off the source row. */
  polarTooltip: () =>
    | false
    | ChartTooltipInput<TDatum, ChartValue, ChartValue, "dom">
  shared: {
    color?: ChartColorOptions
    svgAnimation: boolean
    focus?: ChartFocusPreset
  }
}

/** TanStack's categorical palette is six entries wide and indexes it modulo its
 * length, so a 7th distinct series silently repaints as series-1. */
const READABLE_TICK_LABELS = { fontSize: 14, opacity: 1 }
const MAX_SERIES = 6
const LINE_DASHES = ["", "8 4", "2 4", "8 4 2 4", "12 4", "4 4"]

const TOOLTIP_GAP = 12
const TOOLTIP_EDGE = 8
let tooltipMeasureContext: CanvasRenderingContext2D | false | undefined

/** A BCP 47 tag the runtime accepts; anything else (e.g. "cs_CZ") is treated as no locale instead of throwing. */
function validLocale(locale: string | undefined): string | undefined {
  if (locale == null) {
    return undefined
  }
  try {
    Intl.getCanonicalLocales(locale)
    return locale
  } catch {
    return undefined
  }
}

/** Text width in px for the tooltip font; falls back to a generous per-character estimate without canvas. */
function tooltipTextWidth(text: string, weight: number) {
  if (tooltipMeasureContext == null && typeof document !== "undefined") {
    // `getContext` is absent in some DOM shims, so guard the call as well.
    tooltipMeasureContext =
      document.createElement("canvas").getContext?.("2d") ?? false
  }
  if (!tooltipMeasureContext) {
    return 8.5 * text.length
  }
  tooltipMeasureContext.font = `${weight} 15px system-ui, sans-serif`
  return 1.08 * tooltipMeasureContext.measureText(text).width
}

/** Upper-bound size of the structured tooltip, so the anchor can keep it clear of the hovered mark. */
function estimateTooltipSize(content: ChartTooltipContent) {
  const titleWidth = content.title ? tooltipTextWidth(content.title, 650) : 0
  const rowWidth = Math.max(
    0,
    ...content.rows.map(
      (row) =>
        40 + tooltipTextWidth(row.label, 500) + tooltipTextWidth(row.value, 600)
    )
  )
  return {
    width: Math.ceil(Math.max(titleWidth, rowWidth) + 34),
    height: Math.ceil(30 + (content.title ? 26 : 0) + 24 * content.rows.length),
  }
}

/**
 * Top-left corner for the tooltip (used with placement "bottom-right" and offset 0): above the hovered column when it
 * fits, otherwise beside it on the side with room, never on top of the mark. The host clamps it inside the chart.
 */
function chartTooltipCorner<TDatum>(
  content: ChartTooltipContent,
  points: readonly ChartPoint<TDatum, ChartValue, ChartValue>[],
  context: ChartTooltipAnchorContext<TDatum, ChartValue, ChartValue>,
  horizontal: boolean
): ChartTooltipPosition | null {
  const first = points[0]
  if (!first) {
    return null
  }
  const { width, height } = estimateTooltipSize(content)
  const { surface } = context
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const categoryScale = context.scales[horizontal ? "y" : "x"]
  const band = categoryScale?.bandwidth ?? 0
  const bandStart =
    categoryScale && band > 0
      ? categoryScale.map(horizontal ? first.yValue : first.xValue)
      : Number.NaN
  const hasBand = Number.isFinite(bandStart)

  if (horizontal) {
    const top = hasBand ? bandStart : Math.min(...ys)
    const bottom = hasBand ? bandStart + band : Math.max(...ys)
    const end = Math.max(...xs)
    if (end + TOOLTIP_GAP + width + TOOLTIP_EDGE <= surface.width) {
      return { x: end + TOOLTIP_GAP, y: (top + bottom - height) / 2 }
    }
    if (top - TOOLTIP_GAP - height >= TOOLTIP_EDGE) {
      return { x: end - width, y: top - TOOLTIP_GAP - height }
    }
    return { x: end - width, y: bottom + TOOLTIP_GAP }
  }

  const left = hasBand ? bandStart : Math.min(...xs)
  const right = hasBand ? bandStart + band : Math.max(...xs)
  const top = Math.min(...ys)
  const center = (left + right) / 2
  if (top - TOOLTIP_GAP - height >= TOOLTIP_EDGE) {
    return { x: center - width / 2, y: top - TOOLTIP_GAP - height }
  }
  const y = Math.max(TOOLTIP_EDGE, top)
  if (right + TOOLTIP_GAP + width + TOOLTIP_EDGE <= surface.width) {
    return { x: right + TOOLTIP_GAP, y }
  }
  return { x: left - TOOLTIP_GAP - width, y }
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
): ChartAxisOptions<ChartValue> {
  const values = data.map(getX)
  if (values.length > 0 && values.every((value) => value instanceof Date)) {
    return {
      scale: () => scaleUtc(),
      nice: true,
      axis: { label: xLabel, tickLabels: READABLE_TICK_LABELS },
    }
  }
  if (values.length > 0 && values.every((value) => typeof value === "number")) {
    return {
      scale: scaleLinear,
      nice: true,
      axis: { label: xLabel, tickLabels: READABLE_TICK_LABELS },
    }
  }
  return {
    scale: () => scalePoint<string | number | Date>().padding(0.1),
    axis: { label: xLabel, tickLabels: READABLE_TICK_LABELS },
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
  const valueTicks = { format: formatValue }

  warnOnSeriesOverflow(config.data, isPolar ? getX : getSeries)

  const tooltipBase = {
    use: chartTooltip,
    className: config.tooltipClassName,
  }
  // Tooltips never show raw field names. Values use the caller's formatters,
  // then the caller's locale when one is given. Without a locale, numbers are
  // plain String and dates fall back to a fixed en-US medium date, so the
  // default output does not depend on the viewer's browser locale.
  const locale = validLocale(config.locale)
  const numberFormat = locale ? new Intl.NumberFormat(locale) : undefined
  const dateFormat = new Intl.DateTimeFormat(locale ?? "en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  })
  const formatCategory = (value: string | number | Date) => {
    if (config.formatCategory) {
      return config.formatCategory(value)
    }
    if (value instanceof Date) {
      return dateFormat.format(value)
    }
    if (typeof value === "number") {
      return numberFormat ? numberFormat.format(value) : String(value)
    }
    return String(value)
  }
  // The tooltip never consults the axis tick formatter, so the value formatter
  // is handed over separately; otherwise the axis reads "81k €" and the
  // tooltip "81,000".
  const formatTooltipValue = (value: number) => {
    const format = config.formatTooltipValue ?? formatValue
    if (format) {
      return format(value)
    }
    return numberFormat ? numberFormat.format(value) : String(value)
  }
  // The value row is named by the series (multi-series) or by `valueLabel`,
  // falling back to `yLabel`. The raw `y` field name is never shown.
  const valueName = config.valueLabel ?? config.yLabel ?? ""
  const rowFor = (
    row: TDatum,
    point: ChartPoint,
    active: boolean
  ): ChartTooltipRow => ({
    label: getSeries ? String(getSeries(row)) : valueName,
    value: formatTooltipValue(getY(row)),
    color: point.color || SERIES_1_PAINT,
    active,
  })
  const cartesianContent = (
    points: readonly ChartPoint<TDatum, ChartValue, ChartValue>[],
    primaryPoint: ChartPoint | undefined
  ): ChartTooltipContent => {
    const first = points[0]
    if (!first) {
      return { rows: [] }
    }
    return {
      title: formatCategory(getX(first.datum)),
      rows: points.map((point) =>
        rowFor(point.datum, point, points.length > 1 && point === primaryPoint)
      ),
    }
  }
  const polarContent = (
    points: readonly ChartPoint<unknown, ChartValue, ChartValue>[]
  ): ChartTooltipContent => {
    const first = points[0]
    if (!first) {
      return { rows: [] }
    }
    // Polar points carry the d3 pie interval, and their x/y values are the
    // slice mid-angle in radians and mid-radius in pixels — meaningless to a
    // reader. Read the value straight off the source row instead.
    const row = (first.datum as PieArcDatum<TDatum>).data
    return {
      title: formatCategory(getX(row)),
      rows: [
        {
          label: valueName,
          value: formatTooltipValue(getY(row)),
          color: first.color || SERIES_1_PAINT,
        },
      ],
    }
  }
  // Cartesian tooltips sit beside or above the hovered mark, never on top of it.
  const tooltipFor = (
    valueChannel: "x" | "y"
  ): false | ChartTooltipInput<TDatum, ChartValue, ChartValue, "dom"> => {
    if (!config.showTooltip) {
      return false
    }
    const horizontal = valueChannel === "x"
    return {
      ...tooltipBase,
      content: (points, context) =>
        cartesianContent(points, context.primaryPoint),
      anchor: (points, context) =>
        chartTooltipCorner(
          cartesianContent(points, context.focus.primary),
          points,
          context,
          horizontal
        ),
      placement: "bottom-right",
      offset: 0,
    }
  }

  const polarTooltip = ():
    | false
    | ChartTooltipInput<TDatum, ChartValue, ChartValue, "dom"> => {
    if (!config.showTooltip) {
      return false
    }
    return {
      ...tooltipBase,
      content: polarContent,
      anchor: "pointer",
      placement: ["right", "left", "bottom", "top"],
      offset: 16,
    }
  }
  // Hovering a series focuses the whole group along the category axis, so
  // the tooltip lists every series at that category.
  let focus: ChartFocusPreset | undefined
  if (getSeries != null && !isPolar) {
    focus = config.type === "bar-horizontal" ? "group-y" : "group-x"
  }

  // Value axis: linear, niced, carrying the grid — chart chrome stays
  // recessive because grid/axis text derive from currentColor
  // (`--color-chart-fg`).
  const valueAxis = {
    scale: scaleLinear,
    nice: true,
    grid: config.grid,
    axis: {
      label: config.yLabel,
      ticks: valueTicks,
      tickLabels: READABLE_TICK_LABELS,
    },
  }

  const xAxis = resolveXAxis(config.data, getX, config.xLabel)

  return {
    data: config.data,
    getX,
    getY,
    getSeries,
    seriesDomain: config.seriesDomain,
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
      axis: {
        label: config.xLabel,
        tickLabels: READABLE_TICK_LABELS,
      },
    },
    tooltipFor,
    polarTooltip,
    shared: {
      color: {
        domain: config.seriesDomain,
        legend:
          showLegend && config.type !== "line"
            ? colorLegend({
                label: config.legendLabel,
                items: colorLegendItems({
                  label: { fontSize: 14, fillOpacity: 1 },
                }),
              })
            : undefined,
      },
      svgAnimation: config.animate,
      ...(focus ? { focus } : {}),
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
): DomChartDefinition<TDatum> {
  const { data, getX, getY, getSeries } = build
  const identities = getSeries ? [...new Set(data.map(getSeries))] : [undefined]
  return {
    marks: identities.map((identity) => {
      const rows = getSeries
        ? data.filter((row) => getSeries(row) === identity)
        : data
      const index =
        identity == null ? 0 : (build.seriesDomain?.indexOf(identity) ?? 0)
      return lineY(rows, {
        x: getX,
        y: getY,
        z: getSeries,
        color: getSeries,
        points: build.points || rows.length === 1,
        curve: build.curve,
        strokeDasharray: LINE_DASHES[index % LINE_DASHES.length],
        stroke: getSeries == null ? SERIES_1_PAINT : undefined,
      })
    }),
    scales: { x: build.xAxis, y: build.valueAxis },
    ...build.shared,
    tooltip: build.tooltipFor("y"),
  }
}

function buildArea<TDatum>(
  build: ResolvedBuild<TDatum>
): DomChartDefinition<TDatum> {
  const { data, getX, getY, getSeries } = build
  const isStacked = build.stacked ?? true
  return {
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
    scales: { x: build.xAxis, y: build.valueAxis },
    ...build.shared,
    tooltip: build.tooltipFor("y"),
  }
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
): DomChartDefinition<TDatum> {
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
    return {
      marks: [barX(data, { x: getY, y: getX, ...barOptions })],
      // The value channel runs along x here, so it carries grid and format.
      scales: {
        x: {
          scale: scaleLinear,
          nice: true,
          grid: build.grid,
          axis: {
            label: build.yLabel,
            ticks: build.valueTicks,
            tickLabels: READABLE_TICK_LABELS,
          },
        },
        y: build.bandAxis,
      },
      ...build.shared,
      tooltip: build.tooltipFor("x"),
    }
  }
  return {
    marks: [barY(data, { x: getX, y: getY, ...barOptions })],
    scales: { x: build.bandAxis, y: build.valueAxis },
    ...build.shared,
    tooltip: build.tooltipFor("y"),
  }
}

function buildScatter<TDatum>(
  build: ResolvedBuild<TDatum>
): DomChartDefinition<TDatum> {
  const { data, getX, getY, getSeries } = build
  return {
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
    scales: {
      x: { ...build.xAxis, grid: build.grid },
      y: build.valueAxis,
    },
    ...build.shared,
    tooltip: build.tooltipFor("y"),
  }
}

function buildPolar<TDatum>(
  build: ResolvedBuild<TDatum>,
  donut: boolean
): DomChartDefinition<TDatum> {
  const { data, getX, getY } = build
  const sliceLabel = (slice: PieArcDatum<TDatum>) => String(getX(slice.data))
  const slices = pie<TDatum>()
    .sort(null)
    .padAngle(0.02)
    .value((datum) => getY(datum))([...data])
  return {
    scales: { x: null, y: null },
    marks: [
      polar({
        inset: POLAR_INSET,
        // radialArc uses explicit angles and radii, so disable both scales.
        scales: { angle: null, radius: null },
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
    // Upstream radialArc provides geometry-based focus across each slice.
  }
}

function buildChartDefinition<TDatum>(
  config: BuildConfig<TDatum>
): DomChartDefinition<TDatum> {
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

const CARTESIAN_GRID_PAINT_ORDER = ["y-grid", "x-grid"]
const CARTESIAN_AXIS_PAINT_ORDER = [
  "x-axis",
  "y-axis",
  "x-tick-rule",
  "x-tick-label",
  "y-tick-rule",
  "y-tick-label",
  "x-label",
  "y-label",
]

function cartesianGuidePaintOrder(key: string, order: readonly string[]) {
  const index = order.findIndex(
    (prefix) => key === prefix || key.startsWith(`${prefix}:`)
  )
  return index < 0 ? order.length : index
}

/** Preserve the previous Cartesian rasterization at overlapping translucent guides. */
function renderCartesianChartSvg(
  scene: ChartScene,
  options: RenderChartSvgOptions
) {
  const nodes = scene.nodes.map((node) => {
    if (node.kind !== "group" || (node.key !== "grid" && node.key !== "axes")) {
      return node
    }
    const order =
      node.key === "grid"
        ? CARTESIAN_GRID_PAINT_ORDER
        : CARTESIAN_AXIS_PAINT_ORDER
    const children = node.children.map((child) => {
      // The old y ticks ran left to right. Reversing the same segment changes
      // antialiasing at some intersections, even with identical bounds/paint.
      if (
        node.key === "axes" &&
        child.kind === "rule" &&
        child.key.startsWith("y-tick-rule:") &&
        child.x1 > child.x2
      ) {
        return { ...child, x1: child.x2, x2: child.x1 }
      }
      return child
    })
    children.sort(
      (left, right) =>
        cartesianGuidePaintOrder(left.key, order) -
        cartesianGuidePaintOrder(right.key, order)
    )
    return { ...node, children }
  })
  return renderReadableChartSvg({ ...scene, nodes }, options)
}

function renderReadableChartSvg(
  scene: ChartScene,
  options: RenderChartSvgOptions
) {
  const readable = (node: SceneNode): SceneNode => {
    if (node.kind === "group") {
      return { ...node, children: node.children.map(readable) }
    }
    if (node.kind === "label") {
      return {
        ...node,
        fontSize: Math.max(READABLE_TICK_LABELS.fontSize, node.fontSize ?? 0),
        style: { ...node.style, fillOpacity: 1, opacity: 1 },
      }
    }
    return node
  }
  return renderChartSvg({ ...scene, nodes: scene.nodes.map(readable) }, options)
}

function useStableSeriesDomain<TDatum>(
  data: readonly TDatum[],
  getIdentity: ((datum: TDatum) => string | number) | undefined,
  domain?: readonly (string | number)[]
) {
  const seenIdentities = useRef<(string | number)[]>([])
  for (const datum of data) {
    const identity = getIdentity?.(datum)
    if (identity != null && !seenIdentities.current.includes(identity)) {
      seenIdentities.current.push(identity)
    }
  }
  return domain ?? seenIdentities.current
}

function filterChartData<TDatum>(
  data: readonly TDatum[],
  x: ChartProps<TDatum>["x"],
  y: ChartProps<TDatum>["y"]
) {
  const getX = toAccessor(x)
  const getY = toAccessor(y)
  return data.filter((datum) => {
    const category = getX(datum)
    return (
      Number.isFinite(getY(datum)) &&
      (typeof category !== "number" || Number.isFinite(category)) &&
      (!(category instanceof Date) || Number.isFinite(category.getTime()))
    )
  })
}
function invalidPolarData<TDatum>(
  data: readonly TDatum[],
  validData: readonly TDatum[],
  getY: (datum: TDatum) => number
) {
  const total = validData.reduce((sum, datum) => sum + getY(datum), 0)
  return (
    validData.length !== data.length ||
    validData.some((datum) => getY(datum) < 0) ||
    (validData.length > 0 && (!Number.isFinite(total) || total <= 0))
  )
}

function ChartDataAlternative<TDatum>({
  data,
  x,
  y,
  series,
  xLabel,
  yLabel,
  legendLabel,
  formatValue,
  ariaLabel,
  dataTableLabel,
}: ChartProps<TDatum>) {
  const messages = useUiMessages()
  const { alternative, summary, cell } = chartVariants()
  const getX = toAccessor(x)
  const getY = toAccessor(y)
  const getSeries = series == null ? undefined : toAccessor(series)
  const occurrences = new Map<string, number>()
  return (
    <details className={alternative()}>
      <summary className={summary()}>{dataTableLabel}</summary>
      <table>
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            {getSeries && (
              <th className={cell()} scope="col">
                {legendLabel ??
                  (typeof series === "string"
                    ? series
                    : messages.chart.seriesHeader)}
              </th>
            )}
            <th className={cell()} scope="col">
              {xLabel ??
                (typeof x === "string" ? x : messages.chart.categoryHeader)}
            </th>
            <th className={cell()} scope="col">
              {yLabel ??
                (typeof y === "string" ? y : messages.chart.valueHeader)}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((datum) => {
            const identity = `${String(getX(datum))}:${getSeries?.(datum) ?? ""}`
            const occurrence = occurrences.get(identity) ?? 0
            occurrences.set(identity, occurrence + 1)
            return (
              <tr key={`${identity}:${occurrence}`}>
                {getSeries && <td className={cell()}>{getSeries(datum)}</td>}
                <td className={cell()}>{String(getX(datum))}</td>
                <td className={cell()}>
                  {formatValue ? formatValue(getY(datum)) : String(getY(datum))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </details>
  )
}

function ChartLineLegend({
  identities,
  domain,
  label,
}: {
  identities: (string | number)[]
  domain: readonly (string | number)[]
  label?: string
}) {
  const { legend, legendItem } = chartVariants()
  return (
    <ul aria-label={label} className={legend()}>
      {identities.map((identity) => {
        const index = Math.max(0, domain.indexOf(identity))
        return (
          <li className={legendItem()} key={identity}>
            <svg aria-hidden="true" height="12" viewBox="0 0 32 12" width="32">
              <line
                stroke={`var(--color-chart-series-${(index % MAX_SERIES) + 1})`}
                strokeDasharray={LINE_DASHES[index % LINE_DASHES.length]}
                strokeWidth="2"
                x1="0"
                x2="32"
                y1="6"
                y2="6"
              />
            </svg>
            {identity}
          </li>
        )
      })}
    </ul>
  )
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: each fallback text (catalog entry) adds one branch to the public Chart root.
export function Chart<TDatum>({
  type = "line",
  data,
  x,
  y,
  series,
  seriesDomain,
  stacked,
  points = false,
  smooth = false,
  grid = true,
  legend,
  legendLabel,
  xLabel,
  yLabel,
  formatValue,
  valueLabel,
  formatCategory,
  formatTooltipValue,
  locale,
  height,
  aspectRatio,
  initialWidth = 640,
  animate,
  tooltip = true,
  ariaLabel,
  ariaDescription,
  className,
  dataTableLabel,
  emptyLabel,
  invalidLabel,
  onSelect,
}: ChartProps<TDatum>) {
  const messages = useUiMessages()
  const resolvedLocale = locale ?? messages.locale
  const { root, tooltip: tooltipSlot, fallback } = chartVariants()
  const tooltipClassName = tooltipSlot()
  const prefersReducedMotion = usePrefersReducedMotion()
  const shouldAnimate = animate ?? !prefersReducedMotion

  const [dismissed, setDismissed] = useState(false)
  const getX = toAccessor(x)
  const getY = toAccessor(y)
  const getSeries = series == null ? undefined : toAccessor(series)
  const isPolar = type === "pie" || type === "donut"
  const validData = useMemo(() => filterChartData(data, x, y), [data, x, y])
  const invalidPolar = isPolar && invalidPolarData(data, validData, getY)
  const stableDomain = useStableSeriesDomain(
    validData,
    isPolar ? (datum) => String(getX(datum)) : getSeries,
    // Polar marks use display labels as identities; normalize the explicit
    // domain too so numeric categories keep their slots after filtering.
    isPolar ? seriesDomain?.map(String) : seriesDomain
  )
  const domainKey = JSON.stringify(stableDomain)
  const definition = useMemo(
    () =>
      buildChartDefinition({
        type,
        data: invalidPolar ? [] : validData,
        x,
        y,
        series,
        seriesDomain: JSON.parse(domainKey) as (string | number)[],
        stacked,
        points,
        smooth,
        grid,
        legend,
        legendLabel,
        xLabel,
        yLabel,
        formatValue,
        valueLabel,
        formatCategory,
        formatTooltipValue,
        locale: resolvedLocale,
        animate: shouldAnimate,
        showTooltip: tooltip && !dismissed,
        tooltipClassName,
      }),
    [
      type,
      validData,
      invalidPolar,
      domainKey,
      dismissed,
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
      valueLabel,
      formatCategory,
      formatTooltipValue,
      resolvedLocale,
      shouldAnimate,
      tooltip,
      tooltipClassName,
    ]
  )

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
    <div
      className={root({ className })}
      onKeyDownCapture={(event) => {
        if (event.key === "Escape") {
          setDismissed(true)
        } else if (
          [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
          ].includes(event.key)
        ) {
          setDismissed(false)
        }
      }}
      onPointerMoveCapture={() => {
        if (dismissed) {
          setDismissed(false)
        }
      }}
    >
      {invalidPolar || validData.length === 0 ? (
        <p className={fallback()} role="status">
          {invalidPolar
            ? (invalidLabel ?? messages.chart.invalidLabel)
            : (emptyLabel ?? messages.chart.emptyLabel)}
        </p>
      ) : (
        <TanstackChart
          ariaDescription={ariaDescription}
          ariaLabel={ariaLabel}
          aspectRatio={height == null ? (aspectRatio ?? 16 / 9) : undefined}
          definition={definition}
          height={height}
          initialWidth={initialWidth}
          onSelect={handleSelect}
          renderSvg={isPolar ? renderReadableChartSvg : renderCartesianChartSvg}
        />
      )}
      {type === "line" && getSeries && legend !== false && !invalidPolar && (
        <ChartLineLegend
          domain={stableDomain}
          identities={[...new Set(validData.map(getSeries))]}
          label={legendLabel}
        />
      )}
      {validData.length > 0 && !invalidPolar && (
        <ChartDataAlternative
          ariaLabel={ariaLabel}
          data={validData}
          dataTableLabel={dataTableLabel ?? messages.chart.dataTableLabel}
          formatValue={formatValue}
          legendLabel={legendLabel}
          series={series}
          x={x}
          xLabel={xLabel}
          y={y}
          yLabel={yLabel}
        />
      )}
    </div>
  )
}
