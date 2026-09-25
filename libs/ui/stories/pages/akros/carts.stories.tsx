import type { Meta, StoryObj } from "@storybook/react"
import { useMemo, useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { Input } from "../../../src/atoms/input"
import { Dialog } from "../../../src/molecules/dialog"
import { FormInput } from "../../../src/molecules/form-input"
import { FormTextarea } from "../../../src/molecules/form-textarea"
import { Switch } from "../../../src/molecules/switch"
import { Toaster, useToast } from "../../../src/molecules/toast"
import type { ColumnDef } from "../../../src/organisms/data-table"
import { DataTable } from "../../../src/organisms/data-table"
import { Table } from "../../../src/organisms/table"
import { DetailList, PageHeader, SectionCard } from "../shell"
import {
  type AkCart,
  akCarts,
  akOrderLines,
  type CartState,
  cartStateOptions,
  czk,
} from "./data"
import { AkrosShell, akrosDocs } from "./shared"

const meta: Meta = {
  globals: { brand: "business", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Carts",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "Covers the brief's **User carts**: see customer carts and work with them —",
          "save, load and share — the way the current CMS allows.",
          "",
          "**How it is built** — `DataTable`, `Table`, `DetailList`, `Dialog`,",
          "`FormInput`, `FormTextarea`, `Input`, `Switch`, `Toast`.",
          "",
          "**Pattern rules**",
          "- A cart is a record with a lifecycle (active → saved / shared → ordered or",
          "  abandoned); the state badge answers *can I still touch this?*.",
          "- **Save** names the cart so the customer finds it in their account;",
          "  **Load** puts it into the customer's live cart (replacing or merging —",
          "  the dialog asks, because replacing loses what is there now);",
          "  **Share** produces a link and can email it with the shared-cart template.",
          "- Ordered carts are read-only: the actions disable instead of disappearing,",
          "  so the layout does not jump between rows.",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

const cartStates: Record<
  CartState,
  ["success" | "warning" | "info" | "secondary" | "outline", string]
> = {
  active: ["info", "Active"],
  saved: ["secondary", "Saved"],
  shared: ["success", "Shared"],
  abandoned: ["warning", "Abandoned"],
  ordered: ["outline", "Ordered"],
}

function CartStateBadge({ state }: { state: CartState }) {
  const [variant, label] = cartStates[state]
  return (
    <Badge size="sm" variant={variant}>
      {label}
    </Badge>
  )
}

type CartDialog = "save" | "load" | "share" | null

function CartsPage({ initialId = "k-902" }: { initialId?: string }) {
  const toaster = useToast()
  const [carts, setCarts] = useState(akCarts)
  const [selectedId, setSelectedId] = useState(initialId)
  const [dialog, setDialog] = useState<CartDialog>(null)
  const [name, setName] = useState("")
  const [merge, setMerge] = useState(true)

  const cart = carts.find((entry) => entry.id === selectedId) ?? carts[0]
  const readOnly = cart?.state === "ordered"
  const shareLink = `https://www.akros.cz/kosik/sdileny/${cart?.id}-7f3a`

  const columns = useMemo<ColumnDef<AkCart, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Cart",
        meta: { type: "string" },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span className="font-medium">{info.getValue<string>()}</span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.customer} · {info.row.original.customerType}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "state",
        header: "State",
        meta: { type: "enum", options: cartStateOptions, width: 130 },
        cell: (info) => <CartStateBadge state={info.row.original.state} />,
      },
      {
        accessorKey: "total",
        header: "Total",
        meta: { type: "number", align: "end", width: 120 },
        cell: (info) => czk.format(info.getValue<number>()),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        meta: { type: "string", width: 150 },
      },
    ],
    []
  )

  if (!cart) {
    return null
  }

  const updateCart = (patch: Partial<AkCart>) =>
    setCarts((current) =>
      current.map((entry) =>
        entry.id === cart.id ? { ...entry, ...patch } : entry
      )
    )

  return (
    <AkrosShell expanded={["customers-group"]} selected="carts">
      <Toaster />

      <PageHeader
        actions={
          <Button icon="icon-[mdi--cart-plus]" size="sm" variant="primary">
            Prepare cart for customer
          </Button>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Customers", href: "#" },
          { label: "Carts" },
        ]}
        description="Live, saved and shared carts of every customer. Staff can prepare a cart and hand it over."
        title="Carts"
      />

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-5">
        <SectionCard className="xl:col-span-3" flush>
          <DataTable
            columns={columns}
            data={carts}
            enableColumnFilters
            enableGlobalFilter
            enableSorting
            getRowId={(row) => row.id}
            getRowLabel={(row) => row.original.name}
            onRowClick={(row) => setSelectedId(row.original.id)}
            size="sm"
            translations={{ searchPlaceholder: "Cart name or customer…" }}
          />
        </SectionCard>

        <div className="flex flex-col gap-250 xl:col-span-2">
          <SectionCard
            description={`${cart.customer} · updated ${cart.updatedAt}`}
            title={
              <span className="flex flex-wrap items-center gap-150">
                {cart.name}
                <CartStateBadge state={cart.state} />
              </span>
            }
          >
            <div className="flex flex-wrap gap-100">
              <Button
                disabled={readOnly}
                icon="icon-[mdi--content-save-outline]"
                onClick={() => {
                  setName(cart.name === "Cart" ? "" : cart.name)
                  setDialog("save")
                }}
                size="sm"
                theme="outlined"
                variant="secondary"
              >
                Save
              </Button>
              <Button
                disabled={readOnly}
                icon="icon-[mdi--cart-arrow-down]"
                onClick={() => setDialog("load")}
                size="sm"
                theme="outlined"
                variant="secondary"
              >
                Load to customer
              </Button>
              <Button
                disabled={readOnly}
                icon="icon-[mdi--share-variant-outline]"
                onClick={() => setDialog("share")}
                size="sm"
                variant="primary"
              >
                Share
              </Button>
            </div>
            <DetailList
              items={[
                { term: "Items", value: String(cart.items) },
                { term: "Total", value: czk.format(cart.total) },
                { term: "Prepared by", value: cart.preparedBy ?? "Customer" },
                { term: "Customer type", value: cart.customerType },
              ]}
            />
          </SectionCard>

          <SectionCard flush title="Contents">
            <Table size="sm" variant="line">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Product</Table.ColumnHeader>
                  <Table.ColumnHeader align="end">Qty</Table.ColumnHeader>
                  <Table.ColumnHeader align="end">Total</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {akOrderLines.map((line) => (
                  <Table.Row key={line.code}>
                    <Table.Cell>
                      <span className="flex flex-col gap-50">
                        <span>{line.name}</span>
                        <span className="text-fg-secondary text-xs">
                          {line.code}
                        </span>
                      </span>
                    </Table.Cell>
                    <Table.Cell align="end">{line.qty}</Table.Cell>
                    <Table.Cell align="end">
                      {czk.format(line.qty * line.unitPrice)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </SectionCard>
        </div>
      </div>

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setDialog(null)}
              theme="outlined"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              disabled={name.trim().length === 0}
              onClick={() => {
                updateCart({ name, state: "saved" })
                setDialog(null)
                toaster.create({
                  type: "success",
                  title: "Cart saved",
                  description: `${cart.customer} sees “${name}” in their account.`,
                })
              }}
              variant="primary"
            >
              Save cart
            </Button>
          </>
        }
        customTrigger
        description="A saved cart stays in the customer's account until they load it or delete it."
        onOpenChange={(details) => setDialog(details.open ? "save" : null)}
        open={dialog === "save"}
        size="sm"
        title="Save cart"
      >
        <FormInput
          id="cart-name"
          label="Cart name"
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Hala Kladno — spojovací materiál"
          required
          value={name}
        />
      </Dialog>

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setDialog(null)}
              theme="outlined"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateCart({ state: "active" })
                setDialog(null)
                toaster.create({
                  type: "success",
                  title: merge
                    ? "Items added to the live cart"
                    : "Live cart replaced",
                  description: `${cart.items} items loaded for ${cart.customer}.`,
                })
              }}
              variant="primary"
            >
              Load cart
            </Button>
          </>
        }
        customTrigger
        description={`Puts “${cart.name}” into ${cart.customer}'s live cart, as if they loaded it themselves.`}
        onOpenChange={(details) => setDialog(details.open ? "load" : null)}
        open={dialog === "load"}
        size="sm"
        title="Load cart to customer"
      >
        <Switch
          checked={merge}
          helpText={
            merge
              ? "Items already in the live cart stay; quantities of the same product add up."
              : "The live cart is emptied first. What the customer has there now is lost."
          }
          onCheckedChange={setMerge}
        >
          Merge with the live cart
        </Switch>
      </Dialog>

      <Dialog
        actions={
          <>
            <Button
              onClick={() => setDialog(null)}
              theme="outlined"
              variant="secondary"
            >
              Close
            </Button>
            <Button
              icon="icon-[mdi--email-fast-outline]"
              onClick={() => {
                updateCart({ state: "shared" })
                setDialog(null)
                toaster.create({
                  type: "success",
                  title: "Cart shared",
                  description: "Sent with the “Shared cart” email template.",
                })
              }}
              variant="primary"
            >
              Send by email
            </Button>
          </>
        }
        customTrigger
        description="Anyone with the link can load a copy of this cart. Prices follow the price list of whoever opens it."
        onOpenChange={(details) => setDialog(details.open ? "share" : null)}
        open={dialog === "share"}
        size="md"
        title="Share cart"
      >
        <div className="flex flex-col gap-200">
          <div className="flex items-end gap-100">
            <Input
              aria-label="Share link"
              readOnly
              size="sm"
              value={shareLink}
            />
            <Button
              icon="icon-[mdi--content-copy]"
              onClick={() =>
                toaster.create({ type: "info", title: "Link copied" })
              }
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Copy
            </Button>
          </div>
          <FormInput
            defaultValue="nakup@svoboda-elektro.cz"
            id="share-to"
            label="Recipient"
            type="email"
          />
          <FormTextarea
            defaultValue="Dobrý den, posíláme košík připravený podle naší domluvy."
            id="share-message"
            label="Message"
            rows={3}
          />
        </div>
      </Dialog>
    </AkrosShell>
  )
}

export const Default: Story = {
  name: "Carts",
  render: () => <CartsPage />,
}

export const OrderedCart: Story = {
  name: "Ordered cart (read-only)",
  parameters: {
    docs: {
      description: {
        story:
          "A cart that already became an order. Save, load and share stay visible but disabled, so the layout matches every other cart.",
      },
    },
  },
  render: () => <CartsPage initialId="k-904" />,
}
