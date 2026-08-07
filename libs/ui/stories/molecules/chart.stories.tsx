import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { expect, fn } from "storybook/test"
import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Chart, type ChartType } from "../../src/molecules/chart"

/* ── Sample data ─────────────────────────────────────────────────────────── */

type RevenuePoint = {
  month: string
  revenue: number
  channel: "Online" | "Retail" | "Wholesale"
}

const CHANNELS = ["Online", "Retail", "Wholesale"] as const
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] as const
const REVENUE: Record<(typeof CHANNELS)[number], readonly number[]> = {
  Online: [42_000, 58_000, 76_000, 64_000, 81_000, 93_000],
  Retail: [31_000, 29_000, 35_000, 41_000, 38_000, 44_000],
  Wholesale: [18_000, 22_000, 19_000, 27_000, 30_000, 26_000],
}

const revenueByChannel: RevenuePoint[] = CHANNELS.flatMap((channel) =>
  MONTHS.map((month, index) => ({
    month,
    channel,
    revenue: REVENUE[channel][index] ?? 0,
  }))
)

const onlineRevenue = revenueByChannel.filter(
  (point) => point.channel === "Online"
)

type CategorySales = { category: string; orders: number }

const ordersByCategory: CategorySales[] = [
  { category: "Skincare", orders: 412 },
  { category: "Fragrance", orders: 287 },
  { category: "Hair", orders: 190 },
  { category: "Makeup", orders: 156 },
  { category: "Wellness", orders: 84 },
]

type ProductStat = {
  name: string
  price: number
  unitsSold: number
  category: "Skincare" | "Fragrance"
}

const productStats: ProductStat[] = [
  { name: "Day cream", price: 24, unitsSold: 310, category: "Skincare" },
  { name: "Serum", price: 42, unitsSold: 260, category: "Skincare" },
  { name: "Night cream", price: 31, unitsSold: 205, category: "Skincare" },
  { name: "Cleanser", price: 18, unitsSold: 350, category: "Skincare" },
  { name: "Eau de parfum", price: 79, unitsSold: 120, category: "Fragrance" },
  { name: "Body mist", price: 27, unitsSold: 240, category: "Fragrance" },
  { name: "Roll-on oil", price: 35, unitsSold: 160, category: "Fragrance" },
  { name: "Discovery set", price: 49, unitsSold: 95, category: "Fragrance" },
]

const formatCurrency = (value: number) =>
  `${Math.round(value / 1000)}k €`

/* ── Meta ────────────────────────────────────────────────────────────────── */

const CHART_TYPES: ChartType[] = [
  "line",
  "area",
  "bar",
  "bar-horizontal",
  "scatter",
  "pie",
  "donut",
]

const meta: Meta<typeof Chart<RevenuePoint>> = {
  title: "Molecules/Chart",
  component: Chart,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: CHART_TYPES,
      description: "Which chart form to render.",
      table: { defaultValue: { summary: "line" } },
    },
    stacked: {
      control: "boolean",
      description:
        "Stack multi-series marks. Defaults to true for area, false for bars.",
    },
    points: {
      control: "boolean",
      description: "Dots on every line data point.",
      table: { defaultValue: { summary: "false" } },
    },
    smooth: {
      control: "boolean",
      description: "Monotone curve instead of straight segments.",
      table: { defaultValue: { summary: "false" } },
    },
    grid: {
      control: "boolean",
      description: "Grid lines on the value axis.",
      table: { defaultValue: { summary: "true" } },
    },
    legend: {
      control: "boolean",
      description:
        "Color legend. Defaults to on for multi-series and pie/donut charts.",
    },
    tooltip: {
      control: "boolean",
      description: "Built-in hover/focus tooltip.",
      table: { defaultValue: { summary: "true" } },
    },
    animate: {
      control: "boolean",
      description: "Animate mark transitions.",
      table: { defaultValue: { summary: "true" } },
    },
    height: { control: "number" },
    aspectRatio: { control: false },
    data: { control: false },
    x: { control: false },
    y: { control: false },
    series: { control: false },
    formatValue: { control: false },
    onSelect: { control: false },
  },
  args: {
    type: "line",
    data: revenueByChannel,
    x: "month",
    y: "revenue",
    series: "channel",
    legendLabel: "Channel",
    yLabel: "Revenue",
    formatValue: formatCurrency,
    ariaLabel: "Monthly revenue by sales channel",
  },
} satisfies Meta<typeof Chart<RevenuePoint>>

export default meta
type Story = StoryObj<typeof meta>

/* ── Stories ─────────────────────────────────────────────────────────────── */

export const Playground: Story = {
  render: (args) => (
    <div className="mx-auto w-full max-w-3xl">
      <Chart {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("svg")).toBeInTheDocument()
  },
}

/** Every value of the `type` prop, driven by the channel that fits it. */
export const Types: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Line">
        <Chart
          ariaLabel="Monthly revenue by channel, line"
          data={revenueByChannel}
          formatValue={formatCurrency}
          legendLabel="Channel"
          series="channel"
          type="line"
          x="month"
          y="revenue"
        />
      </VariantGroup>
      <VariantGroup title="Area (stacked)">
        <Chart
          ariaLabel="Monthly revenue by channel, stacked area"
          data={revenueByChannel}
          formatValue={formatCurrency}
          legendLabel="Channel"
          series="channel"
          type="area"
          x="month"
          y="revenue"
        />
      </VariantGroup>
      <VariantGroup title="Bar (grouped)">
        <Chart
          ariaLabel="Monthly revenue by channel, grouped bars"
          data={revenueByChannel}
          formatValue={formatCurrency}
          legendLabel="Channel"
          series="channel"
          type="bar"
          x="month"
          y="revenue"
        />
      </VariantGroup>
      <VariantGroup title="Horizontal bar">
        <Chart
          ariaLabel="Orders by category, horizontal bars"
          data={ordersByCategory}
          type="bar-horizontal"
          x="category"
          y="orders"
          yLabel="Orders"
        />
      </VariantGroup>
      <VariantGroup title="Scatter">
        <Chart
          ariaLabel="Units sold against price by category"
          data={productStats}
          legendLabel="Category"
          series="category"
          type="scatter"
          x="price"
          xLabel="Price (€)"
          y="unitsSold"
          yLabel="Units sold"
        />
      </VariantGroup>
      <VariantGroup title="Pie">
        <Chart
          ariaLabel="Order share by category, pie"
          data={ordersByCategory}
          legendLabel="Category"
          type="pie"
          x="category"
          y="orders"
        />
      </VariantGroup>
      <VariantGroup title="Donut">
        <Chart
          ariaLabel="Order share by category, donut"
          data={ordersByCategory}
          legendLabel="Category"
          type="donut"
          x="category"
          y="orders"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

/** One series: painted with `--color-chart-series-1`, no legend box. */
export const SingleSeries: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-3xl">
      <Chart
        ariaLabel="Monthly online revenue"
        data={onlineRevenue}
        formatValue={formatCurrency}
        points
        type="line"
        x="month"
        y="revenue"
        yLabel="Revenue"
      />
    </div>
  ),
}

/** `stacked` flips bars between side-by-side groups and stacked segments. */
export const Stacking: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Grouped bars (stacked=false)">
        <Chart
          ariaLabel="Monthly revenue by channel, grouped"
          data={revenueByChannel}
          formatValue={formatCurrency}
          legendLabel="Channel"
          series="channel"
          type="bar"
          x="month"
          y="revenue"
        />
      </VariantGroup>
      <VariantGroup title="Stacked bars (stacked=true)">
        <Chart
          ariaLabel="Monthly revenue by channel, stacked"
          data={revenueByChannel}
          formatValue={formatCurrency}
          legendLabel="Channel"
          series="channel"
          stacked
          type="bar"
          x="month"
          y="revenue"
        />
      </VariantGroup>
      <VariantGroup title="Overlapping areas (stacked=false)">
        <Chart
          ariaLabel="Monthly revenue by channel, overlapping areas"
          data={revenueByChannel}
          formatValue={formatCurrency}
          legendLabel="Channel"
          series="channel"
          smooth
          stacked={false}
          type="area"
          x="month"
          y="revenue"
        />
      </VariantGroup>
    </VariantContainer>
  ),
}

/** Selecting a mark reports the original source row through `onSelect`. */
export const Interactive: Story = {
  args: {
    onSelect: fn(),
  },
  render: function InteractiveStory(args) {
    const [selected, setSelected] = useState<RevenuePoint | null>(null)
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-100">
        <Chart
          {...args}
          onSelect={(datum) => {
            args.onSelect?.(datum)
            setSelected(datum)
          }}
          points
          type="line"
        />
        <p className="text-fg-primary text-md">
          {selected
            ? `Selected: ${selected.channel} — ${selected.month} (${formatCurrency(selected.revenue)})`
            : "Click a point to select it."}
        </p>
      </div>
    )
  },
}

type SignupPoint = { day: Date; signups: number }

const signupSeries: SignupPoint[] = [
  { day: new Date(Date.UTC(2026, 0, 1)), signups: 120 },
  { day: new Date(Date.UTC(2026, 0, 2)), signups: 140 },
  { day: new Date(Date.UTC(2026, 0, 5)), signups: 90 },
  { day: new Date(Date.UTC(2026, 0, 15)), signups: 210 },
  { day: new Date(Date.UTC(2026, 1, 1)), signups: 260 },
  { day: new Date(Date.UTC(2026, 1, 20)), signups: 240 },
]

/** Date x values ride a UTC time scale, so uneven gaps keep their spacing. */
export const TimeSeries: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-3xl">
      <Chart
        ariaLabel="Daily signups over time"
        data={signupSeries}
        points
        type="line"
        x="day"
        y="signups"
        yLabel="Signups"
      />
    </div>
  ),
}

/** Chart chrome switched off for embedding in dense dashboard tiles. */
export const Minimal: Story = {
  render: () => (
    <div className="mx-auto w-full max-w-3xl">
      <Chart
        animate={false}
        ariaLabel="Monthly online revenue, minimal"
        data={onlineRevenue}
        grid={false}
        height={200}
        smooth
        tooltip={false}
        type="area"
        x="month"
        y="revenue"
      />
    </div>
  ),
}
