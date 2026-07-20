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
  type Brand,
  brandQueryKeys,
  listBrands,
  productQueryKeys,
  retrieveProductBrands,
  setProductBrands,
} from "../lib/brands"
import { useDebouncedValue } from "../lib/use-debounced-value"

type ProductBrandsWidgetProps = Partial<DetailWidgetProps<AdminProduct>>

const PAGE_SIZE = 20
const SUPPLIER_ATTRIBUTE_NAME = "supplier"

const getBrandAttributeValue = (
  brand: Brand | undefined,
  attributeName: string
) =>
  brand?.attributes.find(
    (attribute) => attribute.name.toLowerCase() === attributeName
  )?.value

const brandColumnHelper = createDataTableColumnHelper<Brand>()

const BrandLinkContent = ({
  error,
  isLoading,
  brands,
}: {
  error: unknown
  isLoading: boolean
  brands: Brand[]
}) => {
  const { t } = useTranslation("brands")

  if (error) {
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

  if (!brands.length) {
    return (
      <Text className="text-ui-fg-subtle" size="small">
        {t("widget.empty")}
      </Text>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {brands.map((brand) => {
        const isDeleted = !!brand.deleted_at

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

const getActiveBrand = (brand: Brand | undefined) => {
  if (brand?.deleted_at) {
    return
  }

  return brand
}

const useBrandSelection = (currentBrand: Brand | undefined, open: boolean) => {
  const activeCurrentBrand = getActiveBrand(currentBrand)
  const [selectedId, setSelectedId] = useState<string | undefined>(
    activeCurrentBrand?.id
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
  selectedBrandSnapshot: Brand | undefined
) => {
  const listedBrand = brands.find((brand) => brand.id === selectedId)
  if (listedBrand) {
    return listedBrand
  }
  if (selectedBrandSnapshot?.id === selectedId) {
    return selectedBrandSnapshot
  }

  return
}

const SelectedBrandGpsrDetails = ({ brand }: { brand: Brand | undefined }) => {
  const { t } = useTranslation("brands")

  if (!brand) {
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
            {brand.gpsr_manufactured_outside_eu
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

const BrandAssignmentDrawer = ({
  currentBrand,
  onOpenChange,
  open,
  productId,
}: {
  currentBrand?: Brand
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
    queryFn: () => listBrands(params),
    queryKey: brandQueryKeys.list(params),
  })

  const mutation = useMutation({
    mutationFn: (submittedBrandId: string | undefined) =>
      setProductBrands(productId, submittedBrandId),
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : t("errors.saveBrandFailed")
      )
    },
    onSuccess: async (_, submittedBrandId) => {
      const affectedBrandIds = new Set(
        [currentBrand?.id, submittedBrandId].filter(
          (id): id is string => id !== undefined
        )
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
        ...[...affectedBrandIds].map((brandId) =>
          queryClient.invalidateQueries({
            queryKey: brandQueryKeys.detail(brandId),
          })
        ),
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

  const brands = [...(data?.brands ?? [])].sort(
    (first, second) => Number(!!first.deleted_at) - Number(!!second.deleted_at)
  )
  const selectedBrand = findSelectedBrand(
    brands,
    selectedId,
    selectedBrandSnapshot
  )
  const count = data?.count ?? 0
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
  const columns = [
    brandColumnHelper.accessor("title", {
      header: t("columns.brand"),
      cell: ({ row }) => (
        <span className={row.original.deleted_at ? "opacity-60" : undefined}>
          {row.original.title}
        </span>
      ),
    }),
    brandColumnHelper.accessor("handle", {
      header: t("columns.handle"),
    }),
    brandColumnHelper.display({
      id: "status",
      header: t("columns.status"),
      cell: ({ row }) =>
        row.original.id === selectedId ? (
          <Badge size="2xsmall">{t("status.selected")}</Badge>
        ) : (
          "-"
        ),
    }),
    brandColumnHelper.action({
      actions: ({ row }) => {
        const isSelected = row.original.id === selectedId

        if (row.original.deleted_at || mutation.isPending) {
          return []
        }

        return [
          {
            label: isSelected ? t("actions.clear") : t("actions.select"),
            onClick: () =>
              isSelected ? clearSelection() : selectBrand(row.original),
          },
        ]
      },
    }),
  ]

  return (
    <Drawer onOpenChange={handleOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("widget.manageTitle")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
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
              disabled={!selectedId || mutation.isPending}
              onClick={clearSelection}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.clear")}
            </Button>
          </Container>
          {currentBrand?.deleted_at ? (
            <Alert variant="warning">
              {t("widget.inactiveSelectionWarning")}
            </Alert>
          ) : null}
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
            <BrandDataTable
              columns={columns}
              count={count}
              data={brands}
              emptyState={{
                empty: {
                  description: t("brands.empty"),
                  heading: t("widget.manageTitle"),
                },
                filtered: {
                  description: t("brands.empty"),
                  heading: t("widget.manageTitle"),
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
                if (!isBrandSelectable(brand, selectedId, mutation.isPending)) {
                  return
                }

                selectBrand(brand)
              }}
              pageIndex={pageIndex}
              pageSize={PAGE_SIZE}
            />
          )}
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
  const [open, setOpen] = useState(false)

  const { data, error, isLoading } = useQuery({
    enabled: !!product?.id,
    queryFn: () => {
      if (!product?.id) {
        throw new Error(t("errors.productIdRequired"))
      }
      return retrieveProductBrands(product.id)
    },
    queryKey: brandQueryKeys.productLinks(product?.id),
  })

  if (!product?.id) {
    return null
  }

  const brands = [...(data?.brands ?? [])].sort(
    (first, second) => Number(!!first.deleted_at) - Number(!!second.deleted_at)
  )
  const activeBrand = brands.find((brand) => !brand.deleted_at)
  const hasInactiveBrand = brands.some((brand) => brand.deleted_at)
  const activeBrandSupplier = getBrandAttributeValue(
    activeBrand,
    SUPPLIER_ATTRIBUTE_NAME
  )
  const supplier =
    activeBrandSupplier && activeBrandSupplier.trim().length > 0
      ? activeBrandSupplier.trim()
      : brands
          .filter((brand) => brand.id !== activeBrand?.id)
          .map((brand) =>
            getBrandAttributeValue(brand, SUPPLIER_ATTRIBUTE_NAME)
          )
          .map((value) => value?.trim())
          .find((value): value is string => !!value)
  let statusText = t("products.notLinked")

  if (hasInactiveBrand) {
    statusText = t("products.inactiveLinked")
  }

  if (activeBrand) {
    statusText = t("products.linked")
  }

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">{t("widget.title")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {statusText}
            </Text>
          </div>
          <Button
            onClick={() => setOpen(true)}
            size="small"
            type="button"
            variant="secondary"
          >
            {t("actions.edit")}
          </Button>
        </div>
        <div className="flex flex-col gap-2 px-6 py-4">
          <BrandLinkContent
            brands={brands}
            error={error}
            isLoading={isLoading}
          />
        </div>
        <div className="flex items-center justify-between gap-3 px-6 py-4">
          <Text size="small" weight="plus">
            {t("fields.supplier")}
          </Text>
          <Text className="text-ui-fg-subtle" size="small">
            {supplier ?? "-"}
          </Text>
        </div>
      </Container>
      <BrandAssignmentDrawer
        currentBrand={activeBrand ?? brands[0]}
        onOpenChange={setOpen}
        open={open}
        productId={product.id}
      />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductBrandsWidget
