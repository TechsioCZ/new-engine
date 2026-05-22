import { Badge } from "@techsio/ui-kit/atoms/badge"
import { Button } from "@techsio/ui-kit/atoms/button"
import { type FormEvent, useEffect, useMemo, useState } from "react"
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom"
import {
  CATEGORY_LIST_LIMIT,
  CATEGORY_PRODUCT_LIST_LIMIT,
  useAdminCategoryProducts,
  useAdminProductCategories,
  useAdminProductCategoryDetail,
} from "./admin-api"
import type {
  AdminProductListItem,
  MedusaAdminProductCategory,
} from "./admin-types"

const CATEGORY_TOP_DESCRIPTION_KEY = "top_description_html"
const CATEGORY_BOTTOM_DESCRIPTION_KEY = "bottom_description_html"

type CategoryTableRow = {
  category: MedusaAdminProductCategory
  depth: number
  path: MedusaAdminProductCategory[]
}

export function CategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get("q")?.trim() ?? ""
  const offset = readOffset(searchParams.get("offset"))
  const [searchValue, setSearchValue] = useState(q)
  const categories = useAdminProductCategories({ offset, q: q || undefined })
  const rows = useMemo(
    () => toCategoryTableRows(categories.data?.product_categories ?? [], q),
    [categories.data?.product_categories, q]
  )

  useEffect(() => {
    setSearchValue(q)
  }, [q])

  function updateCategoryParams(next: { offset?: number; q?: string }) {
    const params = new URLSearchParams(searchParams)

    if (typeof next.offset === "number" && next.offset > 0) {
      params.set("offset", String(next.offset))
    } else if (typeof next.offset === "number") {
      params.delete("offset")
    }

    if (typeof next.q === "string" && next.q.trim()) {
      params.set("q", next.q.trim())
    } else if (typeof next.q === "string") {
      params.delete("q")
    }

    setSearchParams(params)
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateCategoryParams({ offset: 0, q: searchValue })
  }

  function handleClearSearch() {
    setSearchValue("")
    updateCategoryParams({ offset: 0, q: "" })
  }

  return (
    <section className="admin-page admin-page-wide">
      <PageHeader
        eyebrow="Kategorie"
        title="Katalogove kategorie"
        value={categories.data?.count}
      />
      <div className="admin-page-toolbar">
        <form className="admin-search-form" onSubmit={handleSearchSubmit}>
          <input
            aria-label="Hledat kategorie"
            className="admin-search-input"
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Nazev nebo handle"
            type="search"
            value={searchValue}
          />
          <Button
            className="admin-toolbar-button"
            size="sm"
            theme="outlined"
            type="submit"
            variant="secondary"
          >
            Hledat
          </Button>
          {q && (
            <Button
              className="admin-toolbar-button"
              onClick={handleClearSearch}
              size="sm"
              theme="borderless"
              type="button"
              variant="secondary"
            >
              Zrusit
            </Button>
          )}
        </form>
      </div>
      <CategoryTable
        isError={categories.isError}
        isLoading={categories.isLoading}
        rows={rows}
      />
      {categories.data && categories.data.count > 0 && (
        <div className="admin-pagination">
          <Button
            className="admin-pagination-button"
            disabled={!categories.data.has_previous}
            onClick={() =>
              updateCategoryParams({
                offset: Math.max(0, offset - CATEGORY_LIST_LIMIT),
                q,
              })
            }
            size="sm"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            Predchozi
          </Button>
          <span>
            {categories.data.offset + 1}-
            {Math.min(
              categories.data.offset + categories.data.limit,
              categories.data.count
            )}{" "}
            z {categories.data.count}
          </span>
          <Button
            className="admin-pagination-button"
            disabled={!categories.data.has_next}
            onClick={() =>
              updateCategoryParams({
                offset: offset + CATEGORY_LIST_LIMIT,
                q,
              })
            }
            size="sm"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            Dalsi
          </Button>
        </div>
      )}
    </section>
  )
}

export function CategoryDetailPage() {
  const { id } = useParams()
  const category = useAdminProductCategoryDetail({ id })

  if (!id) {
    return <Navigate replace to="/categories" />
  }

  if (category.isLoading) {
    return (
      <section className="admin-page">
        <PageHeader eyebrow="Kategorie" title="Nacitam detail" />
        <div aria-busy="true" className="admin-inline-state">
          Nacitam kategorii...
        </div>
      </section>
    )
  }

  if (category.isError || !category.data?.product_category) {
    return (
      <section className="admin-page">
        <PageHeader eyebrow="Kategorie" title="Detail kategorie" />
        <div className="admin-inline-state">
          Kategorii se nepodarilo nacist.
        </div>
      </section>
    )
  }

  return <CategoryDetail category={category.data.product_category} />
}

function CategoryDetail({
  category,
}: {
  category: MedusaAdminProductCategory
}) {
  return (
    <section className="admin-page admin-page-wide">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Kategorie</span>
          <h1>{category.name ?? category.id}</h1>
        </div>
        <div className="admin-header-actions">
          <div className="admin-status-row">
            <CategoryStatusBadge category={category} />
            <CategoryVisibilityBadge category={category} />
          </div>
          <Link className="admin-text-link" to="/categories">
            Zpet na kategorie
          </Link>
        </div>
      </header>
      <div className="admin-detail-layout">
        <div className="admin-detail-stack">
          <CategoryGeneralPanel category={category} />
          <CategoryDescriptionsPanel category={category} />
          <CategoryProductsPanel categoryId={category.id} />
        </div>
        <aside className="admin-detail-stack">
          <CategoryOrganizePanel category={category} />
          <CategoryMetadataPanel metadata={category.metadata} />
          <CategoryJsonPanel category={category} />
        </aside>
      </div>
    </section>
  )
}

function CategoryTable({
  isError,
  isLoading,
  rows,
}: {
  isError: boolean
  isLoading: boolean
  rows: CategoryTableRow[]
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="admin-table-state">
        Nacitam kategorie...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="admin-table-state admin-table-state-error">
        Kategorie se nepodarilo nacist.
      </div>
    )
  }

  if (!rows.length) {
    return <div className="admin-table-state">Zadne kategorie nenalezeny.</div>
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Handle</th>
            <th>Status</th>
            <th>Visibility</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.category.id}>
              <td>
                <CategoryNameCell row={row} />
              </td>
              <td>{formatHandle(row.category.handle)}</td>
              <td>
                <CategoryStatusBadge category={row.category} />
              </td>
              <td>
                <CategoryVisibilityBadge category={row.category} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CategoryNameCell({ row }: { row: CategoryTableRow }) {
  const categoryId = row.category.id

  if (!categoryId) {
    return <span>{row.category.name ?? "-"}</span>
  }

  return (
    <div className="admin-category-name-cell">
      <Link
        className="admin-table-link admin-category-name-link"
        style={{ paddingLeft: row.depth * 18 }}
        to={`/categories/${categoryId}`}
      >
        {row.category.name ?? categoryId}
      </Link>
      {row.path.length > 1 && (
        <span className="admin-category-path">
          {row.path
            .map((category) => category.name ?? category.id)
            .filter(Boolean)
            .join(" / ")}
        </span>
      )}
    </div>
  )
}

function CategoryGeneralPanel({
  category,
}: {
  category: MedusaAdminProductCategory
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Detail</h2>
          <span>{formatHandle(category.handle)}</span>
        </div>
      </div>
      <div className="admin-key-value-list">
        <KeyValue label="ID" value={category.id ?? "-"} />
        <KeyValue label="Name" value={category.name ?? "-"} />
        <KeyValue label="Handle" value={formatHandle(category.handle)} />
        <KeyValue label="Description" value={category.description || "-"} />
        <KeyValue label="Rank" value={formatOptionalNumber(category.rank)} />
      </div>
    </section>
  )
}

function CategoryDescriptionsPanel({
  category,
}: {
  category: MedusaAdminProductCategory
}) {
  const topDescription = getMetadataString(
    category.metadata,
    CATEGORY_TOP_DESCRIPTION_KEY
  )
  const bottomDescription = getMetadataString(
    category.metadata,
    CATEGORY_BOTTOM_DESCRIPTION_KEY
  )

  if (!(topDescription || bottomDescription)) {
    return (
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2>Category descriptions</h2>
            <span>Top/bottom HTML metadata z project widgetu.</span>
          </div>
        </div>
        <div className="admin-table-state">
          Kategorie nema ulozene top/bottom description HTML.
        </div>
      </section>
    )
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Category descriptions</h2>
          <span>Read-only nahled metadata hodnot.</span>
        </div>
      </div>
      <div className="admin-description-grid">
        <DescriptionPreview label="Top description" value={topDescription} />
        <DescriptionPreview
          label="Bottom description"
          value={bottomDescription}
        />
      </div>
    </section>
  )
}

function CategoryProductsPanel({
  categoryId,
}: {
  categoryId: string | undefined
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get("product_q")?.trim() ?? ""
  const offset = readOffset(searchParams.get("product_offset"))
  const [searchValue, setSearchValue] = useState(q)
  const products = useAdminCategoryProducts({
    categoryId,
    offset,
    q: q || undefined,
  })

  useEffect(() => {
    setSearchValue(q)
  }, [q])

  function updateProductParams(next: { offset?: number; q?: string }) {
    const params = new URLSearchParams(searchParams)

    if (typeof next.offset === "number" && next.offset > 0) {
      params.set("product_offset", String(next.offset))
    } else if (typeof next.offset === "number") {
      params.delete("product_offset")
    }

    if (typeof next.q === "string" && next.q.trim()) {
      params.set("product_q", next.q.trim())
    } else if (typeof next.q === "string") {
      params.delete("product_q")
    }

    setSearchParams(params)
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateProductParams({ offset: 0, q: searchValue })
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel-header admin-panel-header-stacked">
        <div>
          <h2>Products</h2>
          <span>
            {formatCount(products.data?.count ?? 0, "produkt", "produktu")}
          </span>
        </div>
        <form
          className="admin-search-form admin-panel-search-form"
          onSubmit={handleSearchSubmit}
        >
          <input
            aria-label="Hledat produkty v kategorii"
            className="admin-search-input"
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Nazev nebo handle"
            type="search"
            value={searchValue}
          />
          <Button
            className="admin-toolbar-button"
            size="sm"
            theme="outlined"
            type="submit"
            variant="secondary"
          >
            Hledat
          </Button>
        </form>
      </div>
      <ProductTable
        isError={products.isError}
        isLoading={products.isLoading}
        products={products.data?.products ?? []}
      />
      {products.data && products.data.count > 0 && (
        <div className="admin-pagination admin-panel-pagination">
          <Button
            className="admin-pagination-button"
            disabled={!products.data.has_previous}
            onClick={() =>
              updateProductParams({
                offset: Math.max(0, offset - CATEGORY_PRODUCT_LIST_LIMIT),
                q,
              })
            }
            size="sm"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            Predchozi
          </Button>
          <span>
            {products.data.offset + 1}-
            {Math.min(
              products.data.offset + products.data.limit,
              products.data.count
            )}{" "}
            z {products.data.count}
          </span>
          <Button
            className="admin-pagination-button"
            disabled={!products.data.has_next}
            onClick={() =>
              updateProductParams({
                offset: offset + CATEGORY_PRODUCT_LIST_LIMIT,
                q,
              })
            }
            size="sm"
            theme="outlined"
            type="button"
            variant="secondary"
          >
            Dalsi
          </Button>
        </div>
      )}
    </section>
  )
}

function ProductTable({
  isError,
  isLoading,
  products,
}: {
  isError: boolean
  isLoading: boolean
  products: AdminProductListItem[]
}) {
  if (isLoading) {
    return (
      <div aria-busy="true" className="admin-table-state">
        Nacitam produkty...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="admin-table-state admin-table-state-error">
        Produkty kategorie se nepodarilo nacist.
      </div>
    )
  }

  if (!products.length) {
    return <div className="admin-table-state">Kategorie nema produkty.</div>
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-data-table admin-data-table-compact">
        <thead>
          <tr>
            <th>Product</th>
            <th>Handle</th>
            <th>Status</th>
            <th>Variants</th>
            <th>Sales channels</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td className="admin-table-strong">
                <Link
                  className="admin-table-link"
                  to={`/products/${product.id}`}
                >
                  {product.title}
                </Link>
              </td>
              <td>{product.handle ? `/${product.handle}` : "-"}</td>
              <td>
                <Badge
                  className="admin-status-badge"
                  size="sm"
                  variant={product.status === "published" ? "info" : "warning"}
                >
                  {product.status ?? "draft"}
                </Badge>
              </td>
              <td>{product.variant_count}</td>
              <td>{product.sales_channel_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CategoryOrganizePanel({
  category,
}: {
  category: MedusaAdminProductCategory
}) {
  const path = getCategoryPathFromParents(category)
  const children = sortCategories(category.category_children ?? [])

  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Organize</h2>
          <span>Path a primarni potomci kategorie.</span>
        </div>
      </div>
      <div className="admin-key-value-list">
        <KeyValue
          label="Parent ID"
          value={category.parent_category_id ?? "-"}
        />
        <KeyValue label="Path" value={formatCategoryPath(path)} />
      </div>
      {children.length ? (
        <div className="admin-inline-list admin-category-children-list">
          {children.map((child) =>
            child.id ? (
              <Link
                className="admin-pill"
                key={child.id}
                to={`/categories/${child.id}`}
              >
                {child.name ?? child.id}
              </Link>
            ) : (
              <span className="admin-pill" key={child.name}>
                {child.name ?? "-"}
              </span>
            )
          )}
        </div>
      ) : (
        <div className="admin-table-state">Bez potomku.</div>
      )}
    </section>
  )
}

function CategoryMetadataPanel({
  metadata,
}: {
  metadata: Record<string, unknown> | null | undefined
}) {
  const keyCount = Object.keys(metadata ?? {}).length

  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Metadata</h2>
          <span>{keyCount} keys</span>
        </div>
      </div>
      {keyCount > 0 ? (
        <pre className="admin-json-preview">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      ) : (
        <div className="admin-table-state">Bez metadat.</div>
      )}
    </section>
  )
}

function CategoryJsonPanel({
  category,
}: {
  category: MedusaAdminProductCategory
}) {
  return (
    <section className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>JSON</h2>
          <span>{Object.keys(category).length} keys</span>
        </div>
      </div>
      <pre className="admin-json-preview">
        {JSON.stringify(category, null, 2)}
      </pre>
    </section>
  )
}

function DescriptionPreview({
  label,
  value,
}: {
  label: string
  value: string
}) {
  if (!value) {
    return null
  }

  return (
    <div className="admin-description-preview">
      <span>{label}</span>
      <pre>{value}</pre>
    </div>
  )
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-key-value-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PageHeader({
  eyebrow,
  title,
  value,
}: {
  eyebrow: string
  title: string
  value?: number | undefined
}) {
  return (
    <header className="admin-page-header">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {typeof value === "number" && (
        <div className="admin-page-count">
          <span>{value}</span>
          <small>polozek</small>
        </div>
      )}
    </header>
  )
}

function CategoryStatusBadge({
  category,
}: {
  category: MedusaAdminProductCategory
}) {
  return (
    <Badge
      className="admin-status-badge"
      size="sm"
      variant={category.is_active ? "success" : "warning"}
    >
      {category.is_active ? "Active" : "Inactive"}
    </Badge>
  )
}

function CategoryVisibilityBadge({
  category,
}: {
  category: MedusaAdminProductCategory
}) {
  return (
    <Badge
      className="admin-status-badge"
      size="sm"
      variant={category.is_internal ? "warning" : "info"}
    >
      {category.is_internal ? "Internal" : "Public"}
    </Badge>
  )
}

function toCategoryTableRows(
  categories: MedusaAdminProductCategory[],
  q: string
) {
  if (q) {
    return categories.map((category) => ({
      category,
      depth: 0,
      path: getCategoryPathFromParents(category),
    }))
  }

  return sortCategories(categories).flatMap((category) =>
    flattenCategory(category, 0, [])
  )
}

function flattenCategory(
  category: MedusaAdminProductCategory,
  depth: number,
  ancestors: MedusaAdminProductCategory[]
): CategoryTableRow[] {
  const path = [...ancestors, category]
  const children = sortCategories(category.category_children ?? [])

  return [
    {
      category,
      depth,
      path,
    },
    ...children.flatMap((child) => flattenCategory(child, depth + 1, path)),
  ]
}

function getCategoryPathFromParents(category: MedusaAdminProductCategory) {
  const parents: MedusaAdminProductCategory[] = []
  const seen = new Set<string>()
  let current = category.parent_category

  while (current) {
    const key = current.id ?? current.name

    if (key && seen.has(key)) {
      break
    }

    if (key) {
      seen.add(key)
    }

    parents.unshift(current)
    current = current.parent_category
  }

  return [...parents, category]
}

function sortCategories(categories: MedusaAdminProductCategory[]) {
  return [...categories].sort((left, right) => {
    const leftRank = left.rank ?? 0
    const rightRank = right.rank ?? 0

    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }

    return (left.name ?? left.id ?? "").localeCompare(
      right.name ?? right.id ?? ""
    )
  })
}

function formatCategoryPath(path: MedusaAdminProductCategory[]) {
  if (!path.length) {
    return "-"
  }

  return path
    .map((category) => category.name ?? category.id)
    .filter(Boolean)
    .join(" / ")
}

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key]

  return typeof value === "string" ? value : ""
}

function formatHandle(handle: string | null | undefined) {
  return handle ? `/${handle}` : "-"
}

function formatOptionalNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : "-"
}

function formatCount(value: number, singular: string, plural: string) {
  return `${value} ${value === 1 ? singular : plural}`
}

function readOffset(value: string | null) {
  const offset = Number(value)

  if (!Number.isFinite(offset) || offset <= 0) {
    return 0
  }

  return Math.floor(offset)
}
