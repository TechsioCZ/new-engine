import type { Meta, StoryObj } from "@storybook/react"
import { useMemo, useRef, useState } from "react"
import { Button } from "../../src/atoms/button"
import { NumericInput } from "../../src/atoms/numeric-input"
import { Dialog } from "../../src/molecules/dialog"
import { FormInput } from "../../src/molecules/form-input"
import { FormNumericInput } from "../../src/molecules/form-numeric-input"
import { Switch } from "../../src/molecules/switch"
import { Toaster, useToast } from "../../src/molecules/toast"
import type { ColumnDef } from "../../src/organisms/data-table"
import { DataTable } from "../../src/organisms/data-table"
import { SelectTemplate } from "../../src/templates/select"
import {
  adminNav,
  currency,
  type Product,
  productCategoryOptions,
  productStatusOptions,
  products as seedProducts,
} from "./data"
import {
  AdminShell,
  DetailList,
  PageHeader,
  SectionCard,
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
  title: "Pages/Patterns/CRUD workflow",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "A working create / read / update / delete loop over one collection — the",
          "pattern every admin screen repeats. All four operations are wired, so the",
          "story is the reference implementation, not a mockup.",
          "",
          "**Where each operation lives**",
          "| Operation | Surface | Why |",
          "| --- | --- | --- |",
          "| Create | right-placement `Dialog` drawer | a new record needs the whole form, the list stays behind it as context |",
          "| Read | row click → detail drawer | non-destructive, reversible, keeps the scroll position |",
          "| Update (light) | DataTable inline edit | one or two fields, no context switch |",
          "| Update (full) | same drawer as create | anything that needs validation across fields |",
          "| Delete | `role=\"alertdialog\"` | irreversible, so it blocks and names the record |",
          "",
          "Every mutation ends in a `Toast`: the list does not visibly change enough on",
          "its own to confirm that the write happened.",
        ].join("\n"),
      },
    },
  },
}

export default meta
type Story = StoryObj

type ProductDraft = {
  name: string
  sku: string
  category: string
  price: number
  stock: number
  status: string
  featured: boolean
}

const emptyDraft: ProductDraft = {
  name: "",
  sku: "",
  category: "T-shirts",
  price: 0,
  stock: 0,
  status: "draft",
  featured: false,
}

function toDraft(product: Product): ProductDraft {
  return {
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    stock: product.stock,
    status: product.status,
    featured: product.featured,
  }
}

/** Create/edit share one form — a record has one shape, so it has one editor. */
function ProductForm({
  draft,
  onChange,
}: {
  draft: ProductDraft
  onChange: (patch: Partial<ProductDraft>) => void
}) {
  return (
    <div className="flex flex-col gap-200 py-200">
      <FormInput
        id="product-name"
        label="Product name"
        onChange={(event) => onChange({ name: event.target.value })}
        required
        value={draft.name}
      />
      <FormInput
        helpText="Uppercase, dash-separated. Must be unique across the catalogue."
        id="product-sku"
        label="SKU"
        onChange={(event) => onChange({ sku: event.target.value })}
        required
        validateStatus={draft.sku.length > 0 && draft.sku.length < 4 ? "error" : "default"}
        value={draft.sku}
      />
      <SelectTemplate
        items={productCategoryOptions.map((option) => ({
          label: option.label,
          value: option.value,
        }))}
        label="Category"
        onValueChange={(details) => {
          const [next] = details.value
          if (next) {
            onChange({ category: next })
          }
        }}
        value={[draft.category]}
      />
      <div className="grid grid-cols-1 gap-200 sm:grid-cols-2">
        <FormNumericInput
          id="product-price"
          label="Price (€)"
          min={0}
          onChange={(value) => onChange({ price: value })}
          value={draft.price}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </FormNumericInput>
        <FormNumericInput
          id="product-stock"
          label="Stock on hand"
          min={0}
          onChange={(value) => onChange({ stock: value })}
          value={draft.stock}
        >
          <NumericInput.Control>
            <NumericInput.Input />
            <NumericInput.TriggerContainer>
              <NumericInput.IncrementTrigger />
              <NumericInput.DecrementTrigger />
            </NumericInput.TriggerContainer>
          </NumericInput.Control>
        </FormNumericInput>
      </div>
      <SelectTemplate
        items={productStatusOptions.map((option) => ({
          label: option.label,
          value: option.value,
        }))}
        label="Status"
        onValueChange={(details) => {
          const [next] = details.value
          if (next) {
            onChange({ status: next })
          }
        }}
        value={[draft.status]}
      />
      <Switch
        checked={draft.featured}
        helpText="Featured products appear in the storefront hero rail."
        onCheckedChange={(checked) => onChange({ featured: checked })}
      >
        Feature this product
      </Switch>
    </div>
  )
}

function CrudPage() {
  const toaster = useToast()
  const [nav, setNav] = useState("catalog-products")
  const [rows, setRows] = useState<Product[]>(seedProducts)
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [detail, setDetail] = useState<Product | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null)
  /* Monotonic counter — deriving an id from row count reuses ids after a delete. */
  const nextId = useRef(1)

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        meta: { type: "string", editable: true, required: true, width: 240 },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span className="font-medium">{info.getValue<string>()}</span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.sku}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        meta: {
          type: "enum",
          options: productCategoryOptions,
          editable: true,
          width: 150,
        },
      },
      {
        accessorKey: "price",
        header: "Price",
        meta: { type: "number", align: "end", editable: true, width: 150 },
        cell: (info) => currency.format(info.getValue<number>()),
      },
      {
        accessorKey: "stock",
        header: "Stock",
        meta: {
          type: "int",
          align: "end",
          editable: true,
          width: 150,
          validate: (value: unknown) =>
            Number(value) < 0 ? "Stock cannot be negative" : undefined,
        },
        cell: (info) => {
          const stock = info.getValue<number>()
          return (
            <span className={stock === 0 ? "text-danger" : undefined}>
              {stock === 0 ? "Out of stock" : stock}
            </span>
          )
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { type: "enum", options: productStatusOptions, editable: true, width: 140 },
        cell: (info) => <StatusBadge status={info.getValue<string>()} />,
      },
      {
        accessorKey: "featured",
        header: "Featured",
        meta: { type: "boolean", align: "center", editable: true, width: 110 },
        cell: (info) => (info.getValue<boolean>() ? "Yes" : "—"),
      },
    ],
    []
  )

  const openCreate = () => {
    setEditingId(null)
    setDraft(emptyDraft)
    setFormOpen(true)
  }

  const openEdit = (product: Product) => {
    setEditingId(product.id)
    setDraft(toDraft(product))
    setFormOpen(true)
  }

  const submitForm = () => {
    if (editingId) {
      setRows((current) =>
        current.map((row) =>
          row.id === editingId ? { ...row, ...draft, status: draft.status as Product["status"] } : row
        )
      )
      toaster.create({
        type: "success",
        title: "Product updated",
        description: draft.name,
      })
    } else {
      const id = `sku-new-${nextId.current}`
      nextId.current += 1
      setRows((current) => [
        {
          ...draft,
          id,
          status: draft.status as Product["status"],
          updatedAt: new Date().toISOString().slice(0, 10),
        },
        ...current,
      ])
      toaster.create({
        type: "success",
        title: "Product created",
        description: `${draft.name} is now in the catalogue.`,
      })
    }
    setFormOpen(false)
  }

  const confirmDelete = () => {
    if (!pendingDelete) {
      return
    }
    const removed = pendingDelete
    setRows((current) => current.filter((row) => row.id !== removed.id))
    setPendingDelete(null)
    toaster.create({
      type: "success",
      title: "Product deleted",
      description: `${removed.name} was removed.`,
    })
  }

  return (
    <AdminShell
      defaultExpandedNav={["catalog"]}
      nav={adminNav}
      onNavChange={setNav}
      selectedNav={nav}
    >
      <Toaster />

      <PageHeader
        actions={
          <Button
            icon="icon-[mdi--plus]"
            onClick={openCreate}
            size="sm"
            variant="primary"
          >
            New product
          </Button>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Catalog", href: "#" },
          { label: "Products" },
        ]}
        description="Click a row to inspect it, use the pencil to edit a couple of fields in place, or open the full form for anything that needs validating."
        title="Products"
      />

      <SectionCard flush>
        <DataTable
          columns={columns}
          data={rows}
          enableColumnFilters
          enableGlobalFilter
          enableInlineEdit
          enablePagination
          enableSorting
          getRowId={(row) => row.id}
          getRowLabel={(row) => row.original.name}
          onEditCommit={({ rowId, draft: committed }) => {
            setRows((current) =>
              current.map((row) =>
                row.id === rowId ? { ...row, ...(committed as Partial<Product>) } : row
              )
            )
            toaster.create({ type: "success", title: "Row saved" })
          }}
          onRowClick={(row) => setDetail(row.original)}
          rowActions={[
            {
              id: "open",
              label: "Open full form",
              icon: "icon-[mdi--open-in-new]",
              onAction: (row) => openEdit(row.original),
            },
            {
              id: "delete",
              label: "Delete",
              icon: "icon-[mdi--delete-outline]",
              tone: "danger",
              onAction: (row) => setPendingDelete(row.original),
            },
          ]}
          size="md"
          translations={{ searchPlaceholder: "Search products…" }}
        />
      </SectionCard>

      {/* CREATE / UPDATE — one drawer, one form, two titles. */}
      <Dialog
        actions={
          <>
            <Button
              onClick={() => setFormOpen(false)}
              theme="outlined"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              disabled={draft.name.length === 0 || draft.sku.length < 4}
              onClick={submitForm}
              variant="primary"
            >
              {editingId ? "Save changes" : "Create product"}
            </Button>
          </>
        }
        customTrigger
        description={
          editingId
            ? "Changes apply to the catalogue as soon as you save."
            : "The product starts as a draft until you set it active."
        }
        onOpenChange={(details) => setFormOpen(details.open)}
        open={formOpen}
        placement="right"
        size="md"
        title={editingId ? "Edit product" : "New product"}
      >
        <ProductForm
          draft={draft}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        />
      </Dialog>

      {/* READ — a drawer, not a page, so the list keeps its scroll and filters. */}
      <Dialog
        actions={
          detail && (
            <Button
              onClick={() => {
                openEdit(detail)
                setDetail(null)
              }}
              variant="primary"
            >
              Edit product
            </Button>
          )
        }
        customTrigger
        onOpenChange={(details) => {
          if (!details.open) {
            setDetail(null)
          }
        }}
        open={detail !== null}
        placement="right"
        size="sm"
        title={detail?.name ?? ""}
      >
        {detail && (
          <div className="flex flex-col gap-200 py-200">
            <StatusBadge status={detail.status} />
            <DetailList
              items={[
                { term: "SKU", value: detail.sku },
                { term: "Category", value: detail.category },
                { term: "Price", value: currency.format(detail.price) },
                { term: "Stock", value: String(detail.stock) },
                { term: "Featured", value: detail.featured ? "Yes" : "No" },
                { term: "Last updated", value: detail.updatedAt },
              ]}
            />
          </div>
        )}
      </Dialog>

      {/* DELETE — blocking, names the record, destructive action on the right. */}
      <Dialog
        actions={
          <>
            <Button
              onClick={() => setPendingDelete(null)}
              theme="outlined"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button onClick={confirmDelete} variant="danger">
              Delete product
            </Button>
          </>
        }
        customTrigger
        description={
          pendingDelete
            ? `${pendingDelete.name} (${pendingDelete.sku}) will be removed from the catalogue and from every collection that references it.`
            : undefined
        }
        onOpenChange={(details) => {
          if (!details.open) {
            setPendingDelete(null)
          }
        }}
        open={pendingDelete !== null}
        role="alertdialog"
        size="sm"
        title="Delete this product?"
      />
    </AdminShell>
  )
}

export const Default: Story = {
  name: "Create · read · update · delete",
  render: () => <CrudPage />,
}
