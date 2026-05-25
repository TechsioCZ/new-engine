import type { AdminProductListItem } from "../admin-types"
import { formatCount } from "../utils/format"
import { AdminTableLink } from "./admin-link"
import { AdminMediaFrame } from "./admin-media"
import { AdminState } from "./admin-state"
import { AdminTable } from "./admin-table"

type AdminProductTableProps = {
  emptyLabel: string
  errorLabel: string
  isError: boolean
  isLoading: boolean
  products: AdminProductListItem[]
}

type ProductStatusTone = "danger" | "neutral" | "success" | "warning"

const productStatusConfig: Record<
  string,
  { label: string; tone: ProductStatusTone }
> = {
  draft: { label: "Draft", tone: "neutral" },
  proposed: { label: "Proposed", tone: "warning" },
  published: { label: "Published", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
}

const statusDotClassName: Record<ProductStatusTone, string> = {
  danger: "bg-danger",
  neutral: "bg-fg-tertiary",
  success: "bg-success",
  warning: "bg-warning",
}
const TITLE_SPLIT_PATTERN = /\s+/

export function AdminProductTable({
  emptyLabel,
  errorLabel,
  isError,
  isLoading,
  products,
}: AdminProductTableProps) {
  if (isLoading) {
    return <AdminState isBusy>Nacitam produkty...</AdminState>
  }

  if (isError) {
    return <AdminState tone="error">{errorLabel}</AdminState>
  }

  if (!products.length) {
    return <AdminState>{emptyLabel}</AdminState>
  }

  return (
    <AdminTable width="3xl">
      <AdminTable.Header>
        <AdminTable.Row>
          <AdminTable.ColumnHeader>Product</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Collection</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Sales channels</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>
            Variants
          </AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Status</AdminTable.ColumnHeader>
        </AdminTable.Row>
      </AdminTable.Header>
      <AdminTable.Body>
        {products.map((product) => (
          <AdminTable.Row key={product.id}>
            <AdminTable.Cell>
              <ProductCell product={product} />
            </AdminTable.Cell>
            <AdminTable.Cell>{product.collection_title || "-"}</AdminTable.Cell>
            <AdminTable.Cell>
              {formatSalesChannels(product.sales_channel_names)}
            </AdminTable.Cell>
            <AdminTable.Cell>
              {formatCount(product.variant_count, "variant", "variants")}
            </AdminTable.Cell>
            <AdminTable.Cell>
              <ProductStatusIndicator status={product.status} />
            </AdminTable.Cell>
          </AdminTable.Row>
        ))}
      </AdminTable.Body>
    </AdminTable>
  )
}

function ProductCell({ product }: { product: AdminProductListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-5">
      <AdminMediaFrame
        className="size-16 shrink-0"
        fallback={getProductInitials(product.title)}
        fallbackClassName="text-xs"
        src={product.thumbnail}
      />
      <div className="min-w-0">
        <AdminTableLink
          className="block truncate text-fg-primary"
          to={`/products/${product.id}`}
        >
          {product.title}
        </AdminTableLink>
        <span className="block truncate text-fg-secondary text-xs leading-normal">
          {formatHandle(product.handle)}
        </span>
      </div>
    </div>
  )
}

function ProductStatusIndicator({
  status,
}: {
  status: string | null | undefined
}) {
  const normalizedStatus = status ?? "draft"
  const config = productStatusConfig[normalizedStatus] ?? {
    label: normalizedStatus,
    tone: "neutral" satisfies ProductStatusTone,
  }

  return (
    <span className="flex min-w-0 items-center gap-3 text-fg-secondary">
      <span
        aria-hidden="true"
        className={`size-3 shrink-0 rounded-sm ${statusDotClassName[config.tone]}`}
      />
      <span className="truncate">{config.label}</span>
    </span>
  )
}

function formatHandle(handle: string | null | undefined) {
  return handle ? `/${handle}` : "-"
}

function formatSalesChannels(salesChannelNames: string[]) {
  if (!salesChannelNames.length) {
    return "-"
  }

  const visibleNames = salesChannelNames.slice(0, 2).join(", ")
  const hiddenCount = salesChannelNames.length - 2

  return hiddenCount > 0 ? `${visibleNames} +${hiddenCount}` : visibleNames
}

function getProductInitials(title: string) {
  return title
    .split(TITLE_SPLIT_PATTERN)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
