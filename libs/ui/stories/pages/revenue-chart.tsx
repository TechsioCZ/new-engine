import { Chart } from "../../src/molecules/chart"
import { revenueByChannel } from "./data"

const channels = [
  { name: "Web", color: "bg-chart-series-1" },
  { name: "Mobile app", color: "bg-chart-series-2" },
  { name: "Marketplace", color: "bg-chart-series-3" },
]

/** A compact, wrapping legend leaves the chart height available for data. */
export function RevenueChart({ height = 220 }: { height?: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-150">
      <ul aria-label="Sales channels" className="flex flex-wrap gap-200">
        {channels.map(({ name, color }) => (
          <li className="flex items-center gap-100 text-sm" key={name}>
            <span
              aria-hidden="true"
              className={`size-100 rounded-full ${color}`}
            />
            {name}
          </li>
        ))}
      </ul>
      <Chart
        ariaLabel="Monthly revenue by sales channel, April to September"
        data={revenueByChannel}
        formatValue={(value) => (value === 0 ? "€0" : `€${value / 1000}k`)}
        height={height}
        legend={false}
        series="channel"
        type="area"
        x="month"
        y="revenue"
      />
    </div>
  )
}
