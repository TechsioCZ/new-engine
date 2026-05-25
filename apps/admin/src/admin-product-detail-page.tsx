import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Navigate, useParams } from "react-router-dom"
import { useAdminProductDetail } from "./admin-api"
import type {
  MedusaAdminProduct,
  MedusaAdminProductImage,
  MedusaAdminProductOption,
  MedusaAdminProductVariant,
} from "./admin-types"
import {
  AdminDetailField,
  AdminDetailFields,
} from "./components/admin-detail-field"
import { AdminTextLink } from "./components/admin-link"
import { AdminMediaFrame } from "./components/admin-media"
import { AdminPage, AdminPageHeader } from "./components/admin-page-header"
import {
  AdminDetailLayout,
  AdminDetailStack,
  AdminPanel,
} from "./components/admin-panel"
import { AdminPanelHeader } from "./components/admin-panel-header"
import { AdminJsonPreview } from "./components/admin-preview"
import { AdminState } from "./components/admin-state"
import { AdminTable } from "./components/admin-table"
import { formatCount } from "./utils/format"

const TITLE_SPLIT_PATTERN = /\s+/

export function ProductDetailPage() {
  const { id } = useParams()
  const product = useAdminProductDetail({ id })

  if (!id) {
    return <Navigate replace to="/products" />
  }

  if (product.isLoading) {
    return (
      <AdminPage>
        <AdminPageHeader eyebrow="Produkt" title="Nacitam detail" />
        <AdminState isBusy surface="panel">
          Nacitam produkt...
        </AdminState>
      </AdminPage>
    )
  }

  if (product.isError || !product.data?.product) {
    return (
      <AdminPage>
        <AdminPageHeader eyebrow="Produkt" title="Detail produktu" />
        <AdminState surface="panel" tone="error">
          Produkt se nepodarilo nacist.
        </AdminState>
      </AdminPage>
    )
  }

  return <ProductDetail product={product.data.product} />
}

function ProductDetail({ product }: { product: MedusaAdminProduct }) {
  const variants = product.variants ?? []
  const images = product.images ?? []
  const options = product.options ?? []

  return (
    <AdminPage width="wide">
      <AdminPageHeader eyebrow="Produkt" title={product.title ?? product.id}>
        <AdminTextLink to="/products">Zpet na produkty</AdminTextLink>
      </AdminPageHeader>
      <AdminDetailLayout>
        <AdminDetailStack>
          <AdminPanel>
            <div className="grid grid-cols-[var(--spacing-80)_minmax(0,1fr)] items-start gap-450 p-400 max-admin-layout:grid-cols-1">
              <ProductImage product={product} />
              <div>
                <Badge
                  size="sm"
                  variant={product.status === "published" ? "info" : "warning"}
                >
                  {product.status ?? "draft"}
                </Badge>
                <h2 className="mt-300 mb-200 font-bold text-fg-primary text-lg leading-tight">
                  {product.subtitle || product.handle || product.id}
                </h2>
                <p className="m-0 max-w-5xl text-fg-secondary text-xs leading-relaxed">
                  {product.description || "Bez popisu."}
                </p>
              </div>
            </div>
          </AdminPanel>
          <AdminPanel>
            <AdminPanelHeader
              subtitle={formatCount(variants.length, "varianta", "variant")}
              title="Varianty"
            />
            <ProductVariantsTable variants={variants} />
          </AdminPanel>
          <AdminPanel>
            <AdminPanelHeader
              subtitle={formatCount(images.length, "obrazek", "obrazku")}
              title="Obrazky"
            />
            <ProductImagesGrid images={images} />
          </AdminPanel>
        </AdminDetailStack>
        <AdminDetailStack as="aside">
          <ProductSummaryPanel product={product} />
          <ProductOptionsPanel options={options} />
          <ProductMetadataPanel metadata={product.metadata} />
        </AdminDetailStack>
      </AdminDetailLayout>
    </AdminPage>
  )
}

function ProductImage({ product }: { product: MedusaAdminProduct }) {
  return (
    <AdminMediaFrame
      className="aspect-square w-80 max-admin-layout:aspect-card max-admin-layout:w-full"
      fallback={getInitials(product.title ?? product.id)}
      fallbackClassName="bg-highlight text-xl"
      src={product.thumbnail}
    />
  )
}

function ProductSummaryPanel({ product }: { product: MedusaAdminProduct }) {
  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle={product.handle ? `/${product.handle}` : product.id}
        title="Souhrn"
      />
      <AdminDetailFields>
        <AdminDetailField label="ID" value={product.id} />
        <AdminDetailField label="Handle" value={product.handle} />
        <AdminDetailField label="Kolekce" value={product.collection?.title} />
        <AdminDetailField
          label="Kategorie"
          value={(product.categories ?? [])
            .map((category) => category.name ?? category.id)
            .filter(Boolean)
            .join(", ")}
        />
        <AdminDetailField
          label="Sales channels"
          value={(product.sales_channels ?? [])
            .map((channel) => channel.name ?? channel.id)
            .filter(Boolean)
            .join(", ")}
        />
      </AdminDetailFields>
    </AdminPanel>
  )
}

function ProductOptionsPanel({
  options,
}: {
  options: MedusaAdminProductOption[]
}) {
  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle={formatCount(options.length, "option", "options")}
        title="Options"
      />
      {options.length ? (
        <div className="grid gap-200 p-400">
          {options.map((option) => (
            <div
              className="grid gap-100 rounded-md border border-border-primary bg-fill-base px-300 py-250"
              key={option.id ?? option.title}
            >
              <strong className="font-bold text-fg-primary text-xs">
                {option.title ?? option.id}
              </strong>
              <span className="text-fg-secondary text-xs leading-normal">
                {formatOptionValues(option)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <AdminState>Bez option hodnot.</AdminState>
      )}
    </AdminPanel>
  )
}

function ProductMetadataPanel({
  metadata,
}: {
  metadata: Record<string, unknown> | null | undefined
}) {
  const hasMetadata = metadata && Object.keys(metadata).length > 0

  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle="Technicke hodnoty produktu."
        title="Metadata"
      />
      {hasMetadata ? (
        <AdminJsonPreview>{JSON.stringify(metadata, null, 2)}</AdminJsonPreview>
      ) : (
        <AdminState>Bez metadat.</AdminState>
      )}
    </AdminPanel>
  )
}

function ProductVariantsTable({
  variants,
}: {
  variants: MedusaAdminProductVariant[]
}) {
  if (!variants.length) {
    return <AdminState>Produkt nema varianty.</AdminState>
  }

  return (
    <AdminTable width="2xl">
      <AdminTable.Header>
        <AdminTable.Row>
          <AdminTable.ColumnHeader>Varianta</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>SKU</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>EAN</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Inventory</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Backorder</AdminTable.ColumnHeader>
        </AdminTable.Row>
      </AdminTable.Header>
      <AdminTable.Body>
        {variants.map((variant) => (
          <AdminTable.Row key={variant.id}>
            <AdminTable.Cell className="font-semibold text-fg-primary">
              {variant.title ?? variant.id}
            </AdminTable.Cell>
            <AdminTable.Cell>{variant.sku ?? "-"}</AdminTable.Cell>
            <AdminTable.Cell>
              {variant.ean ?? variant.barcode ?? variant.upc ?? "-"}
            </AdminTable.Cell>
            <AdminTable.Cell>
              {formatBoolean(variant.manage_inventory)}
            </AdminTable.Cell>
            <AdminTable.Cell>
              {formatBoolean(variant.allow_backorder)}
            </AdminTable.Cell>
          </AdminTable.Row>
        ))}
      </AdminTable.Body>
    </AdminTable>
  )
}

function ProductImagesGrid({ images }: { images: MedusaAdminProductImage[] }) {
  if (!images.length) {
    return <AdminState>Produkt nema dalsi obrazky.</AdminState>
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(var(--spacing-43),1fr))] gap-250 p-400">
      {images.map((image) => (
        <AdminMediaFrame
          className="aspect-square w-full"
          fallback=""
          fallbackClassName="text-xs"
          key={image.id ?? image.url}
          src={image.url}
        />
      ))}
    </div>
  )
}

function formatOptionValues(option: MedusaAdminProductOption) {
  const values = option.values ?? []

  if (!values.length) {
    return "-"
  }

  return values
    .map((item) => item.value ?? item.id)
    .filter(Boolean)
    .join(", ")
}

function formatBoolean(value: boolean | null | undefined) {
  if (typeof value !== "boolean") {
    return "-"
  }

  return value ? "ano" : "ne"
}

function getInitials(title: string) {
  return title
    .split(TITLE_SPLIT_PATTERN)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
