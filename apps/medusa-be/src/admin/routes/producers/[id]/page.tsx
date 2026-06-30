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
import { type Dispatch, type SetStateAction, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Link,
  type LoaderFunctionArgs,
  type UIMatch,
  useNavigate,
  useParams,
} from "react-router-dom"
import { translateBreadcrumb } from "../../../lib/breadcrumb"
import {
  listProducerAttributeTypes,
  type Producer,
  type ProducerAttribute,
  type ProducerAttributeType,
  type ProducerInput,
  type ProducerProductOption,
  type ProducerResponse,
  type ProductSummary,
  producerQueryKeys,
  restoreProducer,
  retrieveProducer,
  retrieveProducerProductOptions,
  retrieveProducerProducts,
  setProducerProducts,
  updateProducer,
} from "../../../lib/producers"
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
    return { producer: undefined }
  }

  return retrieveProducer(id)
}

export const handle = {
  breadcrumb: (match: UIMatch<ProducerResponse>) =>
    match.data?.producer?.title ??
    match.data?.producer?.id ??
    translateBreadcrumb("producers:columns.producer", "Producer"),
}

const PRODUCT_ORDER_OPTIONS = [
  { labelKey: "orderOptions.titleAsc", value: "title" },
  { labelKey: "orderOptions.titleDesc", value: "-title" },
  { labelKey: "orderOptions.handleAsc", value: "handle" },
  { labelKey: "orderOptions.statusAsc", value: "status" },
  { labelKey: "orderOptions.newest", value: "-created_at" },
]

const emptyAttribute = (
  attributeTypes: ProducerAttributeType[] = [],
  selectedNames = new Set<string>()
): ProducerAttribute => ({
  name:
    attributeTypes.find(
      (attributeType) =>
        !(attributeType.deleted_at || selectedNames.has(attributeType.name))
    )?.name ?? "",
  value: "",
})

const toFormState = (producer?: Producer): ProducerInput => ({
  attributes: producer?.attributes.length
    ? producer.attributes.filter(
        (attribute) => !attribute.attribute_type_deleted_at
      )
    : [],
  handle: producer?.handle ?? "",
  title: producer?.title ?? "",
})

const optionalTrimmed = (value?: string) => {
  const trimmed = value?.trim()

  return trimmed ? trimmed : undefined
}

const ProductSelectionRows = ({
  currentProducerId,
  hasSearch,
  isLoading,
  onToggle,
  options,
  selectedIds,
}: {
  currentProducerId: string
  hasSearch: boolean
  isLoading: boolean
  onToggle: (productId: string) => void
  options: ProducerProductOption[]
  selectedIds: Set<string>
}) => {
  const { t } = useTranslation("producers")

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

  return options.map(({ assigned_producer, product }) => {
    const isAssignedToAnotherProducer =
      !!assigned_producer && assigned_producer.id !== currentProducerId
    const tooltip = isAssignedToAnotherProducer
      ? t("products.alreadyLinkedTooltip", {
          title: assigned_producer.title,
        })
      : undefined

    return (
      <Table.Row
        className={
          isAssignedToAnotherProducer
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer"
        }
        key={product.id}
        onClick={() => {
          if (!isAssignedToAnotherProducer) {
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
            disabled={isAssignedToAnotherProducer}
            onCheckedChange={() => {
              if (!isAssignedToAnotherProducer) {
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

const ProducerEditDrawer = ({
  attributeTypes,
  onOpenChange,
  open,
  producer,
}: {
  attributeTypes: ProducerAttributeType[]
  onOpenChange: (open: boolean) => void
  open: boolean
  producer: Producer
}) => {
  const { t } = useTranslation("producers")
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProducerInput>(() => toFormState(producer))

  useEffect(() => {
    if (open) {
      setForm(toFormState(producer))
    }
  }, [open, producer])

  const mutation = useMutation({
    mutationFn: (input: ProducerInput) => updateProducer(producer.id, input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveProducerFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.detail(producer.id),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.attributeTypesLists(),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.attributeTypeDetails(),
      })
      toast.success(t("toasts.producerUpdated"))
      onOpenChange(false)
    },
  })

  const updateAttribute = (
    index: number,
    key: keyof ProducerAttribute,
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
      handle: optionalTrimmed(form.handle),
      title: form.title.trim(),
    })
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("form.editProducer")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-6 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Label htmlFor="producer-title">{t("fields.title")}</Label>
            <Input
              id="producer-title"
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
            <Label htmlFor="producer-handle">{t("fields.handle")}</Label>
            <Input
              id="producer-handle"
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
  producerId,
}: {
  currentProductIds: string[]
  onOpenChange: (open: boolean) => void
  open: boolean
  producerId: string
}) => {
  const { t } = useTranslation("producers")
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
    queryFn: () => retrieveProducerProductOptions(producerId, params),
    queryKey: producerQueryKeys.productOptions(producerId, params),
  })

  const mutation = useMutation({
    mutationFn: () => setProducerProducts(producerId, [...selectedIds]),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveProductsFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.productsLists(producerId),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.detail(producerId),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.attributeTypeDetails(),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.productOptionsLists(),
      })
      toast.success(t("toasts.producerProductsUpdated"))
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
                currentProducerId={producerId}
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
  const { t } = useTranslation("producers")

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

const ProducerProductsSection = ({
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
  const { t } = useTranslation("producers")

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

const ProducerDetailPage = () => {
  const { t } = useTranslation("producers")
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

  const producerQuery = useQuery({
    enabled: !!id,
    queryFn: () => {
      if (!id) {
        throw new Error(t("errors.producerIdRequired"))
      }
      return retrieveProducer(id)
    },
    queryKey: producerQueryKeys.detail(id),
  })
  const producer = producerQuery.data?.producer
  const isDeleted = !!producer?.deleted_at

  const productParams = {
    limit: PAGE_SIZE,
    offset: pageIndex * PAGE_SIZE,
    order_by: productOrderBy,
    q: debouncedProductQ,
  }

  const productsQuery = useQuery({
    enabled: !!id && !!producer,
    placeholderData: (previousData) => previousData,
    queryFn: () => {
      if (!id) {
        throw new Error(t("errors.producerIdRequired"))
      }
      return retrieveProducerProducts(id, productParams)
    },
    queryKey: producerQueryKeys.products(id, productParams),
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
    queryFn: () => listProducerAttributeTypes(attributeTypesParams),
    queryKey: producerQueryKeys.attributeTypes(attributeTypesParams),
  })
  const attributeTypes = attributeTypesQuery.data?.attribute_types ?? []
  const restoreMutation = useMutation({
    mutationFn: restoreProducer,
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.restoreProducerFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.detail(id),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.attributeTypeDetails(),
      })
      toast.success(t("toasts.producerRestored"))
    },
  })

  const removeProductMutation = useMutation({
    mutationFn: (productId: string) =>
      setProducerProducts(
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
        queryKey: producerQueryKeys.productsLists(id),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.detail(id),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.attributeTypeDetails(),
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.productOptionsLists(),
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

  if (producerQuery.error) {
    return (
      <Container>
        <Text className="text-ui-fg-error">
          {t("errors.loadProducerFailed")}
        </Text>
      </Container>
    )
  }

  if (producerQuery.isLoading || !producer) {
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
            <Link aria-label={t("detail.backToProducers")} to="/producers">
              <ArrowLeft />
            </Link>
          </IconButton>
          <Heading level="h1">{producer.title}</Heading>
          <StatusBadge color={producer.deleted_at ? "red" : "green"}>
            {producer.deleted_at ? t("status.deleted") : t("status.active")}
          </StatusBadge>
        </div>

        <Container className="divide-y p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <Heading level="h2">{t("detail.details")}</Heading>
              <Text className="text-ui-fg-subtle" size="small">
                {producer.handle}
              </Text>
            </div>
            {producer.deleted_at ? (
              <Button
                isLoading={restoreMutation.isPending}
                onClick={() => restoreMutation.mutate(producer.id)}
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
              <Text size="small">{producer.id}</Text>
            </div>
            <div>
              <Text className="text-ui-fg-subtle" size="small">
                {t("fields.handle")}
              </Text>
              <Text size="small">{producer.handle}</Text>
            </div>
            <div>
              <Text className="text-ui-fg-subtle" size="small">
                {t("detail.activeProducts")}
              </Text>
              <Text size="small">{producer.active_product_count}</Text>
            </div>
          </div>
          <div className="px-6 py-4">
            <Heading level="h2">{t("attributes.title")}</Heading>
            <div className="mt-3 grid gap-2">
              {producer.attributes.length ? (
                producer.attributes.map((attribute) => (
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

        <ProducerProductsSection
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

      <ProducerEditDrawer
        attributeTypes={attributeTypes}
        onOpenChange={setEditOpen}
        open={!isDeleted && editOpen}
        producer={producer}
      />
      <ProductAssignmentDrawer
        currentProductIds={productIds}
        onOpenChange={setProductsOpen}
        open={!isDeleted && !!id && productsOpen}
        producerId={id ?? ""}
      />
    </>
  )
}

export default ProducerDetailPage
