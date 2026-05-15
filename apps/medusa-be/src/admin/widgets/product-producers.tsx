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
import { Link } from "react-router-dom"
import {
  listProducers,
  type Producer,
  producerQueryKeys,
  retrieveProductProducers,
  setProductProducers,
} from "../lib/producers"
import { useDebouncedValue } from "../lib/use-debounced-value"

type ProductProducersWidgetProps = Partial<DetailWidgetProps<AdminProduct>>

const PAGE_SIZE = 20

const ProducerSelectionRows = ({
  currentProducerId,
  isLoading,
  onClear,
  onSelect,
  producers,
}: {
  currentProducerId?: string
  isLoading: boolean
  onClear: () => void
  onSelect: (producerId: string) => void
  producers: Producer[]
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

  if (!producers.length) {
    return (
      <Table.Row>
        <Table.Cell>No producers found.</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return producers.map((producer) => {
    const isSelected = producer.id === currentProducerId

    return (
      <Table.Row
        className={isSelected ? undefined : "cursor-pointer"}
        key={producer.id}
        onClick={() => {
          if (!isSelected) {
            onSelect(producer.id)
          }
        }}
      >
        <Table.Cell>{producer.title}</Table.Cell>
        <Table.Cell>{producer.handle}</Table.Cell>
        <Table.Cell>
          {isSelected ? <Badge size="2xsmall">Selected</Badge> : "-"}
        </Table.Cell>
        <Table.Cell>
          <div className="flex justify-end">
            <Button
              onClick={(event) => {
                event.stopPropagation()
                if (isSelected) {
                  onClear()
                } else {
                  onSelect(producer.id)
                }
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {isSelected ? "Clear" : "Select"}
            </Button>
          </div>
        </Table.Cell>
      </Table.Row>
    )
  })
}

const ProducerLinkContent = ({
  error,
  isLoading,
  producer,
}: {
  error: unknown
  isLoading: boolean
  producer?: Producer
}) => {
  if (error) {
    return (
      <Text className="text-ui-fg-error" size="small">
        Failed to load producer.
      </Text>
    )
  }

  if (isLoading) {
    return <Text size="small">Loading...</Text>
  }

  if (!producer) {
    return (
      <Text className="text-ui-fg-subtle" size="small">
        No producer linked.
      </Text>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <Text size="small">
        <Link to={`/producers/${producer.id}`}>{producer.title}</Link>
      </Text>
      <Badge size="2xsmall">{producer.handle}</Badge>
    </div>
  )
}

const ProducerAssignmentDrawer = ({
  currentProducer,
  onOpenChange,
  open,
  productId,
}: {
  currentProducer?: Producer
  onOpenChange: (open: boolean) => void
  open: boolean
  productId: string
}) => {
  const queryClient = useQueryClient()
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const debouncedQ = useDebouncedValue(q)
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => currentProducer?.id
  )

  useEffect(() => {
    if (open) {
      setSelectedId(currentProducer?.id)
    }
  }, [currentProducer?.id, open])

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
    queryFn: () => listProducers(params),
    queryKey: producerQueryKeys.list(params),
  })

  const mutation = useMutation({
    mutationFn: () =>
      setProductProducers(productId, selectedId ? [selectedId] : []),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to save producer"
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.productLinks(productId),
      })
      await queryClient.invalidateQueries({ queryKey: ["product", productId] })
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      await queryClient.invalidateQueries({ queryKey: ["producer"] })
      await queryClient.invalidateQueries({ queryKey: ["producers"] })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type"],
      })
      await queryClient.invalidateQueries({
        queryKey: ["producer-product-options"],
      })
      toast.success("Product producer updated")
      onOpenChange(false)
    },
  })

  const producers = data?.producers ?? []
  const selectedProducer =
    producers.find((producer) => producer.id === selectedId) ??
    (currentProducer?.id === selectedId ? currentProducer : undefined)
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Manage Producer</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          <Container className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <Text size="small" weight="plus">
                Selected producer
              </Text>
              <Text className="text-ui-fg-subtle" size="small">
                {selectedProducer?.title ?? "None"}
              </Text>
            </div>
            <Button
              disabled={!selectedId}
              onClick={() => setSelectedId(undefined)}
              size="small"
              type="button"
              variant="secondary"
            >
              Clear
            </Button>
          </Container>
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder="Search producers"
            value={q}
          />
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Producer</Table.HeaderCell>
                <Table.HeaderCell>Handle</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell className="w-[1%] text-right">
                  Actions
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <ProducerSelectionRows
                currentProducerId={selectedId}
                isLoading={isLoading}
                onClear={() => setSelectedId(undefined)}
                onSelect={setSelectedId}
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

const ProductProducersWidget = ({
  data: product,
}: ProductProducersWidgetProps) => {
  const [open, setOpen] = useState(false)

  const { data, error, isLoading } = useQuery({
    enabled: !!product?.id,
    queryFn: () => {
      if (!product?.id) {
        throw new Error("Product id is required")
      }
      return retrieveProductProducers(product.id)
    },
    queryKey: producerQueryKeys.productLinks(product?.id),
  })

  if (!product?.id) {
    return null
  }

  const producer = data?.producers[0]

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">Producer</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {producer ? "Linked" : "Not linked"}
            </Text>
          </div>
          <Button
            onClick={() => setOpen(true)}
            size="small"
            type="button"
            variant="secondary"
          >
            Edit
          </Button>
        </div>
        <div className="flex flex-col gap-2 px-6 py-4">
          <ProducerLinkContent
            error={error}
            isLoading={isLoading}
            producer={producer}
          />
        </div>
      </Container>
      <ProducerAssignmentDrawer
        currentProducer={producer}
        onOpenChange={setOpen}
        open={open}
        productId={product.id}
      />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductProducersWidget
