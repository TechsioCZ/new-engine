import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Button } from "../../../src/atoms/button"
import { Skeleton } from "../../../src/atoms/skeleton"
import { Chart } from "../../../src/molecules/chart"
import { Tabs } from "../../../src/molecules/tabs"
import { Table } from "../../../src/organisms/table"
import { SelectTemplate } from "../../../src/templates/select"
import { PageHeader, SectionCard, StatCard, StatRow } from "../shell"
import {
  akOrders,
  count,
  customerMix,
  czk,
  ordersByDay,
  revenueByDay,
  trafficSources,
  visitsByDay,
} from "./data"
import {
  AkrosShell,
  akrosDocs,
  Notice,
  OrderStateBadge,
  PaymentCell,
} from "./shared"

const meta: Meta = {
  globals: { brand: "akros", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Home — statistics",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "The Akros back-office home. Covers the brief's **Homepage — statistics**:",
          "orders, visits / traffic, one main statistics chart and customer statistics.",
          "",
          "**How it is built** — `AdminShell`, `PageHeader`, `StatCard`, `Chart`,",
          "`Tabs`, `Table`, `SelectTemplate`, `Skeleton`, `Button`. No custom widgets.",
          "",
          "**Pattern rules**",
          "- Alerts first: unpaid Comgate orders and failed ABRA transfers are the two",
          "  things that get worse if nobody acts today, so they lead the page.",
          "- The main chart answers one question at a time. Revenue, orders and visits",
          "  are three scales, so they are three tabs of one chart, never dual axes.",
          "- Customer statistics are a share (B2C new / returning / B2B) and use a donut;",
          "  traffic sources are a ranking and use horizontal bars.",
          "- The period select scopes every widget on the page at once.",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

const periods = [
  { label: "Last 14 days", value: "14d" },
  { label: "Last 30 days", value: "30d" },
  { label: "This month", value: "month" },
  { label: "This year", value: "year" },
]

const unpaidOnline = akOrders.filter(
  (order) =>
    order.paymentMethod === "comgate" &&
    (order.payment === "unpaid" || order.payment === "failed")
)
const abraFailed = akOrders.filter((order) => order.abra === "error")

function HomePage({ loading }: { loading?: boolean }) {
  const [period, setPeriod] = useState("14d")

  return (
    <AkrosShell selected="home">
      <PageHeader
        actions={
          <SelectTemplate
            items={periods}
            label="Period"
            onValueChange={(details) => {
              const [next] = details.value
              if (next) {
                setPeriod(next)
              }
            }}
            size="sm"
            value={[period]}
          />
        }
        description="Monday 14 September 2026 · every figure below follows the selected period."
        title="Overview"
      />

      <SectionCard
        description="Work that gets more expensive the longer it waits."
        title="Needs attention"
      >
        <div className="flex flex-col gap-150">
          <Notice
            action={
              <Button size="sm" theme="outlined" variant="secondary">
                Open unpaid orders
              </Button>
            }
            title={`${unpaidOnline.length} Comgate orders are not paid`}
            tone="danger"
          >
            The customer left the gateway or the payment failed. Remind them,
            switch the payment method or cancel.
          </Notice>
          <Notice
            action={
              <Button size="sm" theme="outlined" variant="secondary">
                Review transfers
              </Button>
            }
            title={`${abraFailed.length} order could not be transferred to ABRA`}
            tone="warning"
          >
            ABRA rejected the document. Fix the order data and send it again.
          </Notice>
        </div>
      </SectionCard>

      <StatRow>
        <StatCard
          delta="+8.2%"
          hint="vs. previous period"
          icon="icon-[mdi--receipt-text-outline]"
          label="Orders"
          trend="up"
          value={count.format(840)}
        />
        <StatCard
          delta="+11.5%"
          hint="Net of VAT, without shipping"
          icon="icon-[mdi--cash-multiple]"
          label="Revenue"
          trend="up"
          value={czk.format(2_513_000)}
        />
        <StatCard
          delta="+4.0%"
          hint="Unique sessions"
          icon="icon-[mdi--eye-outline]"
          label="Visits"
          trend="up"
          value={count.format(30_290)}
        />
        <StatCard
          delta="−0.2 pp"
          hint="Visits that reached a placed order"
          icon="icon-[mdi--cart-percent]"
          label="Conversion"
          trend="down"
          value="2.77 %"
        />
      </StatRow>

      <SectionCard
        description="One measure at a time — switch the tab to change the question."
        flush
        title="Main statistics"
      >
        <Tabs defaultValue="revenue" variant="line">
          <Tabs.List className="px-250">
            <Tabs.Trigger value="revenue">Revenue</Tabs.Trigger>
            <Tabs.Trigger value="orders">Orders</Tabs.Trigger>
            <Tabs.Trigger value="visits">Visits</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>
          <Tabs.Content className="p-250" value="revenue">
            {loading ? (
              <Skeleton isLoaded={false}>
                <Skeleton.Rectangle />
              </Skeleton>
            ) : (
              <Chart
                ariaLabel="Daily revenue split into B2B and B2C"
                data={revenueByDay}
                formatValue={(value) => `${value}k Kč`}
                height={280}
                legendLabel="Segment"
                series="metric"
                type="bar"
                stacked
                x="day"
                y="value"
                yLabel="Revenue"
              />
            )}
          </Tabs.Content>
          <Tabs.Content className="p-250" value="orders">
            <Chart
              ariaLabel="Orders placed per day"
              data={ordersByDay}
              height={280}
              points
              type="line"
              x="day"
              y="value"
              yLabel="Orders"
            />
          </Tabs.Content>
          <Tabs.Content className="p-250" value="visits">
            <Chart
              ariaLabel="Visits per day"
              data={visitsByDay}
              formatValue={(value) => count.format(Number(value))}
              height={280}
              type="area"
              x="day"
              y="value"
              yLabel="Visits"
            />
          </Tabs.Content>
        </Tabs>
      </SectionCard>

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-2">
        <SectionCard
          description="Where the period's visits came from."
          title="Traffic sources"
        >
          <Chart
            ariaLabel="Visits by traffic source"
            data={trafficSources}
            formatValue={(value) => count.format(Number(value))}
            height={240}
            type="bar-horizontal"
            x="source"
            y="visits"
          />
        </SectionCard>

        <SectionCard
          actions={
            <Button size="sm" theme="borderless" variant="secondary">
              Customers
            </Button>
          }
          description="Customers who ordered in the period."
          title="Customer statistics"
        >
          <Chart
            ariaLabel="Ordering customers by segment"
            data={customerMix}
            height={200}
            legendLabel="Segment"
            type="donut"
            x="segment"
            y="customers"
          />
          <StatRow>
            <StatCard label="New registrations" value="214" />
            <StatCard label="Repeat purchase rate" value="41 %" />
            <StatCard label="New B2B accounts" value="9" />
          </StatRow>
        </SectionCard>
      </div>

      <SectionCard
        actions={
          <Button size="sm" theme="borderless" variant="secondary">
            All orders
          </Button>
        }
        flush
        title="Latest orders"
      >
        <Table size="sm" variant="line">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Order</Table.ColumnHeader>
              <Table.ColumnHeader>Customer</Table.ColumnHeader>
              <Table.ColumnHeader>State</Table.ColumnHeader>
              <Table.ColumnHeader>Payment</Table.ColumnHeader>
              <Table.ColumnHeader align="end">Total</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {akOrders.slice(0, 5).map((order) => (
              <Table.Row key={order.id}>
                <Table.Cell>
                  <span className="flex flex-col gap-50">
                    <span className="font-medium">{order.number}</span>
                    <span className="text-fg-secondary text-xs">
                      {order.placedAt}
                    </span>
                  </span>
                </Table.Cell>
                <Table.Cell>{order.company ?? order.customer}</Table.Cell>
                <Table.Cell>
                  <OrderStateBadge state={order.state} />
                </Table.Cell>
                <Table.Cell>
                  <PaymentCell
                    method={order.paymentMethod}
                    state={order.payment}
                  />
                </Table.Cell>
                <Table.Cell align="end">{czk.format(order.total)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </SectionCard>
    </AkrosShell>
  )
}

export const Default: Story = {
  render: () => <HomePage />,
}

export const Loading: Story = {
  name: "Main chart loading",
  parameters: {
    docs: {
      description: {
        story:
          "The alert strip and the KPI tiles come from cheap queries and render at once; only the main chart waits, holding its own shape with `Skeleton`.",
      },
    },
  },
  render: () => <HomePage loading />,
}
