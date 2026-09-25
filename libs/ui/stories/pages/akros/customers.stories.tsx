import type { Meta, StoryObj } from "@storybook/react"
import { useMemo, useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { Icon } from "../../../src/atoms/icon"
import { Dialog } from "../../../src/molecules/dialog"
import { FormInput } from "../../../src/molecules/form-input"
import { RadioCard } from "../../../src/molecules/radio-card"
import { Tabs } from "../../../src/molecules/tabs"
import { Toaster, useToast } from "../../../src/molecules/toast"
import type { ColumnDef } from "../../../src/organisms/data-table"
import { DataTable } from "../../../src/organisms/data-table"
import { SelectTemplate } from "../../../src/templates/select"
import {
  DetailList,
  PageHeader,
  SectionCard,
  StatCard,
  StatRow,
} from "../shell"
import {
  type AkCustomer,
  akCarts,
  akCustomers,
  akOrders,
  customerTypeOptions,
  czk,
} from "./data"
import {
  AkrosShell,
  akrosDocs,
  Notice,
  OrderStateBadge,
  PaymentBadge,
} from "./shared"

const meta: Meta = {
  globals: { brand: "akros", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Customers",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "Covers the brief's **Customers**: search customers, see their accounts and",
          "details, find potential duplicates, review customer history and statistics,",
          "and change the customer type — including moving an account from B2C to B2B.",
          "",
          "**How it is built** — `DataTable`, `Tabs`, `StatCard`, `DetailList`,",
          "`Dialog`, `FormInput`, `SelectTemplate`, `RadioCard`, `Toast`.",
          "",
          "**Pattern rules**",
          "- Master–detail: the searchable list stays on screen while one account is",
          "  worked, because support handles customers one after another.",
          "- A possible duplicate is flagged *on the account itself*, not only in a",
          "  separate report, so it is noticed during normal work.",
          "- Moving to B2B changes prices and payment options, so it is a guided",
          "  `Dialog` that asks for the company data B2B needs (IČO, DIČ, price list)",
          "  rather than a type dropdown in the edit form.",
          "- Merging duplicates picks the surviving record explicitly with `RadioCard`",
          "  — orders, carts and history move to it; nothing is silently discarded.",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

const priceLists = [
  { label: "B2B — tier 1", value: "B2B — tier 1" },
  { label: "B2B — tier 2", value: "B2B — tier 2" },
  { label: "B2B — tier 3", value: "B2B — tier 3" },
]

function duplicatesOf(customer: AkCustomer, all: AkCustomer[]) {
  if (!customer.duplicateGroup) {
    return []
  }
  return all.filter(
    (entry) =>
      entry.duplicateGroup === customer.duplicateGroup &&
      entry.id !== customer.id
  )
}

function CustomersPage({ initialId = "c-2081" }: { initialId?: string }) {
  const toaster = useToast()
  const [customers, setCustomers] = useState(akCustomers)
  const [selectedId, setSelectedId] = useState(initialId)
  const [upgrading, setUpgrading] = useState(false)
  const [company, setCompany] = useState("")
  const [ico, setIco] = useState("")
  const [priceList, setPriceList] = useState("B2B — tier 3")

  const selected =
    customers.find((entry) => entry.id === selectedId) ?? customers[0]
  const duplicates = selected ? duplicatesOf(selected, customers) : []
  const history = akOrders.filter((order) => order.email === selected?.email)
  const carts = akCarts.filter(
    (cart) =>
      cart.customer === selected?.name || cart.customer === selected?.company
  )

  const columns = useMemo<ColumnDef<AkCustomer, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Customer",
        meta: { type: "string" },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span className="flex items-center gap-100 font-medium">
              {info.row.original.company ?? info.getValue<string>()}
              {info.row.original.duplicateGroup && (
                <Badge size="sm" variant="warning">
                  Possible duplicate
                </Badge>
              )}
            </span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.email}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        meta: { type: "enum", options: customerTypeOptions, width: 100 },
        cell: (info) => (
          <Badge
            size="sm"
            variant={info.getValue<string>() === "B2B" ? "info" : "secondary"}
          >
            {info.getValue<string>()}
          </Badge>
        ),
      },
      {
        accessorKey: "revenue",
        header: "Revenue",
        meta: { type: "number", align: "end", width: 130 },
        cell: (info) => czk.format(info.getValue<number>()),
      },
    ],
    []
  )

  if (!selected) {
    return null
  }

  const upgrade = () => {
    setCustomers((current) =>
      current.map((entry) =>
        entry.id === selected.id
          ? {
              ...entry,
              type: "B2B",
              company,
              ico,
              dic: `CZ${ico}`,
              priceList,
            }
          : entry
      )
    )
    setUpgrading(false)
    toaster.create({
      type: "success",
      title: `${company} is now a B2B account`,
      description: `Price list ${priceList}. Invoice payment is available from the next order.`,
    })
  }

  return (
    <AkrosShell expanded={["customers-group"]} selected="customers">
      <Toaster />

      <PageHeader
        actions={
          <Button
            icon="icon-[mdi--account-plus-outline]"
            size="sm"
            variant="primary"
          >
            New customer
          </Button>
        }
        breadcrumb={[{ label: "Home", href: "#" }, { label: "Customers" }]}
        description="Search by name, email, phone, IČO or company."
        title="Customers"
      />

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-5">
        <SectionCard className="xl:col-span-2" flush>
          <DataTable
            columns={columns}
            data={customers}
            enableColumnFilters
            enableGlobalFilter
            enableSorting
            getRowId={(row) => row.id}
            getRowLabel={(row) => row.original.company ?? row.original.name}
            onRowClick={(row) => setSelectedId(row.original.id)}
            size="sm"
            translations={{ searchPlaceholder: "Name, email, phone, IČO…" }}
          />
        </SectionCard>

        <div className="flex flex-col gap-250 xl:col-span-3">
          {duplicates.length > 0 && (
            <Notice
              action={
                <Button size="sm" theme="outlined" variant="secondary">
                  Review duplicates
                </Button>
              }
              title={`Looks like ${duplicates.length} other account belongs to the same person`}
              tone="warning"
            >
              Same phone number {selected.phone} on{" "}
              {duplicates.map((entry) => entry.email).join(", ")}.
            </Notice>
          )}

          <SectionCard
            actions={
              selected.type === "B2C" ? (
                <Button
                  icon="icon-[mdi--domain]"
                  onClick={() => {
                    setCompany("")
                    setIco("")
                    setUpgrading(true)
                  }}
                  size="sm"
                  theme="outlined"
                  variant="secondary"
                >
                  Move to B2B
                </Button>
              ) : undefined
            }
            description={`Customer since ${selected.registeredAt} · ${selected.city}`}
            title={
              <span className="flex flex-wrap items-center gap-150">
                {selected.company ?? selected.name}
                <Badge
                  size="sm"
                  variant={selected.type === "B2B" ? "info" : "secondary"}
                >
                  {selected.type}
                </Badge>
              </span>
            }
          >
            <StatRow>
              <StatCard label="Orders" value={String(selected.orders)} />
              <StatCard label="Revenue" value={czk.format(selected.revenue)} />
              <StatCard
                label="Average order"
                value={czk.format(
                  Math.round(selected.revenue / selected.orders)
                )}
              />
              <StatCard label="Last order" value={selected.lastOrder} />
            </StatRow>
          </SectionCard>

          <SectionCard flush>
            <Tabs defaultValue="account" variant="line">
              <Tabs.List className="px-250 pt-250">
                <Tabs.Trigger value="account">Account</Tabs.Trigger>
                <Tabs.Trigger value="orders">
                  Orders
                  <Badge size="sm" variant="outline">
                    {String(history.length)}
                  </Badge>
                </Tabs.Trigger>
                <Tabs.Trigger value="carts">
                  Carts
                  <Badge size="sm" variant="outline">
                    {String(carts.length)}
                  </Badge>
                </Tabs.Trigger>
                <Tabs.Indicator />
              </Tabs.List>

              <Tabs.Content
                className="flex flex-col gap-200 p-250"
                value="account"
              >
                <DetailList
                  items={[
                    { term: "Name", value: selected.name },
                    { term: "Email", value: selected.email },
                    { term: "Phone", value: selected.phone },
                    { term: "City", value: selected.city },
                    { term: "Company", value: selected.company ?? "—" },
                    {
                      term: "IČO / DIČ",
                      value: selected.ico
                        ? `${selected.ico} / ${selected.dic}`
                        : "—",
                    },
                    { term: "Price list", value: selected.priceList },
                    { term: "Customer ID", value: selected.id },
                  ]}
                />
              </Tabs.Content>

              <Tabs.Content
                className="flex flex-col gap-150 p-250"
                value="orders"
              >
                {history.length === 0 ? (
                  <p className="text-fg-secondary text-sm">No orders yet.</p>
                ) : (
                  history.map((order) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-150 rounded-md border border-border-primary p-150"
                      key={order.id}
                    >
                      <span className="flex flex-col gap-50">
                        <span className="font-medium text-sm">
                          {order.number}
                        </span>
                        <span className="text-fg-secondary text-xs">
                          {order.placedAt}
                        </span>
                      </span>
                      <OrderStateBadge state={order.state} />
                      <PaymentBadge state={order.payment} />
                      <span className="text-sm">{czk.format(order.total)}</span>
                    </div>
                  ))
                )}
              </Tabs.Content>

              <Tabs.Content
                className="flex flex-col gap-150 p-250"
                value="carts"
              >
                {carts.length === 0 ? (
                  <p className="text-fg-secondary text-sm">No saved carts.</p>
                ) : (
                  carts.map((cart) => (
                    <div
                      className="flex flex-wrap items-center justify-between gap-150 rounded-md border border-border-primary p-150"
                      key={cart.id}
                    >
                      <span className="flex items-center gap-100 text-sm">
                        <Icon icon="icon-[mdi--cart-outline]" size="sm" />
                        {cart.name}
                      </span>
                      <span className="text-fg-secondary text-sm">
                        {cart.items} items · {czk.format(cart.total)}
                      </span>
                    </div>
                  ))
                )}
              </Tabs.Content>
            </Tabs>
          </SectionCard>
        </div>
      </div>

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setUpgrading(false)}
              theme="outlined"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              disabled={company.length === 0 || ico.length !== 8}
              onClick={upgrade}
              variant="primary"
            >
              Move to B2B
            </Button>
          </>
        }
        customTrigger
        description={`${selected.name} keeps their login, orders and carts. Prices switch to the B2B price list and invoice payment becomes available.`}
        onOpenChange={(details) => setUpgrading(details.open)}
        open={upgrading}
        size="md"
        title="Move customer to B2B"
      >
        <div className="flex flex-col gap-200">
          <FormInput
            id="b2b-company"
            label="Company name"
            onChange={(event) => setCompany(event.target.value)}
            required
            value={company}
          />
          <FormInput
            helpText="8 digits. DIČ is derived as CZ + IČO; edit it later if it differs."
            id="b2b-ico"
            label="IČO"
            onChange={(event) => setIco(event.target.value.replace(/\D/g, ""))}
            required
            validateStatus={
              ico.length > 0 && ico.length !== 8 ? "error" : "default"
            }
            value={ico}
          />
          <SelectTemplate
            items={priceLists}
            label="Price list"
            onValueChange={(details) => {
              const [next] = details.value
              if (next) {
                setPriceList(next)
              }
            }}
            value={[priceList]}
          />
        </div>
      </Dialog>
    </AkrosShell>
  )
}

function DuplicatesPage() {
  const toaster = useToast()
  const [groups, setGroups] = useState(() => {
    const map = new Map<string, AkCustomer[]>()
    for (const customer of akCustomers) {
      if (customer.duplicateGroup) {
        map.set(customer.duplicateGroup, [
          ...(map.get(customer.duplicateGroup) ?? []),
          customer,
        ])
      }
    }
    return [...map.entries()]
  })
  const [keep, setKeep] = useState<Record<string, string>>({})

  return (
    <AkrosShell expanded={["customers-group"]} selected="customers-duplicates">
      <Toaster />

      <PageHeader
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Customers", href: "#" },
          { label: "Possible duplicates" },
        ]}
        description="Accounts that share a phone number, an IČO or a name + address. Merging moves orders, carts and history to the account you keep."
        meta={
          <Badge size="sm" variant="warning">
            {`${groups.length} groups`}
          </Badge>
        }
        title="Possible duplicates"
      />

      {groups.length === 0 && (
        <SectionCard>
          <p className="p-250 text-center text-fg-secondary text-sm">
            No possible duplicates left to review.
          </p>
        </SectionCard>
      )}

      {groups.map(([group, members]) => {
        const kept = keep[group] ?? members[0]?.id ?? ""
        return (
          <SectionCard
            actions={
              <>
                <Button
                  onClick={() => {
                    setGroups((current) =>
                      current.filter(([id]) => id !== group)
                    )
                    toaster.create({
                      type: "info",
                      title: "Marked as different customers",
                    })
                  }}
                  size="sm"
                  theme="borderless"
                  variant="secondary"
                >
                  Not a duplicate
                </Button>
                <Button
                  icon="icon-[mdi--merge]"
                  onClick={() => {
                    setGroups((current) =>
                      current.filter(([id]) => id !== group)
                    )
                    toaster.create({
                      type: "success",
                      title: "Accounts merged",
                      description: `Kept ${kept}; orders and carts moved.`,
                    })
                  }}
                  size="sm"
                  variant="primary"
                >
                  Merge
                </Button>
              </>
            }
            description={`Matched on phone ${members[0]?.phone}`}
            key={group}
            title={members[0]?.name}
          >
            <RadioCard
              name={`keep-${group}`}
              onValueChange={(value) => {
                if (value) {
                  setKeep((current) => ({ ...current, [group]: value }))
                }
              }}
              value={kept}
              variant="outline"
            >
              <RadioCard.Label>Account to keep</RadioCard.Label>
              {members.map((member) => (
                <RadioCard.Item key={member.id} value={member.id}>
                  <RadioCard.ItemHiddenInput />
                  <RadioCard.ItemControl>
                    <RadioCard.ItemContent>
                      <RadioCard.ItemText>
                        {member.company ?? member.name} · {member.type}
                      </RadioCard.ItemText>
                      <RadioCard.ItemDescription>
                        {member.email} · {member.orders} orders ·{" "}
                        {czk.format(member.revenue)} · since{" "}
                        {member.registeredAt}
                      </RadioCard.ItemDescription>
                    </RadioCard.ItemContent>
                    <RadioCard.ItemIndicator />
                  </RadioCard.ItemControl>
                </RadioCard.Item>
              ))}
            </RadioCard>
          </SectionCard>
        )
      })}
    </AkrosShell>
  )
}

export const Default: Story = {
  name: "Search & account detail",
  render: () => <CustomersPage />,
}

export const MoveToB2B: Story = {
  name: "Move B2C customer to B2B",
  parameters: {
    docs: {
      description: {
        story:
          "Radek Fiala orders privately and through his company. Press **Move to B2B**: the dialog asks for company name, IČO (validated to 8 digits) and the B2B price list.",
      },
    },
  },
  render: () => <CustomersPage initialId="c-3122" />,
}

export const PossibleDuplicates: Story = {
  name: "Possible duplicates",
  parameters: {
    docs: {
      description: {
        story:
          "Review queue for accounts that look like the same person. Pick the account to keep and merge, or mark the group as different customers.",
      },
    },
  },
  render: () => <DuplicatesPage />,
}
