import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentSeries } from "@medusajs/icons"
import {
  Badge,
  Container,
  Heading,
  Select,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import {
  isManualOrderBusinessStatusId,
  MANUAL_ORDER_BUSINESS_STATUS_IDS,
  type ManualOrderBusinessStatusId,
  ORDER_BUSINESS_STATUSES,
  type OrderBusinessStatusSummary,
} from "../../../utils/order-business-status"
import { formatLocaleCode } from "../../lib/format-locale-code"
import { sdk } from "../../lib/sdk"

type OrderBusinessStatusesResponse = {
  orders: OrderBusinessStatusSummary[]
  count: number
  limit: number
  offset: number
}

type ManualStatusValue = ManualOrderBusinessStatusId | "clear"

const PAGE_SIZE = 50
const ORDER_STATUSES_QUERY_KEY = "order-business-statuses"

const MANUAL_STATUS_OPTIONS: Array<{
  translationKey: string
  value: ManualStatusValue
}> = [
  ...MANUAL_ORDER_BUSINESS_STATUS_IDS.map((value) => ({
    translationKey: ORDER_BUSINESS_STATUSES[value].translation_key,
    value,
  })),
  {
    translationKey: "manualStatus.clear",
    value: "clear",
  },
]

const formatDate = (date: string | null | undefined, locale?: string) => {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

const formatOrderNumber = (order: OrderBusinessStatusSummary) =>
  order.custom_display_id ??
  (order.display_id ? `#${order.display_id}` : order.id)

const formatTotal = (order: OrderBusinessStatusSummary, locale?: string) => {
  if (order.total === null || order.total === undefined) {
    return "-"
  }

  const total =
    typeof order.total === "string" ? Number(order.total) : order.total

  if (!(order.currency_code && Number.isFinite(total))) {
    return String(order.total)
  }

  return new Intl.NumberFormat(locale, {
    currency: order.currency_code.toUpperCase(),
    style: "currency",
  }).format(total)
}

const updateOrderBusinessStatus = ({
  orderId,
  status,
}: {
  orderId: string
  status: ManualOrderBusinessStatusId | null
}) =>
  sdk.client.fetch(`/admin/orders/${orderId}/business-status`, {
    body: {
      status,
    },
    method: "POST",
  })

const ManualStatusControl = ({
  manualStatus,
  orderId,
}: {
  manualStatus?: ManualOrderBusinessStatusId | null
  orderId: string
}) => {
  const { t } = useTranslation("orderBusinessStatuses")
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (value: ManualStatusValue) =>
      updateOrderBusinessStatus({
        orderId,
        status: value === "clear" ? null : value,
      }),
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("toast.saveError"))
    },
    onSuccess: () => {
      toast.success(t("toast.saveSuccess"))
      queryClient.invalidateQueries({ queryKey: [ORDER_STATUSES_QUERY_KEY] })
    },
  })

  return (
    <div className="flex items-center justify-end gap-2">
      <Select
        defaultValue={manualStatus ?? undefined}
        disabled={mutation.isPending}
        key={manualStatus ?? "none"}
        onValueChange={(value) => {
          if (value === "clear" || isManualOrderBusinessStatusId(value)) {
            mutation.mutate(value)
          }
        }}
      >
        <Select.Trigger className="w-[210px]">
          <Select.Value placeholder={t("manualStatus.placeholder")} />
        </Select.Trigger>
        <Select.Content>
          {MANUAL_STATUS_OPTIONS.map((option) => (
            <Select.Item key={option.value} value={option.value}>
              {t(option.translationKey)}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
      {mutation.isPending ? (
        <Text className="text-ui-fg-subtle" size="small">
          {t("manualStatus.saving")}
        </Text>
      ) : null}
    </div>
  )
}

const OrderStatusesPage = () => {
  const { i18n, t } = useTranslation("orderBusinessStatuses")
  const [offset, setOffset] = useState(0)
  const intlLocale = useMemo(
    () => formatLocaleCode(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  )
  const { data, isLoading } = useQuery({
    queryFn: () => {
      const search = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })

      return sdk.client.fetch<OrderBusinessStatusesResponse>(
        `/admin/order-business-statuses?${search}`
      )
    },
    queryKey: [ORDER_STATUSES_QUERY_KEY, offset],
    throwOnError: true,
  })

  const orders = data?.orders ?? []
  const pageIndex = Math.floor(offset / PAGE_SIZE)
  const pageCount = Math.ceil((data?.count ?? 0) / PAGE_SIZE)

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h1">{t("title")}</Heading>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("columns.order")}</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.customer")}</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.created")}</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.total")}</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.businessStatus")}</Table.HeaderCell>
            <Table.HeaderCell className="w-[1%] text-right">
              {t("columns.manualStatus")}
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading ? (
            <Table.Row>
              <Table.Cell>{t("table.loading")}</Table.Cell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
            </Table.Row>
          ) : null}
          {isLoading || orders.length ? null : (
            <Table.Row>
              <Table.Cell>{t("table.empty")}</Table.Cell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
            </Table.Row>
          )}
          {orders.map((order) => (
            <Table.Row key={order.id}>
              <Table.Cell className="whitespace-nowrap">
                <Link
                  className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                  to={`/orders/${order.id}`}
                >
                  {formatOrderNumber(order)}
                </Link>
              </Table.Cell>
              <Table.Cell className="max-w-[260px] truncate">
                {order.email ?? "-"}
              </Table.Cell>
              <Table.Cell className="whitespace-nowrap">
                {formatDate(order.created_at, intlLocale)}
              </Table.Cell>
              <Table.Cell className="whitespace-nowrap">
                {formatTotal(order, intlLocale)}
              </Table.Cell>
              <Table.Cell className="whitespace-nowrap">
                <Badge color={order.business_status.tone} size="2xsmall">
                  {t(order.business_status.translation_key)}
                </Badge>
              </Table.Cell>
              <Table.Cell className="text-right">
                <ManualStatusControl
                  manualStatus={order.manual_status}
                  orderId={order.id}
                />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>

      <Table.Pagination
        canNextPage={offset + PAGE_SIZE < (data?.count ?? 0)}
        canPreviousPage={offset > 0}
        count={data?.count ?? 0}
        nextPage={() => setOffset((prev) => prev + PAGE_SIZE)}
        pageCount={pageCount}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        previousPage={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
        translations={{
          next: t("pagination.next"),
          of: t("pagination.of"),
          pages: t("pagination.pages"),
          prev: t("pagination.previous"),
          results: t("pagination.results"),
        }}
      />
    </Container>
  )
}

export const config = defineRouteConfig({
  icon: DocumentSeries,
  label: "menuItem",
  translationNs: "orderBusinessStatuses",
})

export default OrderStatusesPage
