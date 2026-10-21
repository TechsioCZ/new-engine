import { expect, userEvent, within } from "storybook/test"
import { DemoBoundary } from "../demo-boundary"
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
  akCustomers,
  akOrderLines,
  type CartState,
  cartStateOptions,
  czk,
  formatDate,
} from "./data"
import { AkrosShell, akrosDocs } from "./shared"

const meta: Meta = {
  decorators: [
    (Story) => (
      <DemoBoundary>
        <Story />
      </DemoBoundary>
    ),
  ],

  tags: ["autodocs"],
  title: "Pages/Akros admin/Carts",
  parameters: {
    brandLock: "akros",
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
  const [carts, setCarts] = useState(() =>
    akCarts.map((entry) => ({
      ...entry,
      items: akOrderLines.length,
      total: akOrderLines.reduce(
        (sum, line) => sum + line.qty * line.unitPrice,
        0
      ),
    }))
  )
  const [selectedId, setSelectedId] = useState(initialId)
  const [dialog, setDialog] = useState<CartDialog>(null)
  const [shareDrafts, setShareDrafts] = useState<
    Record<string, { recipient: string; message: string }>
  >({})
  const [shareDraft, setShareDraft] = useState({ recipient: "", message: "" })
  const [shareInvalid, setShareInvalid] = useState(false)
  const [name, setName] = useState("")
  const [merge, setMerge] = useState(true)
  const [liveCarts, setLiveCarts] = useState<
    Record<string, Record<string, number>>
  >({})

  const cart = carts.find((entry) => entry.id === selectedId) ?? carts[0]
  const readOnly = cart?.state === "ordered"
  /* Suggest the cart owner's address; never another customer's. */
  const recipient =
    akCustomers.find(
      (entry) =>
        entry.company === cart?.customer || entry.name === cart?.customer
    )?.email ?? ""
  const liveQuantities = liveCarts[cart?.customer ?? ""] ?? {
    "SRB-4X40-ZN": 100,
  }
  const sourceTotal = akOrderLines.reduce(
    (sum, line) => sum + line.qty * line.unitPrice,
    0
  )
  const liveTotal = akOrderLines.reduce(
    (sum, line) => sum + (liveQuantities[line.code] ?? 0) * line.unitPrice,
    0
  )
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
        cell: (info) => formatDate(info.getValue<string>()),
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
        actions={null}
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
            description={`${cart.customer} · updated ${formatDate(cart.updatedAt)}`}
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
                onClick={() => {
                  setShareInvalid(false)
                  setShareDraft(
                    shareDrafts[cart.id] ?? {
                      recipient,
                      message:
                        "Dobrý den, posíláme košík připravený podle naší domluvy.",
                    }
                  )
                  setDialog("share")
                }}
                size="sm"
                variant="primary"
              >
                Share
              </Button>
            </div>
            <DetailList
              items={[
                {
                  term: "Product lines in this demo",
                  value: String(akOrderLines.length),
                },
                { term: "Demo contents total", value: czk.format(sourceTotal) },
                { term: "Prepared by", value: cart.preparedBy ?? "Customer" },
                { term: "Customer type", value: cart.customerType },
              ]}
            />
          </SectionCard>

          <SectionCard title="Customer live cart (local demo)">
            <p className="text-fg-secondary text-sm">
              Initially contains 100 wood screws. Loading this draft updates
              only the local quantities below.
            </p>
            <DetailList
              items={akOrderLines.map((line) => ({
                term: line.name,
                value: `${liveQuantities[line.code] ?? 0} pcs`,
              }))}
            />
            <p className="font-semibold" role="status">
              Live cart total: {czk.format(liveTotal)}
            </p>
          </SectionCard>
          <SectionCard flush title="Contents">
            <div
              className="w-full min-w-0 overflow-x-auto"
              role="region"
              aria-label="Cart contents"
              tabIndex={0}
            >
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
            </div>
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
                  description: `“${name}” was saved to this local demo cart. No customer account was changed.`,
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
                const quantities = merge ? { ...liveQuantities } : {}
                for (const line of akOrderLines) {
                  quantities[line.code] =
                    (quantities[line.code] ?? 0) + line.qty
                }
                setLiveCarts((current) => ({
                  ...current,
                  [cart.customer]: quantities,
                }))
                updateCart({ state: "active" })
                setDialog(null)
                toaster.create({
                  type: "success",
                  title: merge
                    ? "Local demo quantities merged"
                    : "Local demo cart replaced",
                  description: `${akOrderLines.length} product lines loaded locally for ${cart.customer}. No customer account was changed.`,
                })
              }}
              variant="primary"
            >
              Load cart
            </Button>
          </>
        }
        customTrigger
        description={`Load this demo draft into the local preview of ${cart.customer}'s live cart. No remote account is connected.`}
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
                if (
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                    shareDraft.recipient.trim()
                  )
                ) {
                  setShareInvalid(true)
                  document.getElementById("share-to")?.focus()
                  return
                }
                setShareDrafts((current) => ({
                  ...current,
                  [cart.id]: {
                    ...shareDraft,
                    recipient: shareDraft.recipient.trim(),
                  },
                }))
                updateCart({ state: "shared" })
                setDialog(null)
                toaster.create({
                  type: "success",
                  title: "Share draft saved locally",
                  description:
                    "The local cart is marked shared. No email was sent.",
                })
              }}
              variant="primary"
            >
              Save share draft
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
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareLink)
                  toaster.create({ type: "success", title: "Link copied" })
                } catch {
                  toaster.create({
                    type: "error",
                    title: "Could not copy link",
                    description: "Select and copy the link manually.",
                  })
                }
              }}
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Copy
            </Button>
          </div>
          <FormInput
            value={shareDraft.recipient}
            onChange={(event) =>
              setShareDraft((current) => ({
                ...current,
                recipient: event.target.value,
              }))
            }
            validateStatus={shareInvalid ? "error" : "default"}
            helpText={
              shareInvalid
                ? "Enter a recipient email address, for example name@example.com."
                : "Saved in this local demo only; no email is sent."
            }
            id="share-to"
            key={cart.id}
            label="Recipient"
            type="email"
          />
          <FormTextarea
            value={shareDraft.message}
            onChange={(event) =>
              setShareDraft((current) => ({
                ...current,
                message: event.target.value,
              }))
            }
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Share" }))
    const recipient = body.getByLabelText("Recipient")
    await userEvent.clear(recipient)
    await userEvent.type(recipient, "saved@example.com")
    await userEvent.clear(body.getByLabelText("Message"))
    await userEvent.type(body.getByLabelText("Message"), "Saved share message")
    await userEvent.click(
      body.getByRole("button", { name: "Save share draft" })
    )
    await userEvent.click(canvas.getByRole("button", { name: "Share" }))
    await expect(body.getByLabelText("Recipient")).toHaveValue(
      "saved@example.com"
    )
    await expect(body.getByLabelText("Message")).toHaveValue(
      "Saved share message"
    )
    await userEvent.clear(body.getByLabelText("Message"))
    await userEvent.type(body.getByLabelText("Message"), "Cancelled message")
    await userEvent.keyboard("{Escape}")
    await userEvent.click(canvas.getByRole("button", { name: "Share" }))
    await expect(body.getByLabelText("Message")).toHaveValue(
      "Saved share message"
    )
    await userEvent.keyboard("{Escape}")
    await userEvent.click(
      canvas.getByRole("button", { name: "Load to customer" })
    )
    await userEvent.click(body.getByRole("button", { name: /^Load cart$/ }))
    await expect(canvas.getByText("300 pcs", { exact: true })).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Load to customer" })
    )
    await userEvent.click(
      body.getByRole("switch", { name: "Merge with the live cart" })
    )
    await userEvent.click(body.getByRole("button", { name: /^Load cart$/ }))
    await expect(canvas.getByText("200 pcs", { exact: true })).toBeVisible()
    await expect(
      canvas.queryByText("300 pcs", { exact: true })
    ).not.toBeInTheDocument()
  },
  parameters: {
    docs: {
      description: {
        story:
          "Compare default in carts to choose a suitable presentation for real product content.",
      },
    },
  },

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
