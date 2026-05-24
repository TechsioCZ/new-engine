import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Table } from "@techsio/ui-kit/organisms/table"
import { Link, Navigate, useParams } from "react-router-dom"
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
import { AdminPage, AdminPageHeader } from "./components/admin-page-header"
import { AdminPanelHeader } from "./components/admin-panel-header"
import { AdminState } from "./components/admin-state"

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
        <Link className="admin-text-link" to="/products">
          Zpet na produkty
        </Link>
      </AdminPageHeader>
      <div className="admin-detail-layout">
        <div className="admin-detail-stack">
          <section className="admin-panel">
            <div className="admin-product-detail-hero">
              <ProductImage product={product} />
              <div>
                <Badge
                  size="sm"
                  variant={product.status === "published" ? "info" : "warning"}
                >
                  {product.status ?? "draft"}
                </Badge>
                <h2>{product.subtitle || product.handle || product.id}</h2>
                <p>{product.description || "Bez popisu."}</p>
              </div>
            </div>
          </section>
          <section className="admin-panel">
            <AdminPanelHeader
              subtitle={formatCount(variants.length, "varianta", "variant")}
              title="Varianty"
            />
            <ProductVariantsTable variants={variants} />
          </section>
          <section className="admin-panel">
            <AdminPanelHeader
              subtitle={formatCount(images.length, "obrazek", "obrazku")}
              title="Obrazky"
            />
            <ProductImagesGrid images={images} />
          </section>
        </div>
        <aside className="admin-detail-stack">
          <ProductSummaryPanel product={product} />
          <ProductOptionsPanel options={options} />
          <ProductMetadataPanel metadata={product.metadata} />
        </aside>
      </div>
    </AdminPage>
  )
}

function ProductImage({ product }: { product: MedusaAdminProduct }) {
  if (product.thumbnail) {
    return (
      <span
        className="admin-product-detail-image"
        style={getThumbnailStyle(product.thumbnail)}
      />
    )
  }

  return (
    <span className="admin-product-detail-image admin-product-detail-image-fallback">
      {getInitials(product.title ?? product.id)}
    </span>
  )
}

function ProductSummaryPanel({ product }: { product: MedusaAdminProduct }) {
  return (
    <section className="admin-panel">
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
    </section>
  )
}

function ProductOptionsPanel({
  options,
}: {
  options: MedusaAdminProductOption[]
}) {
  return (
    <section className="admin-panel">
      <AdminPanelHeader
        subtitle={formatCount(options.length, "option", "options")}
        title="Options"
      />
      {options.length ? (
        <div className="admin-chip-list">
          {options.map((option) => (
            <div className="admin-chip-block" key={option.id ?? option.title}>
              <strong>{option.title ?? option.id}</strong>
              <span>{formatOptionValues(option)}</span>
            </div>
          ))}
        </div>
      ) : (
        <AdminState>Bez option hodnot.</AdminState>
      )}
    </section>
  )
}

function ProductMetadataPanel({
  metadata,
}: {
  metadata: Record<string, unknown> | null | undefined
}) {
  const hasMetadata = metadata && Object.keys(metadata).length > 0

  return (
    <section className="admin-panel">
      <AdminPanelHeader
        subtitle="Technicke hodnoty produktu."
        title="Metadata"
      />
      {hasMetadata ? (
        <pre className="admin-json-preview">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      ) : (
        <AdminState>Bez metadat.</AdminState>
      )}
    </section>
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
    <div className="overflow-x-auto">
      <Table className="min-w-2xl" size="sm" variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Varianta</Table.ColumnHeader>
            <Table.ColumnHeader>SKU</Table.ColumnHeader>
            <Table.ColumnHeader>EAN</Table.ColumnHeader>
            <Table.ColumnHeader>Inventory</Table.ColumnHeader>
            <Table.ColumnHeader>Backorder</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {variants.map((variant) => (
            <Table.Row key={variant.id}>
              <Table.Cell className="font-semibold text-fg-primary">
                {variant.title ?? variant.id}
              </Table.Cell>
              <Table.Cell>{variant.sku ?? "-"}</Table.Cell>
              <Table.Cell>
                {variant.ean ?? variant.barcode ?? variant.upc ?? "-"}
              </Table.Cell>
              <Table.Cell>{formatBoolean(variant.manage_inventory)}</Table.Cell>
              <Table.Cell>{formatBoolean(variant.allow_backorder)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  )
}

function ProductImagesGrid({ images }: { images: MedusaAdminProductImage[] }) {
  if (!images.length) {
    return <AdminState>Produkt nema dalsi obrazky.</AdminState>
  }

  return (
    <div className="admin-product-image-grid">
      {images.map((image) => (
        <span
          className="admin-product-gallery-image"
          key={image.id ?? image.url}
          style={getThumbnailStyle(image.url ?? "")}
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

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`
}

function getThumbnailStyle(thumbnail: string) {
  return {
    backgroundImage: thumbnail
      ? `url("${thumbnail.replaceAll('"', "%22")}")`
      : undefined,
  }
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
