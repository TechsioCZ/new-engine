import type { Meta, StoryObj } from "@storybook/react"
import { useMemo, useState } from "react"
import { ActionIcon } from "../../src/atoms/action-icon"
import { Badge } from "../../src/atoms/badge"
import { Button } from "../../src/atoms/button"
import { Icon, type IconType } from "../../src/atoms/icon"
import { Accordion } from "../../src/molecules/accordion"
import { Menu, type MenuItem } from "../../src/molecules/menu"
import { Steps } from "../../src/molecules/steps"
import { Tabs } from "../../src/molecules/tabs"
import { Toaster, useToast } from "../../src/molecules/toast"
import type { ColumnDef } from "../../src/organisms/data-table"
import { DataTable } from "../../src/organisms/data-table"
import {
  activities,
  adminNav,
  currency,
  type Customer,
  customers,
  orders,
  tierOptions,
} from "./data"
import {
  AdminShell,
  DetailList,
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
  tags: ["autodocs"],
  title: "Pages/CRM/Customer workspace",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "Master–detail: the account list stays on screen while one account is worked.",
          "This is the layout to reach for whenever a user processes many records in a",
          "row — support queues, lead pipelines, moderation — because it removes a full",
          "navigation round-trip per record.",
          "",
          "**Pattern rules**",
          "- The list keeps its filters and scroll position while the detail changes;",
          "  selecting a row never unmounts the list.",
          "- The detail pane leads with identity and the numbers that frame the",
          "  conversation, then the pipeline stage, then the history.",
          "- History is a timeline, not a table: entries are read in order and are never",
          "  sorted or filtered by column.",
          "- Secondary record actions collapse into a `Menu`; only the next best action",
          "  (`Log activity`) stays a visible button.",
          "- Below `xl` the two panes stack — the detail follows the list rather than",
          "  competing with it for width.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

const pipeline = [
  { title: "Lead", description: "Captured" },
  { title: "Qualified", description: "Fit confirmed" },
  { title: "Proposal", description: "Quote sent" },
  { title: "Won", description: "Contract signed" },
]

const activityIcons: Record<string, IconType> = {
  note: "icon-[mdi--note-text-outline]",
  email: "icon-[mdi--email-outline]",
  call: "icon-[mdi--phone-outline]",
  order: "icon-[mdi--receipt-text-outline]",
}

const recordMenu: MenuItem[] = [
  { type: "action", value: "merge", label: "Merge duplicates", icon: "icon-[mdi--merge]" },
  { type: "action", value: "assign", label: "Change owner", icon: "icon-[mdi--account-switch-outline]" },
  { type: "action", value: "export", label: "Export account", icon: "icon-[mdi--tray-arrow-down]" },
  { type: "separator", id: "record" },
  { type: "action", value: "archive", label: "Archive account", icon: "icon-[mdi--archive-outline]" },
]

function CustomerWorkspace() {
  const toaster = useToast()
  const [nav, setNav] = useState("customers")
  const [firstCustomer] = customers
  const [selectedId, setSelectedId] = useState(firstCustomer?.id ?? "")

  const selected =
    customers.find((row) => row.id === selectedId) ?? firstCustomer
  const customerActivities = activities.filter(
    (entry) => entry.customerId === selected?.id
  )
  const customerOrders = orders.filter(
    (order) => order.email === selected?.email
  )

  const columns = useMemo<ColumnDef<Customer, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Account",
        meta: { type: "string" },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span className="font-medium">{info.getValue<string>()}</span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.company}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "tier",
        header: "Tier",
        meta: { type: "enum", options: tierOptions, width: 110 },
        cell: (info) => <StatusBadge status={info.getValue<string>()} />,
      },
      {
        accessorKey: "lifetimeValue",
        header: "LTV",
        meta: { type: "number", align: "end", width: 120 },
        cell: (info) => currency.format(info.getValue<number>()),
      },
    ],
    []
  )

  if (!selected) {
    return null
  }

  return (
    <AdminShell
      nav={adminNav}
      onNavChange={setNav}
      selectedNav={nav}
    >
      <Toaster />

      <PageHeader
        actions={
          <>
            <Button
              icon="icon-[mdi--filter-variant]"
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Saved views
            </Button>
            <Button icon="icon-[mdi--plus]" size="sm" variant="primary">
              New account
            </Button>
          </>
        }
        breadcrumb={[{ label: "Home", href: "#" }, { label: "Customers" }]}
        description="Pick an account on the left; everything on the right follows the selection."
        title="Customers"
      />

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-5">
        <SectionCard className="xl:col-span-2" flush>
          <DataTable
            columns={columns}
            data={customers}
            enableGlobalFilter
            enableSorting
            getRowId={(row) => row.id}
            getRowLabel={(row) => row.original.name}
            onRowClick={(row) => setSelectedId(row.original.id)}
            size="sm"
            translations={{ searchPlaceholder: "Search accounts…" }}
          />
        </SectionCard>

        <div className="flex flex-col gap-250 xl:col-span-3">
          <SectionCard>
            <div className="flex flex-wrap items-start justify-between gap-200">
              <div className="flex items-center gap-200">
                <span className="flex size-icon-control-lg items-center justify-center rounded-full bg-overlay">
                  <Icon icon="icon-[mdi--domain]" size="md" />
                </span>
                <div className="flex flex-col gap-50">
                  <div className="flex flex-wrap items-center gap-150">
                    <h2 className="font-semibold text-md">{selected.name}</h2>
                    <StatusBadge status={selected.tier} />
                  </div>
                  <p className="text-fg-secondary text-sm">
                    {selected.company} · owned by {selected.owner}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-100">
                <Button
                  icon="icon-[mdi--plus]"
                  onClick={() =>
                    toaster.create({
                      type: "success",
                      title: "Activity logged",
                      description: `Added to ${selected.name}.`,
                    })
                  }
                  size="sm"
                  variant="primary"
                >
                  Log activity
                </Button>
                <Menu
                  aria-label="Account actions"
                  customTrigger={
                    <ActionIcon
                      aria-label="Account actions"
                      icon="icon-[mdi--dots-horizontal]"
                      size="md"
                    />
                  }
                  items={recordMenu}
                  onSelect={({ value }) =>
                    toaster.create({ type: "info", title: `Action: ${value}` })
                  }
                />
              </div>
            </div>

            <StatRow>
              <StatCard
                label="Lifetime value"
                value={currency.format(selected.lifetimeValue)}
              />
              <StatCard label="Orders" value={String(selected.orders)} />
              <StatCard label="Last activity" value={selected.lastActivity} />
            </StatRow>
          </SectionCard>

          <SectionCard
            description="Where this account sits today. Moving a stage is an explicit action, never a side effect of editing a field."
            title="Pipeline"
          >
            <Steps count={pipeline.length} size="sm" step={2} variant="solid">
              <Steps.List>
                {pipeline.map((stage, index) => (
                  <Steps.Item index={index} key={stage.title}>
                    <Steps.Trigger>
                      <Steps.Indicator />
                      <Steps.ItemText>
                        <Steps.Title>{stage.title}</Steps.Title>
                        <Steps.Description>
                          {stage.description}
                        </Steps.Description>
                      </Steps.ItemText>
                    </Steps.Trigger>
                    <Steps.Separator />
                  </Steps.Item>
                ))}
              </Steps.List>
            </Steps>
          </SectionCard>

          <SectionCard flush>
            <Tabs defaultValue="activity" variant="line">
              <Tabs.List className="px-250 pt-250">
                <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
                <Tabs.Trigger value="orders">
                  Orders
                  <Badge size="sm" variant="outline">
                    {String(customerOrders.length)}
                  </Badge>
                </Tabs.Trigger>
                <Tabs.Trigger value="details">Details</Tabs.Trigger>
                <Tabs.Indicator />
              </Tabs.List>

              <Tabs.Content className="flex flex-col gap-200 p-250" value="activity">
                {customerActivities.length === 0 ? (
                  <p className="text-fg-secondary text-sm">
                    Nothing logged for this account yet.
                  </p>
                ) : (
                  <ol className="flex flex-col gap-200">
                    {customerActivities.map((entry) => (
                      <li className="flex gap-150" key={entry.id}>
                        <span className="mt-50 flex size-icon-control-sm shrink-0 items-center justify-center rounded-full bg-overlay text-fg-secondary">
                          <Icon icon={activityIcons[entry.kind] ?? "icon-[mdi--note-text-outline]"} size="sm" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-50">
                          <div className="flex flex-wrap items-baseline gap-150">
                            <span className="font-medium text-sm">
                              {entry.title}
                            </span>
                            <span className="text-fg-secondary text-xs">
                              {entry.at}
                            </span>
                          </div>
                          <p className="text-fg-secondary text-sm">
                            {entry.detail}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Tabs.Content>

              <Tabs.Content className="flex flex-col gap-150 p-250" value="orders">
                {customerOrders.length === 0 ? (
                  <p className="text-fg-secondary text-sm">
                    This account has not ordered yet.
                  </p>
                ) : (
                  customerOrders.map((order) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-150 rounded-md border border-border-primary p-150"
                      key={order.id}
                    >
                      <span className="font-medium text-sm">{order.number}</span>
                      <span className="text-fg-secondary text-sm">
                        {order.placedAt} · {order.items} items
                      </span>
                      <StatusBadge status={order.status} />
                      <span className="text-sm">
                        {currency.format(order.total)}
                      </span>
                    </div>
                  ))
                )}
              </Tabs.Content>

              <Tabs.Content className="p-250" value="details">
                <Accordion collapsible defaultValue={["contact"]} multiple>
                  <Accordion.Item value="contact">
                    <Accordion.Header>
                      <Accordion.Title>Contact</Accordion.Title>
                      <Accordion.Indicator />
                    </Accordion.Header>
                    <Accordion.Content>
                      <DetailList
                        items={[
                          { term: "Email", value: selected.email },
                          { term: "Phone", value: selected.phone },
                          { term: "Company", value: selected.company },
                          { term: "Account owner", value: selected.owner },
                        ]}
                      />
                    </Accordion.Content>
                  </Accordion.Item>
                  <Accordion.Item value="commercial">
                    <Accordion.Header>
                      <Accordion.Title>Commercial terms</Accordion.Title>
                      <Accordion.Indicator />
                    </Accordion.Header>
                    <Accordion.Content>
                      <DetailList
                        items={[
                          { term: "Payment terms", value: "NET-14" },
                          { term: "Currency", value: "EUR" },
                          { term: "Discount tier", value: "Standard" },
                          { term: "Tax exempt", value: "No" },
                        ]}
                      />
                    </Accordion.Content>
                  </Accordion.Item>
                </Accordion>
              </Tabs.Content>
            </Tabs>
          </SectionCard>
        </div>
      </div>
    </AdminShell>
  )
}

export const Default: Story = {
  name: "Master–detail",
  render: () => <CustomerWorkspace />,
}
