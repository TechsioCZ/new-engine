import { Badge } from "@techsio/ui-kit/atoms/badge"
import { type TreeNode, TreeView } from "@techsio/ui-kit/molecules/tree-view"
import { useEffect, useMemo, useState } from "react"
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom"
import {
  CATEGORY_LIST_LIMIT,
  CATEGORY_PRODUCT_LIST_LIMIT,
  useAdminCategoryProducts,
  useAdminProductCategories,
  useAdminProductCategoryDetail,
} from "./admin-api"
import type { MedusaAdminProductCategory } from "./admin-types"
import {
  AdminDetailField,
  AdminDetailFields,
} from "./components/admin-detail-field"
import { AdminTableLink, AdminTextLink } from "./components/admin-link"
import {
  AdminPage,
  AdminPageCount,
  AdminPageHeader,
  AdminPageHeaderActions,
  AdminStatusRow,
} from "./components/admin-page-header"
import { AdminPagination } from "./components/admin-pagination"
import {
  AdminDetailLayout,
  AdminDetailStack,
  AdminPanel,
} from "./components/admin-panel"
import { AdminPanelHeader } from "./components/admin-panel-header"
import {
  AdminInlineList,
  AdminJsonPreview,
  AdminPreviewCode,
} from "./components/admin-preview"
import { AdminProductTable } from "./components/admin-product-table"
import { AdminSearch } from "./components/admin-search"
import { AdminState } from "./components/admin-state"
import { AdminTable } from "./components/admin-table"
import { AdminToolbarButton } from "./components/admin-toolbar-button"
import { formatCount, readOffset } from "./utils/format"

const CATEGORY_TOP_DESCRIPTION_KEY = "top_description_html"
const CATEGORY_BOTTOM_DESCRIPTION_KEY = "bottom_description_html"
const CATEGORY_TREE_GRID_CLASS =
  "grid min-w-0 flex-1 grid-cols-(--admin-category-tree-columns) items-center gap-6 max-admin-layout:grid-cols-(--admin-category-tree-columns-compact) max-admin-layout:gap-x-6 max-admin-layout:gap-y-2"
const CATEGORY_TREE_HEADER_CELL_CLASS =
  "min-w-0 truncate font-medium text-fg-secondary text-xs"
const CATEGORY_TREE_ROW_CONTROL_CLASS = "min-h-20 min-w-0 px-8 py-0 text-sm"

type CategoryWithId = MedusaAdminProductCategory & { id: string }
type CategoryStatusTone = "success" | "warning"

type CategoryTreeItem = TreeNode & {
  children?: CategoryTreeItem[]
  handle?: string | null
  isActive?: boolean | null
  isInternal?: boolean | null
}

export function CategoriesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get("q")?.trim() ?? ""
  const offset = readOffset(searchParams.get("offset"))
  const [searchValue, setSearchValue] = useState(q)
  const categories = useAdminProductCategories({ offset, q: q || undefined })

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

  function handleSearchSubmit() {
    updateCategoryParams({ offset: 0, q: searchValue })
  }

  function handleSearchValueChange(nextValue: string) {
    setSearchValue(nextValue)

    if (!nextValue && q) {
      updateCategoryParams({ offset: 0, q: "" })
    }
  }

  return (
    <AdminPage width="wide">
      <AdminPageHeader eyebrow="Kategorie" title="Katalogove kategorie">
        {typeof categories.data?.count === "number" && (
          <AdminPageCount label="polozek" value={categories.data.count} />
        )}
      </AdminPageHeader>
      <AdminSearch
        ariaLabel="Hledat kategorie"
        onSearch={handleSearchSubmit}
        onValueChange={handleSearchValueChange}
        placeholder="Nazev nebo handle"
        value={searchValue}
      />
      <AdminPanel>
        <AdminPanelHeader
          subtitle={
            q
              ? "Kategorie odpovidajici hledani vcetne parent path."
              : "Hierarchie korenovych kategorii a jejich potomku."
          }
          title={q ? "Vysledky hledani" : "Strom kategorii"}
        />
        {q ? (
          <CategorySearchResults
            categories={categories.data?.product_categories ?? []}
            isError={categories.isError}
            isLoading={categories.isLoading}
          />
        ) : (
          <CategoryTreeSurface
            categories={categories.data?.product_categories ?? []}
            isError={categories.isError}
            isLoading={categories.isLoading}
            onSelectCategory={(categoryId) =>
              navigate(`/categories/${categoryId}`)
            }
          />
        )}
        {categories.data && (
          <AdminPagination
            ariaLabel="Strankovani kategorii"
            className="border-border-primary border-t px-8 py-6"
            count={categories.data.count}
            offset={categories.data.offset}
            pageSize={CATEGORY_LIST_LIMIT}
          />
        )}
      </AdminPanel>
    </AdminPage>
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
      <AdminPage>
        <AdminPageHeader eyebrow="Kategorie" title="Nacitam detail" />
        <AdminState isBusy surface="panel">
          Nacitam kategorii...
        </AdminState>
      </AdminPage>
    )
  }

  if (category.isError || !category.data?.product_category) {
    return (
      <AdminPage>
        <AdminPageHeader eyebrow="Kategorie" title="Detail kategorie" />
        <AdminState surface="panel" tone="error">
          Kategorii se nepodarilo nacist.
        </AdminState>
      </AdminPage>
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
    <AdminPage width="wide">
      <AdminPageHeader eyebrow="Kategorie" title={category.name ?? category.id}>
        <AdminPageHeaderActions>
          <AdminStatusRow>
            <CategoryStatusBadge category={category} />
            <CategoryVisibilityBadge category={category} />
          </AdminStatusRow>
          <AdminTextLink to="/categories">Zpet na kategorie</AdminTextLink>
        </AdminPageHeaderActions>
      </AdminPageHeader>
      <AdminDetailLayout>
        <AdminDetailStack>
          <CategoryGeneralPanel category={category} />
          <CategoryDescriptionsPanel category={category} />
          <CategoryProductsPanel categoryId={category.id} />
        </AdminDetailStack>
        <AdminDetailStack as="aside">
          <CategoryOrganizePanel category={category} />
          <CategoryMetadataPanel metadata={category.metadata} />
          <CategoryJsonPanel category={category} />
        </AdminDetailStack>
      </AdminDetailLayout>
    </AdminPage>
  )
}

function CategoryTreeSurface({
  categories,
  isError,
  isLoading,
  onSelectCategory,
  selectedCategoryId,
}: {
  categories: MedusaAdminProductCategory[]
  isError: boolean
  isLoading: boolean
  onSelectCategory: (categoryId: string) => void
  selectedCategoryId?: string
}) {
  if (isLoading) {
    return <AdminState isBusy>Nacitam strom kategorii...</AdminState>
  }

  if (isError) {
    return <AdminState tone="error">Kategorie se nepodarilo nacist.</AdminState>
  }

  if (!categories.length) {
    return <AdminState>Zadne kategorie nenalezeny.</AdminState>
  }

  return (
    <div className="overflow-x-auto">
      <CategoryTreeHeader />
      <CategoryTree
        categories={categories}
        onSelectCategory={onSelectCategory}
        selectedCategoryId={selectedCategoryId}
      />
    </div>
  )
}

function CategoryTree({
  categories,
  onSelectCategory,
  selectedCategoryId,
}: {
  categories: MedusaAdminProductCategory[]
  onSelectCategory: (categoryId: string) => void
  selectedCategoryId?: string
}) {
  const treeData = useMemo(() => toCategoryTree(categories), [categories])
  const expandedValue = useMemo(
    () => (selectedCategoryId ? collectExpandableCategoryIds(treeData) : []),
    [selectedCategoryId, treeData]
  )

  return (
    <TreeView
      className="w-full"
      data={treeData}
      defaultExpandedValue={expandedValue}
      expandOnClick={false}
      onSelectionChange={(details) => {
        const [categoryId] = details.selectedValue

        if (categoryId) {
          onSelectCategory(categoryId)
        }
      }}
      selectedValue={selectedCategoryId ? [selectedCategoryId] : []}
      selectionMode="single"
      size="sm"
    >
      <TreeView.Tree className="bg-transparent">
        {treeData.map((node, index) => (
          <CategoryTreeNode indexPath={[index]} key={node.id} node={node} />
        ))}
      </TreeView.Tree>
    </TreeView>
  )
}

function CategoryTreeNode({
  indexPath,
  node,
}: {
  indexPath: number[]
  node: CategoryTreeItem
}) {
  const hasChildren = Boolean(node.children?.length)

  return (
    <TreeView.NodeProvider indexPath={indexPath} node={node}>
      {hasChildren ? (
        <TreeView.Branch>
          <TreeView.BranchTrigger className="min-w-0 border-border-primary border-b">
            <TreeView.BranchControl className={CATEGORY_TREE_ROW_CONTROL_CLASS}>
              <CategoryTreeNodeContent hasChildren node={node} />
            </TreeView.BranchControl>
          </TreeView.BranchTrigger>
          <TreeView.BranchContent>
            {node.children?.map((child, index) => (
              <CategoryTreeNode
                indexPath={[...indexPath, index]}
                key={child.id}
                node={child}
              />
            ))}
          </TreeView.BranchContent>
        </TreeView.Branch>
      ) : (
        <TreeView.Item
          className={`border-border-primary border-b ${CATEGORY_TREE_ROW_CONTROL_CLASS}`}
        >
          <CategoryTreeNodeContent node={node} />
        </TreeView.Item>
      )}
    </TreeView.NodeProvider>
  )
}

function CategoryTreeHeader() {
  return (
    <div className="border-border-primary border-b px-8 py-5">
      <div className={CATEGORY_TREE_GRID_CLASS}>
        <span className={CATEGORY_TREE_HEADER_CELL_CLASS}>Name</span>
        <span className={CATEGORY_TREE_HEADER_CELL_CLASS}>Handle</span>
        <span className={CATEGORY_TREE_HEADER_CELL_CLASS}>Status</span>
        <span className={CATEGORY_TREE_HEADER_CELL_CLASS}>Visibility</span>
      </div>
    </div>
  )
}

function CategoryTreeNodeContent({
  hasChildren = false,
  node,
}: {
  hasChildren?: boolean
  node: CategoryTreeItem
}) {
  return (
    <span className={CATEGORY_TREE_GRID_CLASS}>
      <span className="flex min-w-0 items-center gap-5">
        {hasChildren ? (
          <TreeView.BranchIndicator className="shrink-0 text-fg-tertiary" />
        ) : (
          <span aria-hidden="true" className="size-4 shrink-0" />
        )}
        <span className="truncate font-medium text-fg-primary">
          {node.name}
        </span>
      </span>
      <span className="min-w-0 truncate text-fg-secondary max-admin-layout:col-start-1 max-admin-layout:row-start-2 max-admin-layout:text-xs">
        {formatHandle(node.handle)}
      </span>
      <CategoryTreeStatusIndicator
        label={node.isActive ? "Active" : "Inactive"}
        tone={node.isActive ? "success" : "warning"}
      />
      <CategoryTreeStatusIndicator
        className="max-admin-layout:col-start-2 max-admin-layout:row-start-2"
        label={node.isInternal ? "Internal" : "Public"}
        tone={node.isInternal ? "warning" : "success"}
      />
    </span>
  )
}

function CategoryTreeStatusIndicator({
  className = "",
  label,
  tone,
}: {
  className?: string
  label: string
  tone: CategoryStatusTone
}) {
  const dotClassName: Record<CategoryStatusTone, string> = {
    success: "bg-success",
    warning: "bg-warning",
  }

  return (
    <span
      className={`flex min-w-0 items-center gap-3 text-fg-secondary max-admin-layout:justify-self-end max-admin-layout:text-xs ${className}`}
    >
      <span
        aria-hidden="true"
        className={`size-3 shrink-0 rounded-sm ${dotClassName[tone]}`}
      />
      <span className="truncate">{label}</span>
    </span>
  )
}

function CategorySearchResults({
  categories,
  isError,
  isLoading,
}: {
  categories: MedusaAdminProductCategory[]
  isError: boolean
  isLoading: boolean
}) {
  if (isLoading) {
    return <AdminState isBusy>Nacitam kategorie...</AdminState>
  }

  if (isError) {
    return <AdminState tone="error">Kategorie se nepodarilo nacist.</AdminState>
  }

  if (!categories.length) {
    return <AdminState>Zadne kategorie nenalezeny.</AdminState>
  }

  return (
    <AdminTable width="3xl">
      <AdminTable.Header>
        <AdminTable.Row>
          <AdminTable.ColumnHeader>Name</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Handle</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Status</AdminTable.ColumnHeader>
          <AdminTable.ColumnHeader>Visibility</AdminTable.ColumnHeader>
        </AdminTable.Row>
      </AdminTable.Header>
      <AdminTable.Body>
        {categories.map((category) => (
          <AdminTable.Row key={category.id ?? category.name}>
            <AdminTable.Cell>
              {category.id ? (
                <AdminTableLink to={`/categories/${category.id}`}>
                  {formatCategoryPath(getCategoryPathFromParents(category))}
                </AdminTableLink>
              ) : (
                formatCategoryName(category)
              )}
            </AdminTable.Cell>
            <AdminTable.Cell>{formatHandle(category.handle)}</AdminTable.Cell>
            <AdminTable.Cell>
              <CategoryStatusBadge category={category} />
            </AdminTable.Cell>
            <AdminTable.Cell>
              <CategoryVisibilityBadge category={category} />
            </AdminTable.Cell>
          </AdminTable.Row>
        ))}
      </AdminTable.Body>
    </AdminTable>
  )
}

function CategoryGeneralPanel({
  category,
}: {
  category: MedusaAdminProductCategory
}) {
  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle={formatHandle(category.handle)}
        title="Detail"
      />
      <AdminDetailFields>
        <AdminDetailField label="ID" value={category.id} />
        <AdminDetailField label="Name" value={category.name} />
        <AdminDetailField
          label="Handle"
          value={formatHandle(category.handle)}
        />
        <AdminDetailField label="Description" value={category.description} />
        <AdminDetailField
          label="Rank"
          value={formatOptionalNumber(category.rank)}
        />
      </AdminDetailFields>
    </AdminPanel>
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

  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle="Top/bottom HTML metadata z project widgetu."
        title="Category descriptions"
      />
      {topDescription || bottomDescription ? (
        <div className="grid gap-6 p-8">
          {topDescription && (
            <DescriptionPreview
              label="Top description"
              value={topDescription}
            />
          )}
          {bottomDescription && (
            <DescriptionPreview
              label="Bottom description"
              value={bottomDescription}
            />
          )}
        </div>
      ) : (
        <AdminState>
          Kategorie nema ulozene top/bottom description HTML.
        </AdminState>
      )}
    </AdminPanel>
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

  function handleSearchSubmit() {
    updateProductParams({ offset: 0, q: searchValue })
  }

  function handleSearchValueChange(nextValue: string) {
    setSearchValue(nextValue)

    if (!nextValue && q) {
      updateProductParams({ offset: 0, q: "" })
    }
  }

  return (
    <AdminPanel>
      <AdminPanelHeader
        actions={
          <AdminSearch
            ariaLabel="Hledat produkty v kategorii"
            onSearch={handleSearchSubmit}
            onValueChange={handleSearchValueChange}
            placeholder="Nazev nebo handle"
            value={searchValue}
          />
        }
        className="max-admin-layout:grid max-admin-layout:items-start"
        stacked
        subtitle={formatCount(products.data?.count ?? 0, "produkt", "produktu")}
        title="Products"
      />
      <AdminProductTable
        emptyLabel="Kategorie nema produkty."
        errorLabel="Produkty kategorie se nepodarilo nacist."
        isError={products.isError}
        isLoading={products.isLoading}
        products={products.data?.products ?? []}
      />
      {products.data && products.data.count > 0 && (
        <CategoryProductsPagination
          count={products.data.count}
          hasNext={products.data.has_next}
          hasPrevious={products.data.has_previous}
          offset={products.data.offset}
          onPageChange={(nextOffset) =>
            updateProductParams({ offset: nextOffset, q })
          }
        />
      )}
    </AdminPanel>
  )
}

function CategoryProductsPagination({
  count,
  hasNext,
  hasPrevious,
  offset,
  onPageChange,
}: {
  count: number
  hasNext: boolean
  hasPrevious: boolean
  offset: number
  onPageChange: (offset: number) => void
}) {
  const start = offset + 1
  const end = Math.min(offset + CATEGORY_PRODUCT_LIST_LIMIT, count)

  return (
    <div className="flex items-center justify-between gap-6 border-border-primary border-t px-8 py-6 text-fg-secondary text-sm max-admin-layout:flex-col max-admin-layout:items-start">
      <span>
        {start}-{end} z {count}
      </span>
      <div className="flex gap-3">
        <AdminToolbarButton
          disabled={!hasPrevious}
          onClick={() =>
            onPageChange(Math.max(0, offset - CATEGORY_PRODUCT_LIST_LIMIT))
          }
        >
          Predchozi
        </AdminToolbarButton>
        <AdminToolbarButton
          disabled={!hasNext}
          onClick={() => onPageChange(offset + CATEGORY_PRODUCT_LIST_LIMIT)}
        >
          Dalsi
        </AdminToolbarButton>
      </div>
    </div>
  )
}

function CategoryOrganizePanel({
  category,
}: {
  category: MedusaAdminProductCategory
}) {
  const navigate = useNavigate()
  const treeCategories = getCategoryDetailTree(category)
  const children = sortCategories(category.category_children ?? [])

  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle="Path a primarni potomci kategorie."
        title="Organize"
      />
      {treeCategories.length ? (
        <CategoryTreeSurface
          categories={treeCategories}
          isError={false}
          isLoading={false}
          onSelectCategory={(categoryId) =>
            navigate(`/categories/${categoryId}`)
          }
          selectedCategoryId={category.id}
        />
      ) : (
        <AdminState>Bez stromu kategorie.</AdminState>
      )}
      <AdminDetailFields>
        <AdminDetailField
          label="Parent ID"
          value={category.parent_category_id}
        />
        <AdminDetailField
          label="Path"
          value={formatCategoryPath(getCategoryPathFromParents(category))}
        />
      </AdminDetailFields>
      {children.length ? (
        <div className="border-border-primary border-t p-8">
          <AdminInlineList>
            {children.map((child) =>
              child.id ? (
                <AdminTextLink key={child.id} to={`/categories/${child.id}`}>
                  {formatCategoryName(child)}
                </AdminTextLink>
              ) : (
                <span className="text-fg-secondary text-xs" key={child.name}>
                  {formatCategoryName(child)}
                </span>
              )
            )}
          </AdminInlineList>
        </div>
      ) : null}
    </AdminPanel>
  )
}

function CategoryMetadataPanel({
  metadata,
}: {
  metadata: Record<string, unknown> | null | undefined
}) {
  const keyCount = Object.keys(metadata ?? {}).length

  return (
    <AdminPanel>
      <AdminPanelHeader subtitle={`${keyCount} keys`} title="Metadata" />
      {keyCount > 0 ? (
        <AdminJsonPreview>{JSON.stringify(metadata, null, 2)}</AdminJsonPreview>
      ) : (
        <AdminState>Bez metadat.</AdminState>
      )}
    </AdminPanel>
  )
}

function CategoryJsonPanel({
  category,
}: {
  category: MedusaAdminProductCategory
}) {
  return (
    <AdminPanel>
      <AdminPanelHeader
        subtitle={`${Object.keys(category).length} keys`}
        title="JSON"
      />
      <AdminJsonPreview>{JSON.stringify(category, null, 2)}</AdminJsonPreview>
    </AdminPanel>
  )
}

function DescriptionPreview({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="grid gap-3">
      <strong className="font-bold text-fg-primary text-xs">{label}</strong>
      <AdminPreviewCode>{value}</AdminPreviewCode>
    </div>
  )
}

function CategoryStatusBadge({
  category,
}: {
  category: MedusaAdminProductCategory
}) {
  return (
    <Badge size="sm" variant={category.is_active ? "success" : "warning"}>
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
    <Badge size="sm" variant={category.is_internal ? "warning" : "info"}>
      {category.is_internal ? "Internal" : "Public"}
    </Badge>
  )
}

function toCategoryTree(categories: MedusaAdminProductCategory[]) {
  return sortCategories(categories).filter(isCategoryWithId).map(toTreeItem)
}

function toTreeItem(category: CategoryWithId): CategoryTreeItem {
  const children = sortCategories(category.category_children ?? [])
    .filter(isCategoryWithId)
    .map(toTreeItem)

  return {
    children: children.length ? children : undefined,
    handle: category.handle,
    id: category.id,
    isActive: category.is_active,
    isInternal: category.is_internal,
    name: formatCategoryName(category),
  }
}

function collectExpandableCategoryIds(items: CategoryTreeItem[]): string[] {
  const ids: string[] = []

  for (const item of items) {
    if (item.children?.length) {
      ids.push(item.id, ...collectExpandableCategoryIds(item.children))
    }
  }

  return ids
}

function getCategoryDetailTree(
  category: MedusaAdminProductCategory
): CategoryWithId[] {
  if (!isCategoryWithId(category)) {
    return []
  }

  const path = getCategoryPathFromParents(category).filter(isCategoryWithId)
  let childTree: CategoryWithId = category

  for (let index = path.length - 2; index >= 0; index -= 1) {
    const parentCategory = path[index]

    if (!parentCategory) {
      continue
    }

    childTree = {
      ...parentCategory,
      category_children: [childTree],
    }
  }

  return [childTree]
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

    return formatCategoryName(left).localeCompare(formatCategoryName(right))
  })
}

function isCategoryWithId(
  category: MedusaAdminProductCategory
): category is CategoryWithId {
  return typeof category.id === "string" && category.id.length > 0
}

function formatCategoryPath(path: MedusaAdminProductCategory[]) {
  if (!path.length) {
    return "-"
  }

  return path.map(formatCategoryName).filter(Boolean).join(" / ")
}

function formatCategoryName(category: MedusaAdminProductCategory) {
  return category.name ?? category.handle ?? category.id ?? "-"
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
