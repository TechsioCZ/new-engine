import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings, PencilSquare, Trash } from "@medusajs/icons"
import {
  Button,
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
  toast,
  usePrompt,
} from "@medusajs/ui"
import {
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  createProducer,
  createProducerAttributeType,
  deleteProducer,
  deleteProducerAttributeType,
  listProducerAttributeTypes,
  listProducers,
  type Producer,
  type ProducerAttribute,
  type ProducerAttributeType,
  type ProducerInput,
  producerQueryKeys,
  restoreProducer,
  restoreProducerAttributeType,
  updateProducer,
} from "../../lib/producers"
import { useDebouncedValue } from "../../lib/use-debounced-value"

const PAGE_SIZE = 20

const ORDER_OPTIONS = [
  { label: "Title A-Z", value: "title" },
  { label: "Title Z-A", value: "-title" },
  { label: "Handle A-Z", value: "handle" },
  { label: "Newest", value: "-created_at" },
  { label: "Recently updated", value: "-updated_at" },
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

const formatDate = (date: string | undefined) => {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

const ProducerRows = ({
  deleteMutation,
  isLoading,
  onDelete,
  onEdit,
  onOpen,
  onRestore,
  producers,
}: {
  deleteMutation: UseMutationResult<unknown, Error, string>
  isLoading: boolean
  onDelete: (producer: Producer) => void
  onEdit: (producer: Producer) => void
  onOpen: (producer: Producer) => void
  onRestore: (producer: Producer) => void
  producers: Producer[]
}) => {
  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>Loading...</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  if (!producers.length) {
    return (
      <Table.Row>
        <Table.Cell>No producers found.</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return producers.map((producer) => (
    <Table.Row
      className="cursor-pointer"
      key={producer.id}
      onClick={() => onOpen(producer)}
    >
      <Table.Cell>{producer.title}</Table.Cell>
      <Table.Cell className="text-ui-fg-subtle">{producer.handle}</Table.Cell>
      <Table.Cell>{producer.attributes.length}</Table.Cell>
      <Table.Cell>{producer.active_product_count}</Table.Cell>
      <Table.Cell>
        <StatusBadge color={producer.deleted_at ? "red" : "green"}>
          {producer.deleted_at ? "Deleted" : "Active"}
        </StatusBadge>
      </Table.Cell>
      <Table.Cell>{formatDate(producer.updated_at)}</Table.Cell>
      <Table.Cell>
        <div className="flex justify-end gap-1">
          {producer.deleted_at ? (
            <Button
              onClick={(event) => {
                event.stopPropagation()
                onRestore(producer)
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              Restore
            </Button>
          ) : (
            <>
              <IconButton
                aria-label="Edit producer"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(producer)
                }}
                size="small"
                type="button"
                variant="transparent"
              >
                <PencilSquare />
              </IconButton>
              <IconButton
                aria-label="Delete producer"
                disabled={
                  deleteMutation.isPending &&
                  deleteMutation.variables === producer.id
                }
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(producer)
                }}
                size="small"
                type="button"
                variant="transparent"
              >
                <Trash />
              </IconButton>
            </>
          )}
        </div>
      </Table.Cell>
    </Table.Row>
  ))
}

const ProducerFormDrawer = ({
  attributeTypes,
  onOpenChange,
  open,
  producer,
}: {
  attributeTypes: ProducerAttributeType[]
  onOpenChange: (open: boolean) => void
  open: boolean
  producer?: Producer
}) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ProducerInput>(() => toFormState(producer))

  const mutation = useMutation({
    mutationFn: (input: ProducerInput) =>
      producer ? updateProducer(producer.id, input) : createProducer(input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save producer"
      )
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["producers"] })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-types"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type"],
      })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.detail(response.producer.id),
      })
      toast.success(producer ? "Producer updated" : "Producer created")
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
    const attributes = form.attributes
      .map((attribute) => ({
        name: attribute.name.trim(),
        value: attribute.value,
      }))
      .filter((attribute) => attribute.name.length > 0)

    mutation.mutate({
      attributes,
      handle: form.handle?.trim() || undefined,
      title: form.title.trim(),
    })
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {producer ? "Edit Producer" : "Create Producer"}
          </Drawer.Title>
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
              placeholder="auto-generated from title"
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
                  <IconButton
                    aria-label="Remove attribute"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        attributes: current.attributes.filter(
                          (_, currentIndex) => currentIndex !== index
                        ),
                      }))
                    }
                    type="button"
                    variant="transparent"
                  >
                    <Trash />
                  </IconButton>
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
          <div className="flex items-center justify-end gap-2">
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

const AttributeTypesSection = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [name, setName] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("active")
  const [isCheckingName, setIsCheckingName] = useState(false)
  const debouncedQ = useDebouncedValue(q)

  const params = useMemo(
    () => ({
      include_deleted: status === "all",
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      order_by: "name",
      q: debouncedQ,
    }),
    [debouncedQ, pageIndex, status]
  )

  const { data, isLoading } = useQuery({
    queryFn: () => listProducerAttributeTypes(params),
    queryKey: producerQueryKeys.attributeTypes(params),
  })

  const createMutation = useMutation({
    mutationFn: createProducerAttributeType,
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create attribute"
      )
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-types"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type"],
      })
      setName("")
      if (response.action === "restored") {
        toast.success("Attribute restored")
      } else if (response.action === "existing") {
        toast.success("Attribute already exists")
      } else {
        toast.success("Attribute created")
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProducerAttributeType,
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete attribute"
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-types"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type"],
      })
      await queryClient.invalidateQueries({ queryKey: ["producer"] })
      await queryClient.invalidateQueries({ queryKey: ["producers"] })
      toast.success("Attribute deleted")
    },
  })

  const restoreMutation = useMutation({
    mutationFn: restoreProducerAttributeType,
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to restore attribute"
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-types"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type"],
      })
      await queryClient.invalidateQueries({ queryKey: ["producer"] })
      await queryClient.invalidateQueries({ queryKey: ["producers"] })
      setName("")
      toast.success("Attribute restored")
    },
  })

  const attributeTypes = data?.attribute_types ?? []
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)

  const handleDelete = async (attributeType: ProducerAttributeType) => {
    const usedText = attributeType.usage_count
      ? ` It is currently used by ${attributeType.usage_count} active producer${
          attributeType.usage_count === 1 ? "" : "s"
        }.`
      : ""
    const confirmed = await prompt({
      cancelText: "Cancel",
      confirmText: "Delete",
      description: `Soft-delete attribute "${attributeType.name}"?${usedText}`,
      title: "Delete attribute",
    })

    if (confirmed) {
      deleteMutation.mutate(attributeType.id)
    }
  }

  const handleCreate = async () => {
    const attributeName = name.trim()

    if (!attributeName) {
      return
    }

    setIsCheckingName(true)
    try {
      const existingResponse = await listProducerAttributeTypes({
        include_deleted: true,
        limit: 1,
        name: attributeName,
        offset: 0,
        order_by: "name",
      })
      const existing = existingResponse.attribute_types.find(
        (attributeType) => attributeType.name === attributeName
      )

      if (existing?.deleted_at) {
        const confirmed = await prompt({
          cancelText: "Cancel",
          confirmText: "Restore",
          description: `Attribute "${attributeName}" already exists but is deleted. Restore it instead?`,
          title: "Restore attribute",
        })

        if (confirmed) {
          restoreMutation.mutate(existing.id)
        }
        return
      }

      if (existing) {
        toast.error(`Attribute "${attributeName}" already exists`)
        return
      }

      createMutation.mutate({ name: attributeName })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to check attribute"
      )
    } finally {
      setIsCheckingName(false)
    }
  }

  const renderAttributeRows = () => {
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

    if (!attributeTypes.length) {
      return (
        <Table.Row>
          <Table.Cell>No attributes found.</Table.Cell>
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
        </Table.Row>
      )
    }

    return attributeTypes.map((attributeType) => (
      <Table.Row
        className="cursor-pointer"
        key={attributeType.id}
        onClick={() => navigate(`/producers/attributes/${attributeType.id}`)}
      >
        <Table.Cell>{attributeType.name}</Table.Cell>
        <Table.Cell>
          <StatusBadge color={attributeType.deleted_at ? "red" : "green"}>
            {attributeType.deleted_at ? "Deleted" : "Active"}
          </StatusBadge>
        </Table.Cell>
        <Table.Cell>{attributeType.usage_count}</Table.Cell>
        <Table.Cell>
          <div className="flex justify-end">
            {attributeType.deleted_at ? (
              <Button
                isLoading={
                  restoreMutation.isPending &&
                  restoreMutation.variables === attributeType.id
                }
                onClick={(event) => {
                  event.stopPropagation()
                  restoreMutation.mutate(attributeType.id)
                }}
                size="small"
                type="button"
                variant="secondary"
              >
                Restore
              </Button>
            ) : (
              <IconButton
                aria-label="Delete attribute"
                disabled={
                  deleteMutation.isPending &&
                  deleteMutation.variables === attributeType.id
                }
                onClick={(event) => {
                  event.stopPropagation()
                  handleDelete(attributeType)
                }}
                size="small"
                type="button"
                variant="transparent"
              >
                <Trash />
              </IconButton>
            )}
          </div>
        </Table.Cell>
      </Table.Row>
    ))
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Heading level="h2">Attributes</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {count} attributes
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Input
              onChange={(event) => setName(event.target.value)}
              placeholder="New attribute"
              value={name}
            />
            <Button
              disabled={!name.trim()}
              isLoading={
                createMutation.isPending ||
                restoreMutation.isPending ||
                isCheckingName
              }
              onClick={handleCreate}
              size="small"
              type="button"
              variant="secondary"
            >
              Add
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder="Search attributes"
            value={q}
          />
          <Select
            onValueChange={(value) => {
              setPageIndex(0)
              setStatus(value)
            }}
            value={status}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="active">Active only</Select.Item>
              <Select.Item value="all">All statuses</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Name</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Used by</Table.HeaderCell>
            <Table.HeaderCell className="w-[1%] text-right">
              Actions
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>{renderAttributeRows()}</Table.Body>
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
      />
    </Container>
  )
}

const ProducersPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingProducer, setEditingProducer] = useState<Producer | undefined>()
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const [orderBy, setOrderBy] = useState("title")
  const [status, setStatus] = useState("active")
  const debouncedQ = useDebouncedValue(q)

  const params = useMemo(
    () => ({
      include_deleted: status === "all",
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      order_by: orderBy,
      q: debouncedQ,
    }),
    [debouncedQ, orderBy, pageIndex, status]
  )

  const {
    data,
    error: listError,
    isLoading,
  } = useQuery({
    queryFn: () => listProducers(params),
    queryKey: producerQueryKeys.list(params),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProducer,
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to delete producer"
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["producers"] })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type"],
      })
      toast.success("Producer deleted")
    },
  })

  const restoreMutation = useMutation({
    mutationFn: restoreProducer,
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to restore producer"
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["producers"] })
      await queryClient.invalidateQueries({ queryKey: ["producer"] })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type"],
      })
      toast.success("Producer restored")
    },
  })

  const producers = data?.producers ?? []
  const count = data?.count ?? 0
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

  const handleDelete = async (producer: Producer) => {
    const activeProductText = producer.active_product_count
      ? ` It is linked to ${producer.active_product_count} active product${
          producer.active_product_count === 1 ? "" : "s"
        }.`
      : ""
    const confirmed = await prompt({
      cancelText: "Cancel",
      confirmText: "Delete",
      description: `Delete producer "${producer.title}"?${activeProductText}`,
      title: "Delete producer",
    })

    if (confirmed) {
      deleteMutation.mutate(producer.id)
    }
  }

  const handleRestore = (producer: Producer) => {
    restoreMutation.mutate(producer.id)
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <Container className="divide-y p-0">
          <div className="flex flex-col gap-4 px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Heading level="h1">Producers</Heading>
                <Text className="text-ui-fg-subtle" size="small">
                  {count} producers
                </Text>
              </div>
              <Button
                onClick={() => setCreateOpen(true)}
                size="small"
                type="button"
                variant="secondary"
              >
                Create
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
              <Input
                onChange={(event) => {
                  setPageIndex(0)
                  setQ(event.target.value)
                }}
                placeholder="Search producers"
                value={q}
              />
              <Select
                onValueChange={(value) => {
                  setPageIndex(0)
                  setOrderBy(value)
                }}
                value={orderBy}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {ORDER_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Select
                onValueChange={(value) => {
                  setPageIndex(0)
                  setStatus(value)
                }}
                value={status}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="active">Active only</Select.Item>
                  <Select.Item value="all">All statuses</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>

          {listError ? (
            <div className="px-6 py-4">
              <Text className="text-ui-fg-error">
                Failed to load producers.
              </Text>
            </div>
          ) : (
            <>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Title</Table.HeaderCell>
                    <Table.HeaderCell>Handle</Table.HeaderCell>
                    <Table.HeaderCell>Attributes</Table.HeaderCell>
                    <Table.HeaderCell>Products</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell>Updated</Table.HeaderCell>
                    <Table.HeaderCell className="w-[1%] text-right">
                      Actions
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  <ProducerRows
                    deleteMutation={deleteMutation}
                    isLoading={isLoading}
                    onDelete={handleDelete}
                    onEdit={setEditingProducer}
                    onOpen={(producer) => navigate(`/producers/${producer.id}`)}
                    onRestore={handleRestore}
                    producers={producers}
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
            </>
          )}
        </Container>
        <AttributeTypesSection />
      </div>

      {createOpen ? (
        <ProducerFormDrawer
          attributeTypes={attributeTypes}
          onOpenChange={setCreateOpen}
          open={createOpen}
        />
      ) : null}
      {editingProducer ? (
        <ProducerFormDrawer
          attributeTypes={attributeTypes}
          onOpenChange={(open) => {
            if (!open) {
              setEditingProducer(undefined)
            }
          }}
          open={!!editingProducer}
          producer={editingProducer}
        />
      ) : null}
    </>
  )
}

export const config = defineRouteConfig({
  icon: Buildings,
  label: "Producers",
})

export default ProducersPage
