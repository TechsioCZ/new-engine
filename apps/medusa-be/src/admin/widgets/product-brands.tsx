import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import {
  type Brand,
  brandQueryKeys,
  listBrands,
  retrieveProductBrands,
  setProductBrands,
} from "../lib/brands"
import { getPaginationTranslations } from "../lib/table"
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

const BrandSelectionRows = ({
  currentBrandId,
  isLoading,
  onClear,
  onSelect,
  brands,
}: {
  currentBrandId?: string
  isLoading: boolean
  onClear: () => void
  onSelect: (brandId: string) => void
  brands: Brand[]
}) => {
  const { t } = useTranslation("brands")

  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>{t("status.loading")}</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  if (!brands.length) {
    return (
      <Table.Row>
        <Table.Cell>{t("brands.empty")}</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return brands.map((brand) => {
    const isSelected = brand.id === currentBrandId

    return (
      <Table.Row
        className={isSelected ? undefined : "cursor-pointer"}
        key={brand.id}
        onClick={() => {
          if (!isSelected) {
            onSelect(brand.id)
          }
        }}
      >
        <Table.Cell>{brand.title}</Table.Cell>
        <Table.Cell>{brand.handle}</Table.Cell>
        <Table.Cell>
          {isSelected ? (
            <Badge size="2xsmall">{t("status.selected")}</Badge>
          ) : (
            "-"
          )}
        </Table.Cell>
        <Table.Cell>
          <div className="flex justify-end">
            <Button
              onClick={(event) => {
                event.stopPropagation()
                if (isSelected) {
                  onClear()
                } else {
                  onSelect(brand.id)
                }
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {isSelected ? t("actions.clear") : t("actions.select")}
            </Button>
          </div>
        </Table.Cell>
      </Table.Row>
    )
  })
}

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
    return (
      <Text className="text-ui-fg-error" size="small">
        {t("widget.loadFailed")}
      </Text>
    )
  }

  if (isLoading) {
    return <Text size="small">{t("status.loading")}</Text>
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
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => currentBrand?.id
  )

  useEffect(() => {
    if (open) {
      setSelectedId(currentBrand?.id)
    }
  }, [currentBrand?.id, open])

  const params = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      order_by: "title",
      q: debouncedQ,
    }),
    [debouncedQ, pageIndex]
  )

  const { data, isLoading } = useQuery({
    enabled: open,
    queryFn: () => listBrands(params),
    queryKey: brandQueryKeys.list(params),
  })

  const mutation = useMutation({
    mutationFn: () => setProductBrands(productId, selectedId),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveBrandFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.productLinks(productId),
      })
      await queryClient.invalidateQueries({ queryKey: ["product", productId] })
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.details(),
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
      toast.success(t("toasts.productBrandUpdated"))
      onOpenChange(false)
    },
  })

  const brands = [...(data?.brands ?? [])].sort(
    (first, second) => Number(!!first.deleted_at) - Number(!!second.deleted_at)
  )
  const selectedBrand =
    brands.find((brand) => brand.id === selectedId) ??
    (currentBrand?.id === selectedId ? currentBrand : undefined)
  const selectedBrandDetails = selectedBrand ?? currentBrand
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
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
              disabled={!selectedId}
              onClick={() => setSelectedId(undefined)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.clear")}
            </Button>
          </Container>
          {selectedBrandDetails ? (
            <Container className="px-4 py-3">
              <Text size="small" weight="plus">
                GPSR
              </Text>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <div>
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("fields.gpsrManufacturingCompanyName")}
                  </Text>
                  <Text size="small">
                    {selectedBrandDetails.gpsrManufacturingCompanyName ?? "-"}
                  </Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("fields.gpsrPostalAddress")}
                  </Text>
                  <Text size="small">
                    {selectedBrandDetails.gpsrPostalAddress ?? "-"}
                  </Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("fields.gpsrContactEmail")}
                  </Text>
                  <Text size="small">
                    {selectedBrandDetails.gpsrContactEmail ?? "-"}
                  </Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("fields.gpsrManufacturedOutsideEu")}
                  </Text>
                  <Text size="small">
                    {selectedBrandDetails.gpsrManufacturedOutsideEu
                      ? t("status.selected")
                      : "-"}
                  </Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("fields.gpsrEuropeanResellerManufacturingCompanyName")}
                  </Text>
                  <Text size="small">
                    {selectedBrandDetails.gpsrEuropeanResellerManufacturingCompanyName ??
                      "-"}
                  </Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("fields.gpsrEuropeanResellerPostalAddress")}
                  </Text>
                  <Text size="small">
                    {selectedBrandDetails.gpsrEuropeanResellerPostalAddress ??
                      "-"}
                  </Text>
                </div>
                <div className="md:col-span-2">
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("fields.gpsrEuropeanResellerContactEmail")}
                  </Text>
                  <Text size="small">
                    {selectedBrandDetails.gpsrEuropeanResellerContactEmail ??
                      "-"}
                  </Text>
                </div>
              </div>
            </Container>
          ) : null}
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder={t("search.brands")}
            value={q}
          />
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("columns.brand")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.handle")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.status")}</Table.HeaderCell>
                <Table.HeaderCell className="w-[1%] text-right">
                  {t("columns.actions")}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <BrandSelectionRows
                brands={brands}
                currentBrandId={selectedId}
                isLoading={isLoading}
                onClear={() => setSelectedId(undefined)}
                onSelect={setSelectedId}
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
            previousPage={() =>
              setPageIndex((current) => Math.max(current - 1, 0))
            }
            translations={getPaginationTranslations(t)}
          />
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.cancel")}
            </Button>
            <Button
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
        currentBrand={activeBrand}
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
