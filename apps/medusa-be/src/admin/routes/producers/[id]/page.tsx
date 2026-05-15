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
import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  listProducerAttributeTypes,
  type Producer,
  type ProducerAttribute,
  type ProducerAttributeType,
  type ProducerInput,
  type ProducerProductOption,
  type ProductSummary,
  producerQueryKeys,
  restoreProducer,
  retrieveProducer,
  retrieveProducerProductOptions,
  retrieveProducerProducts,
  setProducerProducts,
  updateProducer,
} from "../../../lib/producers"
import { useDebouncedValue } from "../../../lib/use-debounced-value"

const PAGE_SIZE = 20
const PRODUCT_SELECTOR_PAGE_SIZE = 20

const PRODUCT_ORDER_OPTIONS = [
  { label: "Title A-Z", value: "title" },
  { label: "Title Z-A", value: "-title" },
  { label: "Handle A-Z", value: "handle" },
  { label: "Status A-Z", value: "status" },
  { label: "Newest", value: "-created_at" },
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
  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell colSpan={4}>Loading...</Table.Cell>
      </Table.Row>
    )
  }

  if (!options.length) {
    return (
      <Table.Row>
        <Table.Cell colSpan={4}>
          {hasSearch
            ? "No products found."
            : "No products without a producer found."}
        </Table.Cell>
      </Table.Row>
    )
  }

  return options.map(({ assigned_producer, product }) => {
    const isAssignedToAnotherProducer =
      !!assigned_producer && assigned_producer.id !== currentProducerId
    const tooltip = isAssignedToAnotherProducer
      ? `Already linked to producer "${assigned_producer.title}"`
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
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProducerInput>(() => toFormState(producer))

  const mutation = useMutation({
    mutationFn: (input: ProducerInput) => updateProducer(producer.id, input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save producer"
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.detail(producer.id),
      })
      await queryClient.invalidateQueries({ queryKey: ["producers"] })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-types"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type"],
      })
      toast.success("Producer updated")
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
      handle: form.handle?.trim() || undefined,
      title: form.title.trim(),
    })
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit Producer</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-6 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Label htmlFor="producer-title">Title</Label>
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
            <Label htmlFor="producer-handle">Handle</Label>
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
              <Heading level="h2">Attributes</Heading>
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
                Add
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
                      <Select.Value placeholder="Attribute" />
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
                    placeholder="Value"
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
                    Remove
                  </Button>
                </div>
              ))
            ) : (
              <Text className="text-ui-fg-subtle" size="small">
                No attributes.
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
              Cancel
            </Button>
            <Button
              disabled={!form.title.trim()}
              isLoading={mutation.isPending}
              onClick={save}
              size="small"
              type="button"
            >
              Save
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
    queryFn: () => retrieveProducerProductOptions(producerId, params),
    queryKey: producerQueryKeys.productOptions(producerId, params),
  })

  const mutation = useMutation({
    mutationFn: () => setProducerProducts(producerId, [...selectedIds]),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save products"
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["producer-products", producerId],
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.detail(producerId),
      })
      await queryClient.invalidateQueries({ queryKey: ["producers"] })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["producer-product-options"],
      })
      toast.success("Producer products updated")
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
          <Drawer.Title>Manage Products</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder="Search products"
            value={q}
          />
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="w-12" />
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Handle</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
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
          />
          <Text className="text-ui-fg-subtle" size="small">
            {selectedIds.size} selected
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
              Cancel
            </Button>
            <Button
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
              size="small"
              type="button"
            >
              Save
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const ProductRows = ({
  isLoading,
  onOpen,
  onRemove,
  products,
  removingProductId,
}: {
  isLoading: boolean
  onOpen: (productId: string) => void
  onRemove: (product: ProductSummary) => void
  products: ProductSummary[]
  removingProductId?: string
}) => {
  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>Loading...</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  if (!products.length) {
    return (
      <Table.Row>
        <Table.Cell>No linked products.</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return products.map((product) => (
    <Table.Row
      className="cursor-pointer"
      key={product.id}
      onClick={() => onOpen(product.id)}
    >
      <Table.Cell>{product.title ?? product.id}</Table.Cell>
      <Table.Cell>{product.handle ?? "-"}</Table.Cell>
      <Table.Cell>
        {product.status ? <Badge size="2xsmall">{product.status}</Badge> : "-"}
      </Table.Cell>
      <Table.Cell>
        <div className="flex justify-end">
          <IconButton
            aria-label="Remove product"
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
    </Table.Row>
  ))
}

const ProducerDetailPage = () => {
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
        throw new Error("Producer id is required")
      }
      return retrieveProducer(id)
    },
    queryKey: producerQueryKeys.detail(id),
  })

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
    enabled: !!id,
    placeholderData: (previousData) => previousData,
    queryFn: () => {
      if (!id) {
        throw new Error("Producer id is required")
      }
      return retrieveProducerProducts(id, productParams)
    },
    queryKey: producerQueryKeys.products(id, productParams),
  })

  const producer = producerQuery.data?.producer
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
    queryFn: () => listProducerAttributeTypes(attributeTypesParams),
    queryKey: producerQueryKeys.attributeTypes(attributeTypesParams),
  })
  const attributeTypes = attributeTypesQuery.data?.attribute_types ?? []
  const restoreMutation = useMutation({
    mutationFn: restoreProducer,
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to restore producer"
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.detail(id),
      })
      await queryClient.invalidateQueries({ queryKey: ["producers"] })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type"],
      })
      toast.success("Producer restored")
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
        error instanceof Error ? error.message : "Failed to remove product"
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["producer-products", id],
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.detail(id),
      })
      await queryClient.invalidateQueries({ queryKey: ["producers"] })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["producer-product-options"],
      })
      toast.success("Product removed")
    },
  })

  const handleRemoveProduct = async (product: ProductSummary) => {
    const confirmed = await prompt({
      cancelText: "Cancel",
      confirmText: "Remove",
      description: `Remove "${product.title ?? product.id}" from this producer?`,
      title: "Remove product",
    })

    if (confirmed) {
      removeProductMutation.mutate(product.id)
    }
  }

  if (producerQuery.error) {
    return (
      <Container>
        <Text className="text-ui-fg-error">Failed to load producer.</Text>
      </Container>
    )
  }

  if (producerQuery.isLoading || !producer) {
    return (
      <Container>
        <Text>Loading...</Text>
      </Container>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <IconButton asChild type="button" variant="transparent">
            <Link aria-label="Back to producers" to="/producers">
              <ArrowLeft />
            </Link>
          </IconButton>
          <Heading level="h1">{producer.title}</Heading>
          <StatusBadge color={producer.deleted_at ? "red" : "green"}>
            {producer.deleted_at ? "Deleted" : "Active"}
          </StatusBadge>
        </div>

        <Container className="divide-y p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div>
              <Heading level="h2">Details</Heading>
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
                Restore
              </Button>
            ) : (
              <Button
                onClick={() => setEditOpen(true)}
                size="small"
                type="button"
                variant="secondary"
              >
                <PencilSquare />
                Edit
              </Button>
            )}
          </div>
          <div className="grid gap-3 px-6 py-4 md:grid-cols-2">
            <div>
              <Text className="text-ui-fg-subtle" size="small">
                ID
              </Text>
              <Text size="small">{producer.id}</Text>
            </div>
            <div>
              <Text className="text-ui-fg-subtle" size="small">
                Handle
              </Text>
              <Text size="small">{producer.handle}</Text>
            </div>
            <div>
              <Text className="text-ui-fg-subtle" size="small">
                Active products
              </Text>
              <Text size="small">{producer.active_product_count}</Text>
            </div>
          </div>
          <div className="px-6 py-4">
            <Heading level="h2">Attributes</Heading>
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
                      <StatusBadge color="red">Deleted</StatusBadge>
                    ) : null}
                  </div>
                ))
              ) : (
                <Text className="text-ui-fg-subtle" size="small">
                  No attributes.
                </Text>
              )}
            </div>
          </div>
        </Container>

        <Container className="divide-y p-0">
          <div className="flex flex-col gap-4 px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Heading level="h2">Products</Heading>
                <Text className="text-ui-fg-subtle" size="small">
                  {count} linked products
                </Text>
              </div>
              <Button
                onClick={() => setProductsOpen(true)}
                size="small"
                type="button"
                variant="secondary"
              >
                Manage
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <Input
                onChange={(event) => {
                  setPageIndex(0)
                  setProductQ(event.target.value)
                }}
                placeholder="Search products"
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
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Handle</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell className="w-[1%] text-right">
                  Actions
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <ProductRows
                isLoading={productsQuery.isLoading}
                onOpen={(productId) => navigate(`/products/${productId}`)}
                onRemove={handleRemoveProduct}
                products={products}
                removingProductId={removeProductMutation.variables}
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
          />
        </Container>
      </div>

      <ProducerEditDrawer
        attributeTypes={attributeTypes}
        onOpenChange={setEditOpen}
        open={editOpen}
        producer={producer}
      />
      {id ? (
        <ProductAssignmentDrawer
          currentProductIds={productIds}
          onOpenChange={setProductsOpen}
          open={productsOpen}
          producerId={id}
        />
      ) : null}
    </>
  )
}

export default ProducerDetailPage
