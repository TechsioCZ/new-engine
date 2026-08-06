import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Spinner } from "@medusajs/icons"
import {
  Alert,
  Badge,
  Button,
  Container,
  createDataTableColumnHelper,
  Drawer,
  Heading,
  Input,
  Text,
  toast,
} from "@medusajs/ui"
import type { DataTableColumnDef } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { BrandDataTable } from "../components/brands/brand-data-table"
import {
  isBrandSelectable,
  shouldSubmitProductBrandSelection,
} from "../components/brands/brand-table-state"
import {
  ProductAttributesContent,
  ProductAttributesDrawer,
} from "../components/product-attributes/product-attributes-panel"
import {
  brandQueryKeys,
  listBrands,
  productQueryKeys,
  retrieveProductBrands,
  setProductBrands,
} from "../lib/brands"
import type { Brand } from "../lib/brands"
import {
  productAttributeQueryKeys,
  retrieveProductAttributes,
} from "../lib/product-attributes"
import type { ProductAttributeDetailItem } from "../lib/product-attributes"
import { useDebouncedValue } from "../lib/use-debounced-value"

type ProductBrandsWidgetProps = Partial<DetailWidgetProps<AdminProduct>>

type TranslateKey = (key: string) => string

const PAGE_SIZE = 20

const brandColumnHelper = createDataTableColumnHelper<Brand>()

const hasDeletionTimestamp = (deletedAt: string | null | undefined): boolean =>
  deletedAt !== null && deletedAt !== undefined

const orderBrandsByStatus = (brands: Brand[]): Brand[] => {
  const active: Brand[] = []
  const deleted: Brand[] = []

  for (const brand of brands) {
    if (hasDeletionTimestamp(brand.deleted_at)) {
      deleted.push(brand)
    } else {
      active.push(brand)
    }
  }

  return [...active, ...deleted]
}

const toEditableAttributeItems = (
  items: ProductAttributeDetailItem[],
): ProductAttributeDetailItem[] => {
  const editable: ProductAttributeDetailItem[] = []

  for (const item of items) {
    if (hasDeletionTimestamp(item.definition.deleted_at)) {
      continue
    }

    editable.push(
      hasDeletionTimestamp(item.selected_option?.deleted_at)
        ? { ...item, assignment: null, selected_option: null }
        : item,
    )
  }

  return editable
}

const BrandLinkContent = ({
  error,
  isLoading,
  brands,
}: {
  error: Error | null
  isLoading: boolean
  brands: Brand[]
}) => {
  const { t } = useTranslation("brands")

  if (error !== null) {
    return <Alert variant="error">{t("widget.loadFailed")}</Alert>
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Spinner className="animate-spin" />
        <Text size="small">{t("status.loading")}</Text>
      </div>
    )
  }

  if (brands.length === 0) {
    return (
      <Text className="text-ui-fg-subtle" size="small">
        {t("widget.empty")}
      </Text>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {brands.map((brand) => {
        const isDeleted = hasDeletionTimestamp(brand.deleted_at)

        return (
          <div
            className="flex items-center justify-between gap-3"
            key={brand.id}
          >
            <Text
              className={isDeleted ? "text-ui-fg-subtle" : undefined}
              size="small"
            >
              <Link to={`/brands/${brand.id}`}>{brand.title}</Link>
            </Text>
            <div className="flex items-center gap-2">
              {isDeleted ? (
                <Badge color="orange" size="2xsmall">
                  {t("status.inactive")}
                </Badge>
              ) : null}
              <Badge size="2xsmall">{brand.handle}</Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const getActiveBrand = (brand: Brand | undefined): Brand | undefined => {
  if (brand === undefined || hasDeletionTimestamp(brand.deleted_at)) {
    return undefined
  }

  return brand
}

const useBrandSelection = (currentBrand: Brand | undefined, open: boolean) => {
  const activeCurrentBrand = getActiveBrand(currentBrand)
  const [selectedId, setSelectedId] = useState<string | undefined>(
    activeCurrentBrand?.id,
  )
  const [selectedBrandSnapshot, setSelectedBrandSnapshot] = useState<
    Brand | undefined
  >(activeCurrentBrand)
  const previous = useRef({
    deletedAt: currentBrand?.deleted_at,
    id: currentBrand?.id,
    open: false,
  })

  useEffect(() => {
    const current = {
      deletedAt: currentBrand?.deleted_at,
      id: currentBrand?.id,
      open,
    }
    const shouldReset =
      open &&
      (!previous.current.open ||
        previous.current.id !== current.id ||
        previous.current.deletedAt !== current.deletedAt)

    if (shouldReset) {
      const activeBrand = getActiveBrand(currentBrand)
      setSelectedId(activeBrand?.id)
      setSelectedBrandSnapshot(activeBrand)
    }
    previous.current = current
  }, [currentBrand, open])

  return {
    selectedBrandSnapshot,
    selectedId,
    setSelectedBrandSnapshot,
    setSelectedId,
  }
}

const findSelectedBrand = (
  brands: Brand[],
  selectedId: string | undefined,
  selectedBrandSnapshot: Brand | undefined,
): Brand | undefined => {
  const listedBrand = brands.find((brand) => brand.id === selectedId)

  if (listedBrand !== undefined) {
    return listedBrand
  }

  if (selectedBrandSnapshot?.id === selectedId) {
    return selectedBrandSnapshot
  }

  return undefined
}

const SelectedBrandGpsrDetails = ({ brand }: { brand: Brand | undefined }) => {
  const { t } = useTranslation("brands")

  if (brand === undefined) {
    return null
  }

  return (
    <Container className="px-4 py-3">
      <Text size="small" weight="plus">
        {t("fields.gpsr")}
      </Text>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
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
            {brand.gpsr_manufactured_outside_eu === true
              ? t("status.yes")
              : t("status.no")}
          </Text>
        </div>
        <div>
          <Text className="text-ui-fg-subtle" size="small">
            {t("fields.gpsr_european_reseller_manufacturing_company_name")}
          </Text>
          <Text size="small">
            {brand.gpsr_european_reseller_manufacturing_company_name ?? "-"}
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
    </Container>
  )
}

const buildBrandColumns = ({
  isPending,
  onClearSelection,
  onSelectBrand,
  selectedId,
  t,
}: {
  isPending: boolean
  onClearSelection: () => void
  onSelectBrand: (brand: Brand) => void
  selectedId: string | undefined
  t: TranslateKey
}): DataTableColumnDef<Brand>[] => [
  {
    accessorFn: (brand: Brand): unknown => brand.title,
    cell: ({ row }) => (
      <span
        className={
          hasDeletionTimestamp(row.original.deleted_at)
            ? "opacity-60"
            : undefined
        }
      >
        {row.original.title}
      </span>
    ),
    header: t("columns.brand"),
    id: "title",
  },
  {
    accessorFn: (brand: Brand): unknown => brand.handle,
    header: t("columns.handle"),
    id: "handle",
  },
  brandColumnHelper.display({
    cell: ({ row }) =>
      row.original.id === selectedId ? (
        <Badge size="2xsmall">{t("status.selected")}</Badge>
      ) : (
        "-"
      ),
    header: t("columns.status"),
    id: "status",
  }),
  brandColumnHelper.action({
    actions: ({ row }) => {
      const isSelected = row.original.id === selectedId

      if (hasDeletionTimestamp(row.original.deleted_at) || isPending) {
        return []
      }

      return [
        {
          label: isSelected ? t("actions.clear") : t("actions.select"),
          onClick: () => {
            if (isSelected) {
              onClearSelection()
              return
            }

            onSelectBrand(row.original)
          },
        },
      ]
    },
  }),
]

const BrandAssignmentDrawer = ({
  currentBrand,
  onOpenChange,
  open,
  productId,
}: {
  currentBrand?: Brand | undefined
  onOpenChange: (open: boolean) => void
  open: boolean
  productId: string
}) => {
  const { t } = useTranslation("brands")
  const queryClient = useQueryClient()
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const debouncedQ = useDebouncedValue(q)
  const {
    selectedBrandSnapshot,
    selectedId,
    setSelectedBrandSnapshot,
    setSelectedId,
  } = useBrandSelection(currentBrand, open)

  const params = {
    include_deleted: false,
    limit: PAGE_SIZE,
    offset: pageIndex * PAGE_SIZE,
    order_by: "title",
    q: debouncedQ,
  }

  const { data, error, isLoading } = useQuery({
    enabled: open,
    queryFn: async () => await listBrands(params),
    queryKey: brandQueryKeys.list(params),
  })
  const mutation = useMutation({
    mutationFn: async (submittedBrandId: string | undefined) =>
      await setProductBrands(productId, submittedBrandId),
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : t("errors.saveBrandFailed"),
      )
    },
    onSuccess: async (_, submittedBrandId) => {
      const affectedBrandIds = new Set(
        [currentBrand?.id, submittedBrandId].filter(
          (id): id is string => id !== undefined,
        ),
      )

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.productLinks(productId),
        }),
        queryClient.invalidateQueries({
          queryKey: productQueryKeys.detail(productId),
        }),
        queryClient.invalidateQueries({
          queryKey: productQueryKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.productOptionsLists(),
        }),
        ...[...affectedBrandIds].map(async (brandId) => {
          await queryClient.invalidateQueries({
            queryKey: brandQueryKeys.detail(brandId),
          })
        }),
      ])
      toast.success(t("toasts.productBrandUpdated"))
      onOpenChange(false)
    },
  })
  const handleOpenChange = (nextOpen: boolean) => {
    if (!mutation.isPending) {
      onOpenChange(nextOpen)
    }
  }

  const manageTitle = t("widget.manageTitle")
  const brands = orderBrandsByStatus(data?.brands ?? [])
  const selectedBrand = findSelectedBrand(
    brands,
    selectedId,
    selectedBrandSnapshot,
  )
  const count = data?.count ?? 0
  const hasSelection = selectedId !== undefined && selectedId.length > 0
  const clearSelection = () => {
    setSelectedId(undefined)
    setSelectedBrandSnapshot(undefined)
  }
  const selectBrand = (brand: Brand) => {
    setSelectedId(brand.id)
    setSelectedBrandSnapshot(brand)
  }
  const saveSelection = () => {
    if (!shouldSubmitProductBrandSelection(currentBrand, selectedId)) {
      handleOpenChange(false)
      return
    }

    mutation.mutate(selectedId)
  }
  const columns = buildBrandColumns({
    isPending: mutation.isPending,
    onClearSelection: clearSelection,
    onSelectBrand: selectBrand,
    selectedId,
    t,
  })

  return (
    <Drawer onOpenChange={handleOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{manageTitle}</Drawer.Title>
        </Drawer.Header>
        <div className="flex flex-col gap-3 border-ui-border-base border-b px-6 py-4">
          <Container className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <Text size="small" weight="plus">
                {t("widget.selectedBrand")}
              </Text>
              <Text className="text-ui-fg-subtle" size="small">
                {selectedBrand?.title ?? t("widget.none")}
              </Text>
            </div>
            <Button
              disabled={!hasSelection || mutation.isPending}
              onClick={clearSelection}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.clear")}
            </Button>
          </Container>
          {hasDeletionTimestamp(currentBrand?.deleted_at) ? (
            <Alert variant="warning">
              {t("widget.inactiveSelectionWarning")}
            </Alert>
          ) : null}
        </div>
        <Drawer.Body className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <SelectedBrandGpsrDetails brand={selectedBrand} />
          <Input
            disabled={mutation.isPending}
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder={t("search.brands")}
            value={q}
          />
          {error ? (
            <Alert variant="error">{t("errors.loadBrandsFailed")}</Alert>
          ) : (
            <div className="min-h-[22rem]">
              <BrandDataTable
                columns={columns}
                count={count}
                data={brands}
                emptyState={{
                  empty: {
                    description: t("brands.empty"),
                    heading: manageTitle,
                  },
                  filtered: {
                    description: t("brands.empty"),
                    heading: manageTitle,
                  },
                }}
                getRowId={(brand) => brand.id}
                isLoading={isLoading}
                onPageIndexChange={(nextPageIndex) => {
                  if (!mutation.isPending) {
                    setPageIndex(nextPageIndex)
                  }
                }}
                onRowClick={(_event, brand) => {
                  if (
                    !isBrandSelectable(brand, selectedId, mutation.isPending)
                  ) {
                    return
                  }

                  selectBrand(brand)
                }}
                pageIndex={pageIndex}
                pageSize={PAGE_SIZE}
              />
            </div>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex justify-end gap-2">
            <Button
              disabled={mutation.isPending}
              onClick={() => {
                handleOpenChange(false)
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              disabled={mutation.isPending}
              isLoading={mutation.isPending}
              onClick={saveSelection}
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

const ProductBrandsWidget = ({ data: product }: ProductBrandsWidgetProps) => {
  const { t } = useTranslation("brands")
  const { t: attributeT } = useTranslation("productAttributes")
  const [brandDrawerOpen, setBrandDrawerOpen] = useState(false)
  const [attributeDrawerOpen, setAttributeDrawerOpen] = useState(false)
  const productId = product?.id
  const hasProductId = productId !== undefined && productId.length > 0

  const brandQuery = useQuery({
    enabled: hasProductId,
    queryFn: async () => {
      if (productId === undefined || productId.length === 0) {
        throw new Error(t("errors.productIdRequired"))
      }

      return await retrieveProductBrands(productId)
    },
    queryKey: brandQueryKeys.productLinks(productId),
  })
  const attributeQuery = useQuery({
    enabled: hasProductId,
    queryFn: async () => await retrieveProductAttributes(productId ?? ""),
    queryKey: productAttributeQueryKeys.product(productId),
  })

  if (productId === undefined || productId.length === 0) {
    return null
  }

  const brands = orderBrandsByStatus(brandQuery.data?.brands ?? [])
  const attributeItems = attributeQuery.data?.product_attributes ?? []
  const editableAttributeItems = toEditableAttributeItems(attributeItems)
  const activeBrand = brands.find(
    (brand) => !hasDeletionTimestamp(brand.deleted_at),
  )
  const hasInactiveBrand = brands.some((brand) =>
    hasDeletionTimestamp(brand.deleted_at),
  )
  let statusText = t("products.notLinked")

  if (hasInactiveBrand) {
    statusText = t("products.inactiveLinked")
  }

  if (activeBrand !== undefined) {
    statusText = t("products.linked")
  }

  return (
    <>
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">{t("widget.productDetailsTitle")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("widget.productDetailsDescription")}
          </Text>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3 px-6 py-4">
            <div className="flex flex-col gap-1">
              <Text leading="compact" size="small" weight="plus">
                {t("widget.title")}
              </Text>
              <Text
                className="text-ui-fg-subtle"
                leading="compact"
                size="small"
              >
                {statusText}
              </Text>
            </div>
            <Button
              onClick={() => {
                setBrandDrawerOpen(true)
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.edit")}
            </Button>
          </div>
          <div className="px-6 pb-4">
            <BrandLinkContent
              brands={brands}
              error={brandQuery.error}
              isLoading={brandQuery.isLoading}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3 px-6 py-4">
            <div className="flex flex-col gap-1">
              <Text leading="compact" size="small" weight="plus">
                {attributeT("widget.title")}
              </Text>
              <Text className="text-ui-fg-subtle" size="small">
                {attributeT("widget.description")}
              </Text>
            </div>
            <Button
              onClick={() => {
                setAttributeDrawerOpen(true)
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {attributeT("actions.edit")}
            </Button>
          </div>
          <div className="px-6 pb-4">
            <ProductAttributesContent
              error={attributeQuery.error}
              isLoading={attributeQuery.isLoading}
              items={attributeItems}
            />
          </div>
        </div>
      </Container>
      <BrandAssignmentDrawer
        currentBrand={activeBrand ?? brands[0]}
        onOpenChange={setBrandDrawerOpen}
        open={brandDrawerOpen}
        productId={productId}
      />
      {attributeDrawerOpen ? (
        <ProductAttributesDrawer
          items={editableAttributeItems}
          onOpenChange={setAttributeDrawerOpen}
          open={attributeDrawerOpen}
          productId={productId}
        />
      ) : null}
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductBrandsWidget
