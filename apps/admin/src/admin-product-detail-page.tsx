import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Link, Navigate, useParams } from "react-router-dom"
import { useAdminProductDetail } from "./admin-api"
import type {
  MedusaAdminProduct,
  MedusaAdminProductImage,
  MedusaAdminProductOption,
  MedusaAdminProductVariant,
} from "./admin-types"
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
      <section className="admin-page">
        <PageTitle eyebrow="Produkt" title="Nacitam detail" />
        <AdminState isBusy surface="panel">
          Nacitam produkt...
        </AdminState>
      </section>
    )
  }

  if (product.isError || !product.data?.product) {
    return (
      <section className="admin-page">
        <PageTitle eyebrow="Produkt" title="Detail produktu" />
        <AdminState surface="panel" tone="error">
          Produkt se nepodarilo nacist.
        </AdminState>
      </section>
    )
  }

  return <ProductDetail product={product.data.product} />
}

function ProductDetail({ product }: { product: MedusaAdminProduct }) {
  const variants = product.variants ?? []
  const images = product.images ?? []
  const options = product.options ?? []

  return (
    <section className="admin-page admin-page-wide">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Produkt</span>
          <h1>{product.title ?? product.id}</h1>
        </div>
        <Link className="admin-text-link" to="/products">
          Zpet na produkty
        </Link>
      </header>
      <div className="admin-detail-layout">
        <div className="admin-detail-stack">
          <section className="admin-panel">
            <div className="admin-product-detail-hero">
              <ProductImage product={product} />
              <div>
                <Badge
                  className="admin-status-badge"
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
            <div className="admin-panel-header">
              <div>
                <h2>Varianty</h2>
                <span>
                  {formatCount(variants.length, "varianta", "variant")}
                </span>
              </div>
            </div>
            <ProductVariantsTable variants={variants} />
          </section>
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Obrazky</h2>
                <span>{formatCount(images.length, "obrazek", "obrazku")}</span>
              </div>
            </div>
            <ProductImagesGrid images={images} />
          </section>
        </div>
        <aside className="admin-detail-stack">
          <ProductSummaryPanel product={product} />
          <ProductOptionsPanel options={options} />
          <ProductMetadataPanel metadata={product.metadata} />
        </aside>
      </div>
    </section>
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
      <div className="admin-panel-header">
        <div>
          <h2>Souhrn</h2>
          <span>{product.handle ? `/${product.handle}` : product.id}</span>
        </div>
      </div>
      <div className="admin-detail-fields">
        <DetailField label="ID" value={product.id} />
        <DetailField label="Handle" value={product.handle} />
        <DetailField label="Kolekce" value={product.collection?.title} />
        <DetailField
          label="Kategorie"
          value={(product.categories ?? [])
            .map((category) => category.name ?? category.id)
            .filter(Boolean)
            .join(", ")}
        />
        <DetailField
          label="Sales channels"
          value={(product.sales_channels ?? [])
            .map((channel) => channel.name ?? channel.id)
            .filter(Boolean)
            .join(", ")}
        />
      </div>
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
      <div className="admin-panel-header">
        <div>
          <h2>Options</h2>
          <span>{formatCount(options.length, "option", "options")}</span>
        </div>
      </div>
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
      <div className="admin-panel-header">
        <div>
          <h2>Metadata</h2>
          <span>Technicke hodnoty produktu.</span>
        </div>
      </div>
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
    <div className="admin-table-wrap">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Varianta</th>
            <th>SKU</th>
            <th>EAN</th>
            <th>Inventory</th>
            <th>Backorder</th>
          </tr>
        </thead>
        <tbody>
          {variants.map((variant) => (
            <tr key={variant.id}>
              <td className="admin-table-strong">
                {variant.title ?? variant.id}
              </td>
              <td>{variant.sku ?? "-"}</td>
              <td>{variant.ean ?? variant.barcode ?? variant.upc ?? "-"}</td>
              <td>{formatBoolean(variant.manage_inventory)}</td>
              <td>{formatBoolean(variant.allow_backorder)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

function DetailField({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="admin-detail-field">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  )
}

function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="admin-page-header">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
    </header>
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
