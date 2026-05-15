import { ArrowLeft } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Select,
  StatusBadge,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"
import { formatLocaleCode } from "../../../../lib/format-locale-code"
import {
  type ProducerAttributeTypeProducer,
  producerQueryKeys,
  restoreProducerAttributeType,
  retrieveProducerAttributeType,
} from "../../../../lib/producers"
import { useDebouncedValue } from "../../../../lib/use-debounced-value"

const PAGE_SIZE = 20

const ORDER_OPTIONS = [
  { labelKey: "orderOptions.producerAsc", value: "title" },
  { labelKey: "orderOptions.producerDesc", value: "-title" },
  { labelKey: "orderOptions.handleAsc", value: "handle" },
  { labelKey: "orderOptions.valueAsc", value: "attribute_value" },
  { labelKey: "orderOptions.recentlyUpdated", value: "-updated_at" },
]

const formatDate = (date: string | undefined, locale?: string) => {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

const paginationTranslations = (t: (key: string) => string) => ({
  next: t("pagination.next"),
  of: t("pagination.of"),
  pages: t("pagination.pages"),
  prev: t("pagination.previous"),
  results: t("pagination.results"),
})

const ProducerRows = ({
  isLoading,
  onOpen,
  producers,
}: {
  isLoading: boolean
  onOpen: (producerId: string) => void
  producers: ProducerAttributeTypeProducer[]
}) => {
  const { i18n, t } = useTranslation("producers")
  const locale = formatLocaleCode(i18n.resolvedLanguage ?? i18n.language)

  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>{t("status.loading")}</Table.Cell>
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
        <Table.Cell>{t("producers.empty")}</Table.Cell>
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
      onClick={() => onOpen(producer.id)}
    >
      <Table.Cell>{producer.title}</Table.Cell>
      <Table.Cell className="text-ui-fg-subtle">{producer.handle}</Table.Cell>
      <Table.Cell>{producer.attribute_value}</Table.Cell>
      <Table.Cell>{producer.active_product_count}</Table.Cell>
      <Table.Cell>
        <StatusBadge color={producer.deleted_at ? "red" : "green"}>
          {producer.deleted_at ? t("status.deleted") : t("status.active")}
        </StatusBadge>
      </Table.Cell>
      <Table.Cell>{formatDate(producer.updated_at, locale)}</Table.Cell>
    </Table.Row>
  ))
}

const ProducerAttributeDetailPage = () => {
  const { t } = useTranslation("producers")
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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

  const { data, error, isLoading } = useQuery({
    enabled: !!id,
    placeholderData: (previousData) => previousData,
    queryFn: () => {
      if (!id) {
        throw new Error(t("errors.attributeIdRequired"))
      }

      return retrieveProducerAttributeType(id, params)
    },
    queryKey: producerQueryKeys.attributeTypeDetail(id, params),
  })

  const restoreMutation = useMutation({
    mutationFn: restoreProducerAttributeType,
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : t("errors.restoreAttributeFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-type", id],
      })
      await queryClient.invalidateQueries({
        queryKey: ["producer-attribute-types"],
      })
      await queryClient.invalidateQueries({ queryKey: ["producer"] })
      await queryClient.invalidateQueries({ queryKey: ["producers"] })
      toast.success(t("toasts.attributeRestored"))
    },
  })

  const attributeType = data?.attribute_type
  const producers = data?.producers ?? []
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)

  if (error) {
    return (
      <Container>
        <Text className="text-ui-fg-error">
          {t("errors.loadAttributeFailed")}
        </Text>
      </Container>
    )
  }

  if (isLoading || !attributeType) {
    return (
      <Container>
        <Text>{t("status.loading")}</Text>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <IconButton asChild type="button" variant="transparent">
          <Link aria-label={t("detail.backToProducers")} to="/producers">
            <ArrowLeft />
          </Link>
        </IconButton>
        <Heading level="h1">{attributeType.name}</Heading>
        <StatusBadge color={attributeType.deleted_at ? "red" : "green"}>
          {attributeType.deleted_at ? t("status.deleted") : t("status.active")}
        </StatusBadge>
      </div>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">{t("detail.details")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {t("attributes.usageCount", {
                count: attributeType.usage_count,
              })}
            </Text>
          </div>
          {attributeType.deleted_at ? (
            <Button
              isLoading={restoreMutation.isPending}
              onClick={() => restoreMutation.mutate(attributeType.id)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.restore")}
            </Button>
          ) : null}
        </div>
        <div className="grid gap-3 px-6 py-4 md:grid-cols-2">
          <div>
            <Text className="text-ui-fg-subtle" size="small">
              {t("detail.id")}
            </Text>
            <Text size="small">{attributeType.id}</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle" size="small">
              {t("columns.status")}
            </Text>
            <Text size="small">
              {attributeType.deleted_at
                ? t("status.deleted")
                : t("status.active")}
            </Text>
          </div>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex flex-col gap-4 px-6 py-4">
          <div>
            <Heading level="h2">{t("producers.title")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {t("attributes.matchingProducerCount", { count })}
            </Text>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
            <Input
              onChange={(event) => {
                setPageIndex(0)
                setQ(event.target.value)
              }}
              placeholder={t("search.producers")}
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
                    {t(option.labelKey)}
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
                <Select.Item value="active">
                  {t("filters.activeOnly")}
                </Select.Item>
                <Select.Item value="all">
                  {t("filters.allStatuses")}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("columns.producer")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.handle")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.value")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.products")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.status")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.updated")}</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <ProducerRows
              isLoading={isLoading}
              onOpen={(producerId) => navigate(`/producers/${producerId}`)}
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
          translations={paginationTranslations(t)}
        />
      </Container>
    </div>
  )
}

export default ProducerAttributeDetailPage
