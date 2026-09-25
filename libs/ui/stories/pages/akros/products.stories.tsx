import type { Meta, StoryObj } from "@storybook/react"
import { type ReactNode, useMemo, useState } from "react"
import { Badge } from "../../../src/atoms/badge"
import { Button } from "../../../src/atoms/button"
import { Icon } from "../../../src/atoms/icon"
import { NumericInput } from "../../../src/atoms/numeric-input"
import { FileUpload } from "../../../src/molecules/file-upload"
import { FormNumericInput } from "../../../src/molecules/form-numeric-input"
import { FormTextarea } from "../../../src/molecules/form-textarea"
import { Tabs } from "../../../src/molecules/tabs"
import { Toaster, useToast } from "../../../src/molecules/toast"
import type { ColumnDef } from "../../../src/organisms/data-table"
import { DataTable } from "../../../src/organisms/data-table"
import { DetailList, PageHeader, SectionCard } from "../shell"
import {
  type AkProduct,
  akProducts,
  czk,
  count,
  missingCmsFields,
  shippingMethods,
} from "./data"
import { AbraOwned, AkrosShell, akrosDocs, Notice } from "./shared"

const meta: Meta = {
  globals: { brand: "akros", mode: "light" },
  tags: ["autodocs"],
  title: "Pages/Akros admin/Products",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: akrosDocs([
          "Covers the brief's **Products**: products come partly from ABRA and are",
          "completed in the CMS. New products arrive roughly once a month; the CMS",
          "fills what ABRA does not handle — the **indivisible sale quantity**",
          "(sold only per 10 pcs, a set multiple or another unit) and the",
          "**shipping dimensions** used to pick a carrier.",
          "",
          "**How it is built** — `DataTable` (with inline edit), `Tabs`,",
          "`FormNumericInput`, `FormTextarea`, `FileUpload`, `Badge`, `Toast`.",
          "",
          "**Pattern rules**",
          "- Ownership is visible per field: ABRA values carry a *From ABRA* badge and",
          "  are read-only, so nobody edits a value the next import overwrites.",
          "- The monthly import lands in a *Needs completion* view that lists what is",
          "  missing per product, not just a red dot.",
          "- The sale unit and minimum quantity are validated together — a minimum",
          "  that is not a multiple of the unit is an error, not a warning.",
          "- Dimensions immediately show which shipping methods the parcel fits, so",
          "  the consequence of a wrong number is visible before saving.",
        ]),
      },
    },
  },
}

export default meta
type Story = StoryObj

function CompletenessBadge({ product }: { product: AkProduct }) {
  const missing = missingCmsFields(product)
  if (missing.length === 0) {
    return (
      <Badge size="sm" variant="success">
        Complete
      </Badge>
    )
  }
  return (
    <span className="flex flex-col items-start gap-50">
      <Badge size="sm" variant="warning">
        {`${missing.length} missing`}
      </Badge>
      <span className="text-fg-secondary text-xs">{missing.join(", ")}</span>
    </span>
  )
}

function ProductsPage({ initialView = "all" }: { initialView?: string }) {
  const toaster = useToast()
  const [products, setProducts] = useState(akProducts)
  const [view, setView] = useState(initialView)

  const incomplete = products.filter(
    (product) => missingCmsFields(product).length > 0
  )
  const rows = view === "incomplete" ? incomplete : products

  const columns = useMemo<ColumnDef<AkProduct, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        meta: { type: "string", width: 300 },
        cell: (info) => (
          <span className="flex flex-col gap-50">
            <span className="font-medium">{info.getValue<string>()}</span>
            <span className="text-fg-secondary text-xs">
              {info.row.original.code} · {info.row.original.category}
            </span>
          </span>
        ),
      },
      {
        accessorKey: "price",
        header: "Price (ABRA)",
        meta: { type: "number", align: "end", width: 130 },
        cell: (info) => `${info.getValue<number>().toFixed(2)} Kč`,
      },
      {
        accessorKey: "stock",
        header: "Stock (ABRA)",
        meta: { type: "int", align: "end", width: 130 },
        cell: (info) => count.format(info.getValue<number>()),
      },
      {
        accessorKey: "saleUnit",
        header: "Sold per",
        meta: {
          type: "int",
          align: "end",
          width: 120,
          editable: true,
          validate: (value) => (Number(value) >= 1 ? undefined : "At least 1"),
        },
        cell: (info) => `${info.getValue<number>()} pcs`,
      },
      {
        id: "completeness",
        header: "CMS data",
        accessorFn: (row) => missingCmsFields(row).length,
        meta: { type: "int", width: 220 },
        cell: (info) => <CompletenessBadge product={info.row.original} />,
      },
      {
        accessorKey: "importedAt",
        header: "Imported",
        meta: { type: "date", width: 130 },
      },
    ],
    []
  )

  return (
    <AkrosShell expanded={["catalog"]} selected="products">
      <Toaster />

      <PageHeader
        actions={
          <Button
            icon="icon-[mdi--database-sync-outline]"
            onClick={() =>
              toaster.create({
                type: "info",
                title: "ABRA import started",
                description:
                  "Prices, stock and the category tree refresh in a few minutes.",
              })
            }
            size="sm"
            theme="outlined"
            variant="secondary"
          >
            Import from ABRA
          </Button>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Catalog", href: "#" },
          { label: "Products" },
        ]}
        description="Name, price, stock and category come from ABRA. Sale unit, dimensions, images and descriptions are filled here."
        title="Products"
      />

      {incomplete.length > 0 && view === "all" && (
        <Notice
          action={
            <Button
              onClick={() => setView("incomplete")}
              size="sm"
              theme="outlined"
              variant="secondary"
            >
              Show them
            </Button>
          }
          title={`${incomplete.length} products imported from ABRA still miss CMS data`}
          tone="info"
        >
          They are live in the shop but missing images, descriptions or shipping
          dimensions.
        </Notice>
      )}

      <Tabs onValueChange={setView} value={view} variant="line">
        <Tabs.List>
          <Tabs.Trigger value="all">
            All products
            <Badge size="sm" variant="outline">
              {String(products.length)}
            </Badge>
          </Tabs.Trigger>
          <Tabs.Trigger value="incomplete">
            Needs completion
            <Badge size="sm" variant="warning">
              {String(incomplete.length)}
            </Badge>
          </Tabs.Trigger>
          <Tabs.Indicator />
        </Tabs.List>
        {["all", "incomplete"].map((value) => (
          <Tabs.Content className="pt-250" key={value} value={value}>
            {value === view && (
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
                  onEditCommit={({ rowId, draft }) => {
                    setProducts((current) =>
                      current.map((product) =>
                        product.id === rowId
                          ? { ...product, saleUnit: Number(draft.saleUnit) }
                          : product
                      )
                    )
                    toaster.create({
                      type: "success",
                      title: "Sale unit updated",
                    })
                  }}
                  size="sm"
                  translations={{ searchPlaceholder: "Name or ABRA code…" }}
                />
              </SectionCard>
            )}
          </Tabs.Content>
        ))}
      </Tabs>
    </AkrosShell>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-50">
      <span className="flex items-center gap-100 text-fg-secondary text-xs">
        {label}
        <AbraOwned />
      </span>
      <span className="text-sm">{value}</span>
    </div>
  )
}

function DimensionInput({
  id,
  label,
  unit,
  value,
  onChange,
}: {
  id: string
  label: string
  unit: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <FormNumericInput
      helpText={unit}
      id={id}
      label={label}
      min={0}
      onChange={onChange}
      size="sm"
      value={value}
    >
      <NumericInput.Control>
        <NumericInput.Input />
        <NumericInput.TriggerContainer>
          <NumericInput.IncrementTrigger />
          <NumericInput.DecrementTrigger />
        </NumericInput.TriggerContainer>
      </NumericInput.Control>
    </FormNumericInput>
  )
}

function ProductEditorPage({ productId }: { productId: string }) {
  const toaster = useToast()
  const product =
    akProducts.find((entry) => entry.id === productId) ?? akProducts[0]
  const [saleUnit, setSaleUnit] = useState(product?.saleUnit ?? 1)
  const [minQty, setMinQty] = useState(product?.minQty ?? 1)
  const [length, setLength] = useState(product?.length ?? 0)
  const [width, setWidth] = useState(product?.width ?? 0)
  const [height, setHeight] = useState(product?.height ?? 0)
  const [weight, setWeight] = useState(product?.weight ?? 0)

  if (!product) {
    return null
  }

  const minQtyInvalid = minQty < saleUnit || minQty % saleUnit !== 0
  const longest = Math.max(length, width, height)
  const hasDimensions = longest > 0 && weight > 0
  const fits = shippingMethods.map((method) => ({
    method,
    fits:
      hasDimensions &&
      weight <= method.maxWeight &&
      longest <= method.maxLength,
  }))

  return (
    <AkrosShell expanded={["catalog"]} selected="products">
      <Toaster />

      <PageHeader
        actions={
          <Button
            disabled={minQtyInvalid}
            icon="icon-[mdi--content-save-outline]"
            onClick={() =>
              toaster.create({
                type: "success",
                title: "Product saved",
                description: "CMS fields updated. ABRA fields are untouched.",
              })
            }
            size="sm"
            variant="primary"
          >
            Save
          </Button>
        }
        breadcrumb={[
          { label: "Home", href: "#" },
          { label: "Products", href: "#" },
          { label: product.code },
        ]}
        description={product.category}
        meta={<CompletenessBadge product={product} />}
        title={product.name}
      />

      <div className="grid grid-cols-1 items-start gap-250 xl:grid-cols-3">
        <div className="flex flex-col gap-250 xl:col-span-2">
          <SectionCard
            description="Everything a customer can add to the cart is a multiple of the sale unit."
            title="Indivisible quantity"
          >
            <div className="grid grid-cols-1 gap-200 sm:grid-cols-2">
              <FormNumericInput
                helpText="Sold only in multiples of this, e.g. 10 = per 10 pcs."
                id="sale-unit"
                label="Sale unit (pcs)"
                min={1}
                onChange={setSaleUnit}
                value={saleUnit}
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
                helpText={
                  minQtyInvalid
                    ? `Must be a multiple of ${saleUnit} and at least ${saleUnit}.`
                    : "Smallest quantity per order line."
                }
                id="min-qty"
                label="Minimum order quantity (pcs)"
                min={1}
                onChange={setMinQty}
                step={saleUnit}
                validateStatus={minQtyInvalid ? "error" : "default"}
                value={minQty}
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
            <p className="text-fg-secondary text-sm">
              In the shop: quantity steps {saleUnit}, {saleUnit * 2},{" "}
              {saleUnit * 3}… starting at {minQty} pcs.
            </p>
          </SectionCard>

          <SectionCard
            description="Packed parcel, not the bare product. Used to offer only the carriers that can take it."
            title="Shipping dimensions"
          >
            <div className="grid grid-cols-2 gap-200 md:grid-cols-4">
              <DimensionInput
                id="dim-length"
                label="Length"
                onChange={setLength}
                unit="cm"
                value={length}
              />
              <DimensionInput
                id="dim-width"
                label="Width"
                onChange={setWidth}
                unit="cm"
                value={width}
              />
              <DimensionInput
                id="dim-height"
                label="Height"
                onChange={setHeight}
                unit="cm"
                value={height}
              />
              <DimensionInput
                id="dim-weight"
                label="Weight"
                onChange={setWeight}
                unit="kg"
                value={weight}
              />
            </div>
            <div className="flex flex-col gap-100">
              <span className="font-medium text-sm">
                Fits these shipping methods
              </span>
              {hasDimensions ? (
                <ul className="grid grid-cols-1 gap-50 sm:grid-cols-2">
                  {fits.map(({ method, fits: ok }) => (
                    <li
                      className="flex items-center gap-100 text-sm"
                      key={method.id}
                    >
                      <Icon
                        className={ok ? "text-success" : "text-fg-secondary"}
                        icon={
                          ok
                            ? "icon-[mdi--check-circle-outline]"
                            : "icon-[mdi--close-circle-outline]"
                        }
                        size="sm"
                      />
                      <span>
                        {method.name}
                        <span className="text-fg-secondary">
                          {ok ? " — fits" : " — too heavy or too long"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-fg-secondary text-sm">
                  Enter the dimensions and weight to see which carriers can take
                  this parcel. Until then only courier delivery is offered.
                </p>
              )}
            </div>
          </SectionCard>

          <SectionCard flush>
            <Tabs defaultValue="description" variant="line">
              <Tabs.List className="px-250 pt-250">
                <Tabs.Trigger value="description">Description</Tabs.Trigger>
                <Tabs.Trigger value="images">Images</Tabs.Trigger>
                <Tabs.Indicator />
              </Tabs.List>
              <Tabs.Content
                className="flex flex-col gap-200 p-250"
                value="description"
              >
                <FormTextarea
                  defaultValue={
                    product.hasDescription
                      ? "Countersunk wood screw with a Torx drive and zinc plating for indoor use."
                      : ""
                  }
                  helpText="Shown on the product page and sent to the product feeds."
                  id="description"
                  label="Description"
                  rows={6}
                />
              </Tabs.Content>
              <Tabs.Content
                className="flex flex-col gap-200 p-250"
                value="images"
              >
                <FileUpload accept="image/*" maxFiles={8}>
                  <FileUpload.Label>Product images</FileUpload.Label>
                  <FileUpload.HiddenInput />
                  <FileUpload.Dropzone>
                    <span className="flex flex-col items-center gap-100 text-center">
                      <Icon icon="icon-[mdi--image-plus-outline]" size="xl" />
                      <span className="text-sm">Drop images here</span>
                      <span className="text-fg-secondary text-xs">
                        JPG or PNG, up to 8 images. The first one is the main
                        image.
                      </span>
                    </span>
                  </FileUpload.Dropzone>
                  <FileUpload.Trigger>Choose images</FileUpload.Trigger>
                </FileUpload>
              </Tabs.Content>
            </Tabs>
          </SectionCard>
        </div>

        <div className="flex flex-col gap-250">
          <SectionCard
            description="Change these in ABRA — the monthly import overwrites anything typed here."
            title="From ABRA"
          >
            <div className="flex flex-col gap-200">
              <ReadOnlyField label="ABRA code" value={product.code} />
              <ReadOnlyField label="Name" value={product.name} />
              <ReadOnlyField label="Category" value={product.category} />
              <ReadOnlyField
                label="Price excl. VAT"
                value={`${product.price.toFixed(2)} Kč`}
              />
              <ReadOnlyField
                label="Stock"
                value={`${count.format(product.stock)} pcs`}
              />
            </div>
          </SectionCard>

          <SectionCard title="Record">
            <DetailList
              items={[
                { term: "First imported", value: product.importedAt },
                { term: "Last ABRA sync", value: "2026-09-14 05:00" },
                {
                  term: "Price of a sale unit",
                  value: czk.format(product.price * saleUnit),
                },
                {
                  term: "In feeds",
                  value: product.hasImage ? "Yes" : "No — missing image",
                },
              ]}
            />
          </SectionCard>
        </div>
      </div>
    </AkrosShell>
  )
}

export const Default: Story = {
  name: "Product list",
  render: () => <ProductsPage />,
}

export const NeedsCompletion: Story = {
  name: "New from ABRA — needs completion",
  parameters: {
    docs: {
      description: {
        story:
          "The monthly import view: products ABRA created that still miss CMS data. Use a row's edit action to change its *Sold per* sale unit inline.",
      },
    },
  },
  render: () => <ProductsPage initialView="incomplete" />,
}

export const EditorSoldPerTen: Story = {
  name: "Product editor — sold per 10 pcs",
  parameters: {
    docs: {
      description: {
        story:
          "Gloves sold only per 10. Try a minimum quantity of 15: it is rejected because it is not a multiple of the sale unit, and Save disables.",
      },
    },
  },
  render: () => <ProductEditorPage productId="p-3" />,
}

export const EditorMissingDimensions: Story = {
  name: "Product editor — missing dimensions",
  parameters: {
    docs: {
      description: {
        story:
          "A new product from the September import with no shipping data yet. Enter dimensions and weight to see which carriers can take the parcel.",
      },
    },
  },
  render: () => <ProductEditorPage productId="p-4" />,
}
