import { ArrowLeft, PencilSquare, Spinner, Trash } from "@medusajs/icons"
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Container,
  Drawer,
  Heading,
  IconButton,
  Input,
  Select,
  StatusBadge,
  Table,
  Text,
  Tooltip,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type Dispatch, type SetStateAction, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Link,
  type LoaderFunctionArgs,
  type UIMatch,
  useNavigate,
  useParams,
} from "react-router-dom"
import { BrandEditDrawer } from "../../../components/brands/brand-form"
import {
  type Brand,
  type BrandAttributeType,
  type BrandProductOption,
  type BrandResponse,
  brandQueryKeys,
  listBrandAttributeTypes,
  type ProductSummary,
  productQueryKeys,
  restoreBrand,
  retrieveBrand,
  retrieveBrandProductOptions,
  retrieveBrandProducts,
  setBrandProducts,
} from "../../../lib/brands"
import { translateBreadcrumb } from "../../../lib/breadcrumb"
import {
  getPaginationTranslations,
  onRowKeyboardActivate,
} from "../../../lib/table"
import { useDebouncedValue } from "../../../lib/use-debounced-value"

const PAGE_SIZE = 20
const PRODUCT_SELECTOR_PAGE_SIZE = 20

export async function loader({ params }: LoaderFunctionArgs) {
  const id = params.id

  if (!id) {
    return { brand: undefined }
  }

  return retrieveBrand(id)
}

export const handle = {
  breadcrumb: (match: UIMatch<BrandResponse>) =>
    match.data?.brand?.title ??
    match.data?.brand?.id ??
    translateBreadcrumb("brands:columns.brand", "Brand"),
}

const PRODUCT_ORDER_OPTIONS = [
  { labelKey: "orderOptions.titleAsc", value: "title" },
  { labelKey: "orderOptions.titleDesc", value: "-title" },
  { labelKey: "orderOptions.handleAsc", value: "handle" },
  { labelKey: "orderOptions.statusAsc", value: "status" },
  { labelKey: "orderOptions.newest", value: "-created_at" },
]

const ProductSelectionRows = ({
  currentBrandId,
  hasSearch,
  isLoading,
  onToggle,
  options,
  selectedIds,
}: {
  currentBrandId: string
  hasSearch: boolean
  isLoading: boolean
  onToggle: (productId: string) => void
  options: BrandProductOption[]
  selectedIds: Set<string>
}) => {
  const { t } = useTranslation("brands")

  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>
          <div className="flex items-center gap-2">
            <Spinner className="animate-spin" />
            <Text size="small">{t("status.loading")}</Text>
          </div>
        </Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  if (!options.length) {
    return (
      <Table.Row>
        <Table.Cell>
          {hasSearch ? t("products.emptySearch") : t("products.emptyOptions")}
        </Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return options.map(({ assigned_brand, product }) => {
    const isAssignedToAnotherBrand =
      !!assigned_brand && assigned_brand.id !== currentBrandId
    const tooltip = isAssignedToAnotherBrand
      ? t("products.alreadyLinkedTooltip", {
          title: assigned_brand.title,
        })
      : undefined

    return (
      <Table.Row
        className={
          isAssignedToAnotherBrand
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer"
        }
        key={product.id}
        onClick={() => {
          if (!isAssignedToAnotherBrand) {
            onToggle(product.id)
          }
        }}
      >
        <Table.Cell
          onClick={(event) => {
            event.stopPropagation()
          }}
        >
          <Checkbox
            checked={selectedIds.has(product.id)}
            disabled={isAssignedToAnotherBrand}
            onCheckedChange={() => {
              if (!isAssignedToAnotherBrand) {
                onToggle(product.id)
              }
            }}
          />
        </Table.Cell>
        <Table.Cell>
          {tooltip ? (
            <Tooltip content={tooltip} side="right">
              <span>{product.title ?? product.id}</span>
            </Tooltip>
          ) : (
            (product.title ?? product.id)
          )}
        </Table.Cell>
        <Table.Cell>{product.handle ?? "-"}</Table.Cell>
        <Table.Cell>{product.status ?? "-"}</Table.Cell>
      </Table.Row>
    )
  })
}

const ProductAssignmentDrawer = ({
  currentProductIds,
  onOpenChange,
  open,
  brandId,
}: {
  currentProductIds: string[]
  onOpenChange: (open: boolean) => void
  open: boolean
  brandId: string
}) => {
  const { t } = useTranslation("brands")
  const queryClient = useQueryClient()
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const debouncedQ = useDebouncedValue(q)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(currentProductIds)
  )

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(currentProductIds))
    }
  }, [currentProductIds, open])

  const params = {
    limit: PRODUCT_SELECTOR_PAGE_SIZE,
    offset: pageIndex * PRODUCT_SELECTOR_PAGE_SIZE,
    q: debouncedQ,
  }

  const { data, isLoading } = useQuery({
    enabled: open,
    placeholderData: (previousData) => previousData,
    queryFn: () => retrieveBrandProductOptions(brandId, params),
    queryKey: brandQueryKeys.productOptions(brandId, params),
  })

  const mutation = useMutation({
    mutationFn: () => setBrandProducts(brandId, [...selectedIds]),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveProductsFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.productsLists(brandId),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.detail(brandId),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypeDetails(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.productOptionsLists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.productLinksDetails(),
      })
      await queryClient.invalidateQueries({
        queryKey: productQueryKeys.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: productQueryKeys.lists(),
      })
      toast.success(t("toasts.brandProductsUpdated"))
      onOpenChange(false)
    },
  })
  const handleOpenChange = (nextOpen: boolean) => {
    if (!mutation.isPending) {
      onOpenChange(nextOpen)
    }
  }

  const productOptions = data?.products ?? []
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PRODUCT_SELECTOR_PAGE_SIZE), 1)
  const hasSearch = q.trim().length > 0

  const toggle = (productId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }
      return next
    })
  }

  return (
    <Drawer onOpenChange={handleOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("products.manageTitle")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder={t("search.products")}
            value={q}
          />
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-12" />
                <Table.HeaderCell>{t("columns.product")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.handle")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.status")}</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <ProductSelectionRows
                currentBrandId={brandId}
                hasSearch={hasSearch}
                isLoading={isLoading}
                onToggle={toggle}
                options={productOptions}
                selectedIds={selectedIds}
              />
            </Table.Body>
          </Table>
          <Table.Pagination
            canNextPage={pageIndex + 1 < pageCount}
            canPreviousPage={pageIndex > 0}
            count={count}
            nextPage={() => setPageIndex((current) => current + 1)}
            pageCount={pageCount}
            pageIndex={pageIndex}
            pageSize={PRODUCT_SELECTOR_PAGE_SIZE}
            previousPage={() =>
              setPageIndex((current) => Math.max(current - 1, 0))
            }
            translations={getPaginationTranslations(t)}
          />
          <Text className="text-ui-fg-subtle" size="small">
            {t("products.selectedCount", { count: selectedIds.size })}
          </Text>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex justify-end gap-2">
            <Button
              disabled={mutation.isPending}
              onClick={() => handleOpenChange(false)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              disabled={mutation.isPending}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
              size="small"
              type="button"
            >
              {t("actions.save")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const ProductRows = ({
  canManage,
  isLoading,
  onOpen,
  onRemove,
  products,
  removingProductId,
}: {
  canManage: boolean
  isLoading: boolean
  onOpen: (productId: string) => void
  onRemove: (product: ProductSummary) => void
  products: ProductSummary[]
  removingProductId?: string
}) => {
  const { t } = useTranslation("brands")

  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>
          <div className="flex items-center gap-2">
            <Spinner className="animate-spin" />
            <Text size="small">{t("status.loading")}</Text>
          </div>
        </Table.Cell>
        <Table.Cell />
        <Table.Cell />
        {canManage ? <Table.Cell /> : null}
      </Table.Row>
    )
  }

  if (!products.length) {
    return (
      <Table.Row>
        <Table.Cell>{t("products.emptyLinked")}</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        {canManage ? <Table.Cell /> : null}
      </Table.Row>
    )
  }

  return products.map((product) => (
    <Table.Row
      aria-label={t("detail.openProduct", {
        title: product.title ?? product.id,
      })}
      className="cursor-pointer"
      key={product.id}
      onClick={() => onOpen(product.id)}
      onKeyDown={onRowKeyboardActivate(() => onOpen(product.id))}
      role="button"
      tabIndex={0}
    >
      <Table.Cell>{product.title ?? product.id}</Table.Cell>
      <Table.Cell>{product.handle ?? "-"}</Table.Cell>
      <Table.Cell>
        {product.status ? <Badge size="2xsmall">{product.status}</Badge> : "-"}
      </Table.Cell>
      {canManage ? (
        <Table.Cell>
          <div className="flex justify-end">
            <IconButton
              aria-label={t("actions.remove")}
              disabled={removingProductId === product.id}
              onClick={(event) => {
                event.stopPropagation()
                onRemove(product)
              }}
              size="small"
              type="button"
              variant="transparent"
            >
              <Trash />
            </IconButton>
          </div>
        </Table.Cell>
      ) : null}
    </Table.Row>
  ))
}

const BrandProductsSection = ({
  canManage,
  count,
  isLoading,
  onManage,
  onOpenProduct,
  onRemove,
  productOrderBy,
  productQ,
  products,
  removingProductId,
  pageCount,
  pageIndex,
  setPageIndex,
  setProductOrderBy,
  setProductQ,
}: {
  canManage: boolean
  count: number
  isLoading: boolean
  onManage: () => void
  onOpenProduct: (productId: string) => void
  onRemove: (product: ProductSummary) => void
  productOrderBy: string
  productQ: string
  products: ProductSummary[]
  removingProductId?: string
  pageCount: number
  pageIndex: number
  setPageIndex: Dispatch<SetStateAction<number>>
  setProductOrderBy: (value: string) => void
  setProductQ: (value: string) => void
}) => {
  const { t } = useTranslation("brands")

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Heading level="h2">{t("products.title")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {t("detail.linkedProductsCount", { count })}
            </Text>
          </div>
          {canManage ? (
            <Button
              onClick={onManage}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.manage")}
            </Button>
          ) : null}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setProductQ(event.target.value)
            }}
            placeholder={t("search.products")}
            value={productQ}
          />
          <Select
            onValueChange={(value) => {
              setPageIndex(0)
              setProductOrderBy(value)
            }}
            value={productOrderBy}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {PRODUCT_ORDER_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("columns.product")}</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.handle")}</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.status")}</Table.HeaderCell>
            {canManage ? (
              <Table.HeaderCell className="w-[1%] text-right">
                {t("columns.actions")}
              </Table.HeaderCell>
            ) : null}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <ProductRows
            canManage={canManage}
            isLoading={isLoading}
            onOpen={onOpenProduct}
            onRemove={onRemove}
            products={products}
            removingProductId={removingProductId}
          />
        </Table.Body>
      </Table>
      <Table.Pagination
        canNextPage={pageIndex + 1 < pageCount}
        canPreviousPage={pageIndex > 0}
        count={count}
        nextPage={() => setPageIndex((current) => current + 1)}
        pageCount={pageCount}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        previousPage={() => setPageIndex((current) => Math.max(current - 1, 0))}
        translations={getPaginationTranslations(t)}
      />
    </Container>
  )
}

type BrandDetailContentProps = {
  attributeTypes: BrandAttributeType[]
  brand: Brand
  count: number
  editOpen: boolean
  isDeleted: boolean
  onEditOpenChange: Dispatch<SetStateAction<boolean>>
  brandId?: string
  onManageProducts: () => void
  onOpenProduct: (productId: string) => void
  onPageIndexChange: Dispatch<SetStateAction<number>>
  onProductOrderByChange: (value: string) => void
  onProductQueryChange: (value: string) => void
  onProductsOpenChange: Dispatch<SetStateAction<boolean>>
  onRemove: (product: ProductSummary) => void
  onRestore: () => void
  pageCount: number
  pageIndex: number
  productOrderBy: string
  productQ: string
  products: ProductSummary[]
  productIds: string[]
  productsLoading: boolean
  productsOpen: boolean
  removingProductId?: string
  restorePending: boolean
}

const BrandDetailContent = ({
  attributeTypes,
  brand,
  count,
  editOpen,
  isDeleted,
  onEditOpenChange,
  brandId,
  onManageProducts,
  onOpenProduct,
  onPageIndexChange,
  onProductOrderByChange,
  onProductQueryChange,
  onProductsOpenChange,
  onRemove,
  onRestore,
  pageCount,
  pageIndex,
  productOrderBy,
  productQ,
  products,
  productIds,
  productsLoading,
  productsOpen,
  removingProductId,
  restorePending,
}: BrandDetailContentProps) => {
  const { t } = useTranslation("brands")

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <IconButton asChild type="button" variant="transparent">
            <Link aria-label={t("detail.backToBrands")} to="/brands">
              <ArrowLeft />
            </Link>
          </IconButton>
          <Heading level="h1">{brand.title}</Heading>
          <StatusBadge color={brand.deleted_at ? "red" : "green"}>
            {brand.deleted_at ? t("status.deleted") : t("status.active")}
          </StatusBadge>
        </div>

        <Container className="divide-y p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <Heading level="h2">{t("detail.details")}</Heading>
              <Text className="text-ui-fg-subtle" size="small">
                {brand.handle}
              </Text>
            </div>
            {brand.deleted_at ? (
              <Button
                isLoading={restorePending}
                onClick={onRestore}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.restore")}
              </Button>
            ) : (
              <Button
                onClick={() => onEditOpenChange(true)}
                size="small"
                type="button"
                variant="secondary"
              >
                <PencilSquare />
                {t("actions.edit")}
              </Button>
            )}
          </div>
          <div className="grid gap-3 px-6 py-4 md:grid-cols-2">
            <div>
              <Text className="text-ui-fg-subtle" size="small">
                {t("detail.id")}
              </Text>
              <Text size="small">{brand.id}</Text>
            </div>
            <div>
              <Text className="text-ui-fg-subtle" size="small">
                {t("fields.handle")}
              </Text>
              <Text size="small">{brand.handle}</Text>
            </div>
            <div>
              <Text className="text-ui-fg-subtle" size="small">
                {t("detail.activeProducts")}
              </Text>
              <Text size="small">{brand.active_product_count}</Text>
            </div>
          </div>
          <div className="px-6 py-4">
            <Heading level="h2">{t("fields.gpsr")}</Heading>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsr_manufacturing_company_name")}
                </Text>
                <Text size="small">
                  {brand.gpsr_manufacturing_company_name ?? "-"}
                </Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsr_postal_address")}
                </Text>
                <Text size="small">{brand.gpsr_postal_address ?? "-"}</Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsr_contact_email")}
                </Text>
                <Text size="small">{brand.gpsr_contact_email ?? "-"}</Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsr_manufactured_outside_eu")}
                </Text>
                <Text size="small">
                  {brand.gpsr_manufactured_outside_eu
                    ? t("status.yes")
                    : t("status.no")}
                </Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t(
                    "fields.gpsr_european_reseller_manufacturing_company_name"
                  )}
                </Text>
                <Text size="small">
                  {brand.gpsr_european_reseller_manufacturing_company_name ??
                    "-"}
                </Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsr_european_reseller_postal_address")}
                </Text>
                <Text size="small">
                  {brand.gpsr_european_reseller_postal_address ?? "-"}
                </Text>
              </div>
              <div className="md:col-span-2">
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsr_european_reseller_contact_email")}
                </Text>
                <Text size="small">
                  {brand.gpsr_european_reseller_contact_email ?? "-"}
                </Text>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <Heading level="h2">{t("attributes.title")}</Heading>
            <div className="mt-3 grid gap-2">
              {brand.attributes.length ? (
                brand.attributes.map((attribute) => (
                  <div
                    className="grid grid-cols-[160px_1fr_auto] gap-3"
                    key={`${attribute.name}-${attribute.value}`}
                  >
                    <Text className="text-ui-fg-subtle" size="small">
                      {attribute.name}
                    </Text>
                    <Text size="small">{attribute.value}</Text>
                    {attribute.attribute_type_deleted_at ? (
                      <StatusBadge color="red">
                        {t("status.deleted")}
                      </StatusBadge>
                    ) : null}
                  </div>
                ))
              ) : (
                <Text className="text-ui-fg-subtle" size="small">
                  {t("attributes.empty")}
                </Text>
              )}
            </div>
          </div>
        </Container>

        <BrandProductsSection
          canManage={!isDeleted}
          count={count}
          isLoading={productsLoading}
          onManage={onManageProducts}
          onOpenProduct={onOpenProduct}
          onRemove={onRemove}
          pageCount={pageCount}
          pageIndex={pageIndex}
          productOrderBy={productOrderBy}
          productQ={productQ}
          products={products}
          removingProductId={removingProductId}
          setPageIndex={onPageIndexChange}
          setProductOrderBy={onProductOrderByChange}
          setProductQ={onProductQueryChange}
        />
      </div>

      <BrandEditDrawer
        attributeTypes={attributeTypes}
        brand={brand}
        onOpenChange={onEditOpenChange}
        open={!isDeleted && editOpen}
      />
      {brandId ? (
        <ProductAssignmentDrawer
          brandId={brandId}
          currentProductIds={productIds}
          onOpenChange={onProductsOpenChange}
          open={!isDeleted && productsOpen}
        />
      ) : null}
    </>
  )
}

const BrandDetailPage = () => {
  const { t } = useTranslation("brands")
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [editOpen, setEditOpen] = useState(false)
  const [productsOpen, setProductsOpen] = useState(false)
  const [pageIndex, setPageIndex] = useState(0)
  const [productOrderBy, setProductOrderBy] = useState("title")
  const [productQ, setProductQ] = useState("")
  const debouncedProductQ = useDebouncedValue(productQ)

  const brandQuery = useQuery({
    enabled: !!id,
    queryFn: () => {
      if (!id) {
        throw new Error(t("errors.brandIdRequired"))
      }
      return retrieveBrand(id)
    },
    queryKey: brandQueryKeys.detail(id),
  })
  const brand = brandQuery.data?.brand
  const isDeleted = !!brand?.deleted_at

  const productParams = {
    limit: PAGE_SIZE,
    offset: pageIndex * PAGE_SIZE,
    order_by: productOrderBy,
    q: debouncedProductQ,
  }

  const productsQuery = useQuery({
    enabled: !!id && !!brand,
    placeholderData: (previousData) => previousData,
    queryFn: () => {
      if (!id) {
        throw new Error(t("errors.brandIdRequired"))
      }
      return retrieveBrandProducts(id, productParams)
    },
    queryKey: brandQueryKeys.products(id, productParams),
  })

  const products = productsQuery.data?.products ?? []
  const productIds = productsQuery.data?.product_ids ?? []
  const count = productsQuery.data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)
  const attributeTypesParams = {
    include_deleted: true,
    limit: 100,
    offset: 0,
    order_by: "name",
  }
  const attributeTypesQuery = useQuery({
    queryFn: () => listBrandAttributeTypes(attributeTypesParams),
    queryKey: brandQueryKeys.attributeTypes(attributeTypesParams),
  })
  const attributeTypes = attributeTypesQuery.data?.attribute_types ?? []
  const restoreMutation = useMutation({
    mutationFn: restoreBrand,
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.restoreBrandFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.detail(id),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypeDetails(),
      })
      toast.success(t("toasts.brandRestored"))
    },
  })

  const removeProductMutation = useMutation({
    mutationFn: (productId: string) =>
      setBrandProducts(
        id ?? "",
        productIds.filter((currentId) => currentId !== productId)
      ),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.removeProductFailed")
      )
    },
    onSuccess: async (_response, productId) => {
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.productsLists(id),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.detail(id),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypeDetails(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.productOptionsLists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.productLinksDetails(),
      })
      await queryClient.invalidateQueries({
        queryKey: productQueryKeys.detail(productId),
      })
      await queryClient.invalidateQueries({
        queryKey: productQueryKeys.lists(),
      })
      toast.success(t("toasts.productRemoved"))
    },
  })

  const handleRemoveProduct = async (product: ProductSummary) => {
    const confirmed = await prompt({
      cancelText: t("actions.cancel"),
      confirmText: t("actions.remove"),
      description: t("prompts.removeProductDescription", {
        title: product.title ?? product.id,
      }),
      title: t("prompts.removeProductTitle"),
    })

    if (confirmed) {
      removeProductMutation.mutate(product.id)
    }
  }

  if (brandQuery.error) {
    return (
      <Container>
        <Alert variant="error">{t("errors.loadBrandFailed")}</Alert>
      </Container>
    )
  }

  if (brandQuery.isLoading || !brand) {
    return (
      <Container className="flex items-center justify-center gap-2 py-8">
        <Spinner className="animate-spin" />
        <Text size="small">{t("status.loading")}</Text>
      </Container>
    )
  }

  return (
    <BrandDetailContent
      attributeTypes={attributeTypes}
      brand={brand}
      brandId={id}
      count={count}
      editOpen={editOpen}
      isDeleted={isDeleted}
      onEditOpenChange={setEditOpen}
      onManageProducts={() => setProductsOpen(true)}
      onOpenProduct={(productId) => navigate(`/products/${productId}`)}
      onPageIndexChange={setPageIndex}
      onProductOrderByChange={setProductOrderBy}
      onProductQueryChange={setProductQ}
      onProductsOpenChange={setProductsOpen}
      onRemove={handleRemoveProduct}
      onRestore={() => restoreMutation.mutate(brand.id)}
      pageCount={pageCount}
      pageIndex={pageIndex}
      productIds={productIds}
      productOrderBy={productOrderBy}
      productQ={productQ}
      products={products}
      productsLoading={productsQuery.isLoading}
      productsOpen={productsOpen}
      removingProductId={removeProductMutation.variables}
      restorePending={restoreMutation.isPending}
    />
  )
}

export default BrandDetailPage
