import { ArrowLeft, PencilSquare, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Drawer,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  StatusBadge,
  Table,
  Text,
  Tooltip,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
  Link,
  type LoaderFunctionArgs,
  type UIMatch,
  useNavigate,
  useParams,
} from "react-router-dom"
import {
  type Brand,
  type BrandAttribute,
  type BrandAttributeType,
  type BrandInput,
  type BrandProductOption,
  type BrandResponse,
  brandQueryKeys,
  listBrandAttributeTypes,
  type ProductSummary,
  restoreBrand,
  retrieveBrand,
  retrieveBrandProductOptions,
  retrieveBrandProducts,
  setBrandProducts,
  updateBrand,
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

const emptyAttribute = (
  attributeTypes: BrandAttributeType[] = [],
  selectedNames = new Set<string>()
): BrandAttribute => ({
  name:
    attributeTypes.find(
      (attributeType) =>
        !(attributeType.deleted_at || selectedNames.has(attributeType.name))
    )?.name ?? "",
  value: "",
})

const toFormState = (brand?: Brand): BrandInput => ({
  attributes: brand?.attributes.length
    ? brand.attributes.filter(
        (attribute) => !attribute.attribute_type_deleted_at
      )
    : [],
  gpsrContactEmail: brand?.gpsrContactEmail ?? "",
  gpsrEuropeanResellerContactEmail:
    brand?.gpsrEuropeanResellerContactEmail ?? "",
  gpsrEuropeanResellerManufacturingCompanyName:
    brand?.gpsrEuropeanResellerManufacturingCompanyName ?? "",
  gpsrEuropeanResellerPostalAddress:
    brand?.gpsrEuropeanResellerPostalAddress ?? "",
  gpsrManufacturedOutsideEu: brand?.gpsrManufacturedOutsideEu ?? false,
  gpsrManufacturingCompanyName: brand?.gpsrManufacturingCompanyName ?? "",
  gpsrPostalAddress: brand?.gpsrPostalAddress ?? "",
  handle: brand?.handle ?? "",
  title: brand?.title ?? "",
})

const optionalTrimmed = (value?: string) => {
  const trimmed = value?.trim()

  return trimmed ? trimmed : undefined
}

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
        <Table.Cell>{t("status.loading")}</Table.Cell>
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

const BrandEditDrawer = ({
  attributeTypes,
  onOpenChange,
  open,
  brand,
}: {
  attributeTypes: BrandAttributeType[]
  onOpenChange: (open: boolean) => void
  open: boolean
  brand: Brand
}) => {
  const { t } = useTranslation("brands")
  const queryClient = useQueryClient()
  const [form, setForm] = useState<BrandInput>(() => toFormState(brand))

  useEffect(() => {
    if (open) {
      setForm(toFormState(brand))
    }
  }, [brand, open])

  const mutation = useMutation({
    mutationFn: (input: BrandInput) => updateBrand(brand.id, input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveBrandFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.detail(brand.id),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypesLists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypeDetails(),
      })
      toast.success(t("toasts.brandUpdated"))
      onOpenChange(false)
    },
  })

  const updateAttribute = (
    index: number,
    key: keyof BrandAttribute,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, currentIndex) =>
        currentIndex === index ? { ...attribute, [key]: value } : attribute
      ),
    }))
  }

  const getAttributeOptions = (selectedName: string) => {
    const selectedNames = new Set(
      form.attributes
        .map((attribute) => attribute.name)
        .filter((name) => name && name !== selectedName)
    )

    return attributeTypes.filter(
      (attributeType) =>
        !(attributeType.deleted_at || selectedNames.has(attributeType.name))
    )
  }
  const selectedAttributeNames = new Set(
    form.attributes
      .map((attribute) => attribute.name)
      .filter((name): name is string => !!name)
  )
  const canAddAttribute = attributeTypes.some(
    (attributeType) =>
      !(
        attributeType.deleted_at ||
        selectedAttributeNames.has(attributeType.name)
      )
  )

  const save = () => {
    mutation.mutate({
      attributes: form.attributes
        .map((attribute) => ({
          name: attribute.name.trim(),
          value: attribute.value,
        }))
        .filter((attribute) => attribute.name.length > 0),
      gpsrContactEmail: optionalTrimmed(form.gpsrContactEmail),
      gpsrEuropeanResellerContactEmail: optionalTrimmed(
        form.gpsrEuropeanResellerContactEmail
      ),
      gpsrEuropeanResellerManufacturingCompanyName: optionalTrimmed(
        form.gpsrEuropeanResellerManufacturingCompanyName
      ),
      gpsrEuropeanResellerPostalAddress: optionalTrimmed(
        form.gpsrEuropeanResellerPostalAddress
      ),
      gpsrManufacturedOutsideEu: form.gpsrManufacturedOutsideEu,
      gpsrManufacturingCompanyName: optionalTrimmed(
        form.gpsrManufacturingCompanyName
      ),
      gpsrPostalAddress: optionalTrimmed(form.gpsrPostalAddress),
      handle: optionalTrimmed(form.handle),
      title: form.title.trim(),
    })
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("form.editBrand")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-6 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Label htmlFor="brand-title">{t("fields.title")}</Label>
            <Input
              id="brand-title"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              value={form.title}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="brand-handle">{t("fields.handle")}</Label>
            <Input
              id="brand-handle"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  handle: event.target.value,
                }))
              }
              value={form.handle}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Heading level="h2">GPSR</Heading>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-gpsr-manufacturing-company-name">
                  {t("fields.gpsrManufacturingCompanyName")}
                </Label>
                <Input
                  id="brand-gpsr-manufacturing-company-name"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrManufacturingCompanyName: event.target.value,
                    }))
                  }
                  value={form.gpsrManufacturingCompanyName}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-gpsr-postal-address">
                  {t("fields.gpsrPostalAddress")}
                </Label>
                <Input
                  id="brand-gpsr-postal-address"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrPostalAddress: event.target.value,
                    }))
                  }
                  value={form.gpsrPostalAddress}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-gpsr-contact-email">
                  {t("fields.gpsrContactEmail")}
                </Label>
                <Input
                  id="brand-gpsr-contact-email"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrContactEmail: event.target.value,
                    }))
                  }
                  type="email"
                  value={form.gpsrContactEmail}
                />
              </div>
              <div className="flex items-center gap-3 rounded-md border border-ui-border-base px-3 py-2">
                <Checkbox
                  checked={form.gpsrManufacturedOutsideEu}
                  id="brand-gpsr-manufactured-outside-eu"
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      gpsrManufacturedOutsideEu: checked === true,
                    }))
                  }
                />
                <Label htmlFor="brand-gpsr-manufactured-outside-eu">
                  {t("fields.gpsrManufacturedOutsideEu")}
                </Label>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-gpsr-eu-company-name">
                  {t("fields.gpsrEuropeanResellerManufacturingCompanyName")}
                </Label>
                <Input
                  id="brand-gpsr-eu-company-name"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrEuropeanResellerManufacturingCompanyName:
                        event.target.value,
                    }))
                  }
                  value={form.gpsrEuropeanResellerManufacturingCompanyName}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-gpsr-eu-address">
                  {t("fields.gpsrEuropeanResellerPostalAddress")}
                </Label>
                <Input
                  id="brand-gpsr-eu-address"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrEuropeanResellerPostalAddress: event.target.value,
                    }))
                  }
                  value={form.gpsrEuropeanResellerPostalAddress}
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <Label htmlFor="brand-gpsr-eu-email">
                  {t("fields.gpsrEuropeanResellerContactEmail")}
                </Label>
                <Input
                  id="brand-gpsr-eu-email"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrEuropeanResellerContactEmail: event.target.value,
                    }))
                  }
                  type="email"
                  value={form.gpsrEuropeanResellerContactEmail}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Heading level="h2">{t("attributes.title")}</Heading>
              <Button
                disabled={!canAddAttribute}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    attributes: [
                      ...current.attributes,
                      emptyAttribute(attributeTypes, selectedAttributeNames),
                    ],
                  }))
                }
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.add")}
              </Button>
            </div>
            {form.attributes.length ? (
              form.attributes.map((attribute, index) => (
                <div
                  className="grid grid-cols-[1fr_1fr_auto] gap-2"
                  key={`${attribute.id ?? "new"}-${index}`}
                >
                  <Select
                    onValueChange={(value) =>
                      updateAttribute(index, "name", value)
                    }
                    value={attribute.name}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder={t("fields.attribute")} />
                    </Select.Trigger>
                    <Select.Content>
                      {getAttributeOptions(attribute.name).map(
                        (attributeType) => (
                          <Select.Item
                            key={attributeType.id}
                            value={attributeType.name}
                          >
                            {attributeType.name}
                          </Select.Item>
                        )
                      )}
                    </Select.Content>
                  </Select>
                  <Input
                    onChange={(event) =>
                      updateAttribute(index, "value", event.target.value)
                    }
                    placeholder={t("fields.value")}
                    value={attribute.value}
                  />
                  <Button
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        attributes: current.attributes.filter(
                          (_, currentIndex) => currentIndex !== index
                        ),
                      }))
                    }
                    size="small"
                    type="button"
                    variant="secondary"
                  >
                    {t("actions.remove")}
                  </Button>
                </div>
              ))
            ) : (
              <Text className="text-ui-fg-subtle" size="small">
                {t("attributes.empty")}
              </Text>
            )}
          </div>
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
              disabled={!form.title.trim()}
              isLoading={mutation.isPending}
              onClick={save}
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

  const params = useMemo(
    () => ({
      limit: PRODUCT_SELECTOR_PAGE_SIZE,
      offset: pageIndex * PRODUCT_SELECTOR_PAGE_SIZE,
      q: debouncedQ,
    }),
    [debouncedQ, pageIndex]
  )

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
      toast.success(t("toasts.brandProductsUpdated"))
      onOpenChange(false)
    },
  })

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
    <Drawer onOpenChange={onOpenChange} open={open}>
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
        <Table.Cell>{t("status.loading")}</Table.Cell>
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

  const productParams = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      order_by: productOrderBy,
      q: debouncedProductQ,
    }),
    [debouncedProductQ, pageIndex, productOrderBy]
  )

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
  const attributeTypesParams = useMemo(
    () => ({
      include_deleted: true,
      limit: 100,
      offset: 0,
      order_by: "name",
    }),
    []
  )
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
    onSuccess: async () => {
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
        <Text className="text-ui-fg-error">{t("errors.loadBrandFailed")}</Text>
      </Container>
    )
  }

  if (brandQuery.isLoading || !brand) {
    return (
      <Container>
        <Text>{t("status.loading")}</Text>
      </Container>
    )
  }

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
                isLoading={restoreMutation.isPending}
                onClick={() => restoreMutation.mutate(brand.id)}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.restore")}
              </Button>
            ) : (
              <Button
                onClick={() => setEditOpen(true)}
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
            <Heading level="h2">GPSR</Heading>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsrManufacturingCompanyName")}
                </Text>
                <Text size="small">
                  {brand.gpsrManufacturingCompanyName ?? "-"}
                </Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsrPostalAddress")}
                </Text>
                <Text size="small">{brand.gpsrPostalAddress ?? "-"}</Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsrContactEmail")}
                </Text>
                <Text size="small">{brand.gpsrContactEmail ?? "-"}</Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsrManufacturedOutsideEu")}
                </Text>
                <Text size="small">
                  {brand.gpsrManufacturedOutsideEu ? t("status.selected") : "-"}
                </Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsrEuropeanResellerManufacturingCompanyName")}
                </Text>
                <Text size="small">
                  {brand.gpsrEuropeanResellerManufacturingCompanyName ?? "-"}
                </Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsrEuropeanResellerPostalAddress")}
                </Text>
                <Text size="small">
                  {brand.gpsrEuropeanResellerPostalAddress ?? "-"}
                </Text>
              </div>
              <div className="md:col-span-2">
                <Text className="text-ui-fg-subtle" size="small">
                  {t("fields.gpsrEuropeanResellerContactEmail")}
                </Text>
                <Text size="small">
                  {brand.gpsrEuropeanResellerContactEmail ?? "-"}
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
          isLoading={productsQuery.isLoading}
          onManage={() => setProductsOpen(true)}
          onOpenProduct={(productId) => navigate(`/products/${productId}`)}
          onRemove={handleRemoveProduct}
          pageCount={pageCount}
          pageIndex={pageIndex}
          productOrderBy={productOrderBy}
          productQ={productQ}
          products={products}
          removingProductId={removeProductMutation.variables}
          setPageIndex={setPageIndex}
          setProductOrderBy={setProductOrderBy}
          setProductQ={setProductQ}
        />
      </div>

      <BrandEditDrawer
        attributeTypes={attributeTypes}
        brand={brand}
        onOpenChange={setEditOpen}
        open={!isDeleted && editOpen}
      />
      <ProductAssignmentDrawer
        brandId={id ?? ""}
        currentProductIds={productIds}
        onOpenChange={setProductsOpen}
        open={!isDeleted && !!id && productsOpen}
      />
    </>
  )
}

export default BrandDetailPage
