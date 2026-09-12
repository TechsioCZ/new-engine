import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon } from "../../src/atoms/icon"
import { Skeleton } from "../../src/atoms/skeleton"
import { Chart } from "../../src/molecules/chart"
import { Popover } from "../../src/molecules/popover"
import { Tabs } from "../../src/molecules/tabs"
import { Table } from "../../src/organisms/table"
import { adminNav, currency, orders, products, revenueByChannel } from "./data"
import { Brand, Frame, GlobalSearch, NavList, Panel, TopBar } from "./frame"
import {
  PageHeader,
  SectionCard,
  StatCard,
  StatRow,
  StatusBadge,
} from "./shell"

const meta: Meta = {
  /*
   * Business is the brand these back-office pages are designed against: it is the
   * light-only, high-contrast blue scale. Set at meta level so every page opens in
   * it; the Brand toolbar still switches the whole set to Default or Neo.
   */
  globals: { brand: "business", mode: "light" },
  title: "Pages/E-commerce/Dashboard home",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "The landing screen of an operations tool. A dashboard answers one question —",
          "*does anything need me today?* — and then routes to the screen where the work",
          "actually happens.",
          "",
          "**Pattern rules**",
          "- Widgets are ordered by urgency, not by data source: alerts, then today's",
          "  numbers, then trends, then reference lists.",
          "- Every widget ends in a way out (`View all`), because a dashboard is a routing",
          "  surface, not a destination.",
          "- One chart per question. Two measures on different scales are two charts.",
          "- Loading uses `Skeleton` in the widget's own shape, so the grid does not",
          "  reflow when the slowest widget lands.",
          "- Definitions that need explaining live in a `Popover` on the metric, never in",
          "  a footnote nobody reads.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

const lowStock = products.filter((product) => product.stock < 60)

function MetricHelp({ title, body }: { title: string; body: string }) {
  return (
    <Popover placement="bottom-start" size="sm">
      <Popover.Trigger>
        <Icon icon="icon-[mdi--information-outline]" size="sm" />
      </Popover.Trigger>
      <Popover.Positioner>
        <Popover.Content>
          <Popover.Arrow />
          <Popover.Title>{title}</Popover.Title>
          <Popover.Description>{body}</Popover.Description>
        </Popover.Content>
      </Popover.Positioner>
    </Popover>
  )
}

function DashboardPage({ loading }: { loading?: boolean }) {
  const [nav, setNav] = useState("dashboard")

  return (
    <Frame
      left={
        <Panel label="Main navigation" side="start">
          <Brand />
          <NavList nav={adminNav} onSelect={setNav} selected={nav} />
        </Panel>
      }
      top={<TopBar center={<GlobalSearch />} />}
    >
      <PageHeader
        actions={
          <>
            <Button icon="icon-[mdi--calendar-range]" size="sm" theme="outlined" variant="secondary">
              Last 30 days
            </Button>
            <Button icon="icon-[mdi--plus]" size="sm" variant="primary">
              New order
            </Button>
          </>
        }
        description="Tuesday, 12 September 2026 · everything below is scoped to the last 30 days."
        meta={
          <Badge size="sm" variant="warning">
            3 alerts
          </Badge>
        }
        title="Good morning, Nora"
      />

      <SectionCard
        actions={
          <Button size="sm" theme="borderless" variant="secondary">
            View all
          </Button>
        }
        description="Things that will get worse if nobody touches them today."
        title="Needs attention"
      >
        <div className="flex flex-col gap-150">
          <div className="flex flex-wrap items-center gap-150 rounded-md border border-border-primary p-150">
            <Icon className="text-danger" icon="icon-[mdi--alert-circle-outline]" size="md" />
            <span className="flex-1 text-sm">
              12 marketplace SKUs rejected by the feed since 9 September
            </span>
            <Button size="sm" theme="outlined" variant="secondary">
              Inspect feed
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-150 rounded-md border border-border-primary p-150">
            <Icon className="text-warning" icon="icon-[mdi--clock-alert-outline]" size="md" />
            <span className="flex-1 text-sm">
              17 paid orders have been awaiting fulfilment for over 24 hours
            </span>
            <Button size="sm" theme="outlined" variant="secondary">
              Open queue
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-150 rounded-md border border-border-primary p-150">
            <Icon className="text-warning" icon="icon-[mdi--package-variant-closed-remove]" size="md" />
            <span className="flex-1 text-sm">
              {`${lowStock.length} products are below their reorder point`}
            </span>
            <Button size="sm" theme="outlined" variant="secondary">
              Review stock
            </Button>
          </div>
        </div>
      </SectionCard>

      <StatRow>
        <StatCard
          delta="+12.4%"
          hint="vs. previous 30 days"
          icon="icon-[mdi--cash-multiple]"
          label="Revenue"
          trend="up"
          value={currency.format(327_400)}
        />
        <StatCard
          delta="+3.1%"
          hint="vs. previous 30 days"
          icon="icon-[mdi--receipt-text-outline]"
          label="Orders"
          trend="up"
          value="2 418"
        />
        <StatCard
          delta="+1.9%"
          hint="Revenue ÷ orders"
          icon="icon-[mdi--calculator-variant-outline]"
          label="Average order"
          trend="up"
          value={currency.format(135)}
        />
        <StatCard
          delta="−1.8%"
          hint="Sessions that reached a paid order"
          icon="icon-[mdi--cart-percent]"
          label="Conversion"
          trend="down"
          value="3.42%"
        />
      </StatRow>

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          actions={
            <MetricHelp
              body="Net of refunds and cancelled orders, excluding shipping and tax."
              title="How revenue is counted"
            />
          }
          description="Stacked by channel — one measure, one scale."
          title="Revenue trend"
        >
          {loading ? (
            <Skeleton isLoaded={false}>
              <Skeleton.Rectangle />
            </Skeleton>
          ) : (
            <Chart
              ariaLabel="Monthly revenue by sales channel"
              data={revenueByChannel}
              formatValue={(value) => `${Number(value) / 1000}k €`}
              height={260}
              legendLabel="Channel"
              series="channel"
              type="area"
              x="month"
              y="revenue"
            />
          )}
        </SectionCard>

        <SectionCard
          actions={
            <Button size="sm" theme="borderless" variant="secondary">
              View all
            </Button>
          }
          title="Latest orders"
        >
          {loading ? (
            <Skeleton isLoaded={false}>
              <Skeleton.Text noOfLines={6} />
            </Skeleton>
          ) : (
            <ul className="flex flex-col gap-150">
              {orders.slice(0, 5).map((order) => (
                <li className="flex items-center justify-between gap-150" key={order.id}>
                  <span className="flex min-w-0 flex-col gap-50">
                    <span className="truncate text-sm">{order.customer}</span>
                    <span className="text-fg-secondary text-xs">
                      {order.number} · {order.placedAt}
                    </span>
                  </span>
                  <StatusBadge status={order.status} />
                  <span className="text-sm">{currency.format(order.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        description="Two questions that share a shape, so they share a widget."
        title="Catalogue"
      >
        <Tabs defaultValue="low-stock" variant="line">
          <Tabs.List>
            <Tabs.Trigger value="low-stock">Low stock</Tabs.Trigger>
            <Tabs.Trigger value="best-sellers">Best sellers</Tabs.Trigger>
            <Tabs.Indicator />
          </Tabs.List>

          <Tabs.Content className="pt-200" value="low-stock">
            <Table size="sm" variant="line">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Product</Table.ColumnHeader>
                  <Table.ColumnHeader>SKU</Table.ColumnHeader>
                  <Table.ColumnHeader align="end">Stock</Table.ColumnHeader>
                  <Table.ColumnHeader align="end">Price</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {lowStock.map((product) => (
                  <Table.Row key={product.id}>
                    <Table.Cell>{product.name}</Table.Cell>
                    <Table.Cell>{product.sku}</Table.Cell>
                    <Table.Cell align="end">
                      {product.stock === 0 ? (
                        <Badge size="sm" variant="danger">
                          Out of stock
                        </Badge>
                      ) : (
                        product.stock
                      )}
                    </Table.Cell>
                    <Table.Cell align="end">
                      {currency.format(product.price)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Tabs.Content>

          <Tabs.Content className="pt-200" value="best-sellers">
            <Table size="sm" variant="line">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Product</Table.ColumnHeader>
                  <Table.ColumnHeader>Category</Table.ColumnHeader>
                  <Table.ColumnHeader align="end">Units</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {products.slice(0, 5).map((product, index) => (
                  <Table.Row key={product.id}>
                    <Table.Cell>{product.name}</Table.Cell>
                    <Table.Cell>{product.category}</Table.Cell>
                    <Table.Cell align="end">{420 - index * 57}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Tabs.Content>
        </Tabs>
      </SectionCard>
    </Frame>
  )
}

export const Default: Story = {
  render: () => <DashboardPage />,
}

export const Loading: Story = {
  name: "Widgets loading",
  parameters: {
    docs: {
      description: {
        story:
          "Each widget carries its own skeleton in its own shape. The alert strip and the KPI row render immediately because they come from a cheap query — a dashboard should never wait for its slowest panel.",
      },
    },
  },
  render: () => <DashboardPage loading />,
}
