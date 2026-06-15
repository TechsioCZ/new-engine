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
  listProducers,
  type Producer,
  producerQueryKeys,
  retrieveProductProducers,
  setProductProducers,
} from "../lib/producers"
import { getPaginationTranslations } from "../lib/table"
import { useDebouncedValue } from "../lib/use-debounced-value"

type ProductProducersWidgetProps = Partial<DetailWidgetProps<AdminProduct>>

const PAGE_SIZE = 20
const SUPPLIER_ATTRIBUTE_NAME = "supplier"

const getProducerAttributeValue = (
  producer: Producer | undefined,
  attributeName: string
) =>
  producer?.attributes.find(
    (attribute) => attribute.name.toLowerCase() === attributeName
  )?.value

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

  if (!producers.length) {
    return (
      <Table.Row>
        <Table.Cell>{t("producers.empty")}</Table.Cell>
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
                  onSelect(producer.id)
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

const ProducerLinkContent = ({
  error,
  isLoading,
  producers,
}: {
  error: unknown
  isLoading: boolean
  producers: Producer[]
}) => {
  const { t } = useTranslation("producers")

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

  if (!producers.length) {
    return (
      <Text className="text-ui-fg-subtle" size="small">
        {t("widget.empty")}
      </Text>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {producers.map((producer) => {
        const isDeleted = !!producer.deleted_at

        return (
          <div
            className="flex items-center justify-between gap-3"
            key={producer.id}
          >
            <Text
              className={isDeleted ? "text-ui-fg-subtle" : undefined}
              size="small"
            >
              <Link to={`/producers/${producer.id}`}>{producer.title}</Link>
            </Text>
            <div className="flex items-center gap-2">
              {isDeleted ? (
                <Badge color="orange" size="2xsmall">
                  {t("status.inactive")}
                </Badge>
              ) : null}
              <Badge size="2xsmall">{producer.handle}</Badge>
            </div>
          </div>
        )
      })}
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
  const { t } = useTranslation("producers")
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
    mutationFn: () => setProductProducers(productId, selectedId),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveProducerFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.productLinks(productId),
      })
      await queryClient.invalidateQueries({ queryKey: ["product", productId] })
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      await queryClient.invalidateQueries({
        queryKey: producerQueryKeys.details(),
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
      toast.success(t("toasts.productProducerUpdated"))
      onOpenChange(false)
    },
  })

  const producers = [...(data?.producers ?? [])].sort(
    (first, second) => Number(!!first.deleted_at) - Number(!!second.deleted_at)
  )
  const selectedProducer =
    producers.find((producer) => producer.id === selectedId) ??
    (currentProducer?.id === selectedId ? currentProducer : undefined)
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
                {t("widget.selectedProducer")}
              </Text>
              <Text className="text-ui-fg-subtle" size="small">
                {selectedProducer?.title ?? t("widget.none")}
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
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder={t("search.producers")}
            value={q}
          />
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("columns.producer")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.handle")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.status")}</Table.HeaderCell>
                <Table.HeaderCell className="w-[1%] text-right">
                  {t("columns.actions")}
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

const ProductProducersWidget = ({
  data: product,
}: ProductProducersWidgetProps) => {
  const { t } = useTranslation("producers")
  const [open, setOpen] = useState(false)

  const { data, error, isLoading } = useQuery({
    enabled: !!product?.id,
    queryFn: () => {
      if (!product?.id) {
        throw new Error(t("errors.productIdRequired"))
      }
      return retrieveProductProducers(product.id)
    },
    queryKey: producerQueryKeys.productLinks(product?.id),
  })

  if (!product?.id) {
    return null
  }

  const producers = [...(data?.producers ?? [])].sort(
    (first, second) => Number(!!first.deleted_at) - Number(!!second.deleted_at)
  )
  const activeProducer = producers.find((producer) => !producer.deleted_at)
  const hasInactiveProducer = producers.some((producer) => producer.deleted_at)
  const activeProducerSupplier = getProducerAttributeValue(
    activeProducer,
    SUPPLIER_ATTRIBUTE_NAME
  )
  const supplier =
    activeProducerSupplier && activeProducerSupplier.trim().length > 0
      ? activeProducerSupplier.trim()
      : producers
          .filter((producer) => producer.id !== activeProducer?.id)
          .map((producer) =>
            getProducerAttributeValue(producer, SUPPLIER_ATTRIBUTE_NAME)
          )
          .map((value) => value?.trim())
          .find((value): value is string => !!value)
  let statusText = t("products.notLinked")

  if (hasInactiveProducer) {
    statusText = t("products.inactiveLinked")
  }

  if (activeProducer) {
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
          <ProducerLinkContent
            error={error}
            isLoading={isLoading}
            producers={producers}
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
      <ProducerAssignmentDrawer
        currentProducer={activeProducer}
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

export default ProductProducersWidget
