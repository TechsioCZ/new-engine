import {
  Button,
  FocusModal,
  Label,
  Select,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  createOrderDashboardFulfillment,
  listOrderDashboardFulfillmentOrders,
  listOrderDashboardShippingOptions,
  listOrderDashboardStockLocations,
} from "./api"
import type {
  OrderDashboardFulfillmentCreateItem,
  OrderDashboardFulfillmentItem,
  OrderDashboardFulfillmentOrder,
  OrderDashboardOrder,
  OrderDashboardShippingOption,
} from "./types"

type TranslationFunction = (
  key: string,
  options?: Record<string, unknown>
) => string

type OrderDashboardBlockingOrder = {
  id: string
  order_display_id: string
  reason: string
}

type OrderDashboardFulfillmentPreviewOrder = {
  id: string
  itemSummaries: Array<{
    id: string
    quantity: number
    title: string
  }>
  items: OrderDashboardFulfillmentCreateItem[]
  order_display_id: string
  shippingOptionId: string
}

type OrderDashboardFulfillmentBulkResult = {
  failed: OrderDashboardBlockingOrder[]
  fulfilled: Array<{
    id: string
    order_display_id: string
  }>
}

export function OrderFulfillmentModal({
  onCompleted,
  onOpenChange,
  onOrdersChanged,
  open,
  selectedOrderIds,
  selectedOrders,
}: {
  onCompleted: () => void
  onOpenChange: (open: boolean) => void
  onOrdersChanged: () => void
  open: boolean
  selectedOrderIds: string[]
  selectedOrders: OrderDashboardOrder[]
}) {
  const { t } = useTranslation("orderDashboard")
  const [locationId, setLocationId] = useState("")
  const [sendNotification, setSendNotification] = useState(true)
  const [notificationDefaultApplied, setNotificationDefaultApplied] =
    useState(false)
  const [result, setResult] =
    useState<OrderDashboardFulfillmentBulkResult | null>(null)

  const fulfillmentOrdersQuery = useQuery({
    enabled: open && selectedOrderIds.length > 0,
    queryFn: () => listOrderDashboardFulfillmentOrders(selectedOrderIds),
    queryKey: ["order-dashboard-fulfillment-orders", selectedOrderIds],
  })
  const stockLocationsQuery = useQuery({
    enabled: open,
    queryFn: listOrderDashboardStockLocations,
    queryKey: ["order-dashboard-stock-locations"],
  })
  const shippingOptionsQuery = useQuery({
    enabled: open && !!locationId,
    queryFn: () => listOrderDashboardShippingOptions(locationId),
    queryKey: ["order-dashboard-shipping-options", locationId],
  })

  const stockLocations = stockLocationsQuery.data ?? []
  const shippingOptions = shippingOptionsQuery.data ?? []
  const preview = useMemo(
    () =>
      locationId && fulfillmentOrdersQuery.data && shippingOptionsQuery.data
        ? getBulkFulfillmentPreview(
            fulfillmentOrdersQuery.data,
            selectedOrders,
            shippingOptions,
            t
          )
        : { fulfillable: [], skipped: [] },
    [
      fulfillmentOrdersQuery.data,
      locationId,
      selectedOrders,
      shippingOptions,
      shippingOptionsQuery.data,
      t,
    ]
  )
  const isPreviewLoading =
    fulfillmentOrdersQuery.isLoading ||
    stockLocationsQuery.isLoading ||
    (!!locationId && shippingOptionsQuery.isLoading)
  const previewError =
    fulfillmentOrdersQuery.error ??
    stockLocationsQuery.error ??
    shippingOptionsQuery.error

  const fulfillmentMutation = useMutation({
    mutationFn: async (
      orders: OrderDashboardFulfillmentPreviewOrder[]
    ): Promise<OrderDashboardFulfillmentBulkResult> => {
      const fulfilled: OrderDashboardFulfillmentBulkResult["fulfilled"] = []
      const failed: OrderDashboardBlockingOrder[] = []

      for (const order of orders) {
        try {
          await createOrderDashboardFulfillment({
            items: order.items,
            locationId,
            noNotification: !sendNotification,
            orderId: order.id,
            shippingOptionId: order.shippingOptionId,
          })
          fulfilled.push({
            id: order.id,
            order_display_id: order.order_display_id,
          })
        } catch (error) {
          failed.push({
            id: order.id,
            order_display_id: order.order_display_id,
            reason: getErrorMessage(error, t("toast.requestFailed")),
          })
        }
      }

      return { failed, fulfilled }
    },
    onSuccess: (bulkResult) => {
      setResult(bulkResult)

      if (bulkResult.fulfilled.length > 0) {
        toast.success(
          bulkResult.failed.length
            ? t("toast.fulfillmentCreatedWithFailed", {
                count: bulkResult.fulfilled.length,
                failedCount: bulkResult.failed.length,
              })
            : t("toast.fulfillmentCreated", {
                count: bulkResult.fulfilled.length,
              })
        )
      } else {
        toast.error(
          bulkResult.failed[0]?.reason ?? t("toast.fulfillmentSkipped")
        )
      }

      if (!bulkResult.failed.length) {
        onOpenChange(false)
        onCompleted()
        return
      }

      if (bulkResult.fulfilled.length > 0) {
        onOrdersChanged()
      }
    },
  })

  useEffect(() => {
    if (!open) {
      setLocationId("")
      setNotificationDefaultApplied(false)
      setResult(null)
      setSendNotification(true)
    }
  }, [open])

  useEffect(() => {
    if (!open || locationId || !stockLocations.length) {
      return
    }

    setLocationId(stockLocations[0].id)
  }, [locationId, open, stockLocations])

  useEffect(() => {
    if (
      !open ||
      notificationDefaultApplied ||
      !fulfillmentOrdersQuery.data?.length
    ) {
      return
    }

    setSendNotification(
      fulfillmentOrdersQuery.data.some((order) => !order.no_notification)
    )
    setNotificationDefaultApplied(true)
  }, [fulfillmentOrdersQuery.data, notificationDefaultApplied, open])

  const handleOpenChange = (nextOpen: boolean) => {
    if (fulfillmentMutation.isPending) {
      return
    }

    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    if (!preview.fulfillable.length) {
      toast.error(t("toast.fulfillmentSkipped"))
      return
    }

    fulfillmentMutation.mutate(preview.fulfillable)
  }

  return (
    <FocusModal onOpenChange={handleOpenChange} open={open}>
      <FocusModal.Content>
        <div className="flex h-full flex-col overflow-hidden">
          <FocusModal.Header>
            <div className="flex w-full items-center justify-end gap-x-2">
              <FocusModal.Close asChild>
                <Button
                  disabled={fulfillmentMutation.isPending}
                  size="small"
                  type="button"
                  variant="secondary"
                >
                  {t("actions.cancel")}
                </Button>
              </FocusModal.Close>
              <Button
                disabled={
                  !preview.fulfillable.length ||
                  isPreviewLoading ||
                  !!previewError ||
                  fulfillmentMutation.isPending
                }
                isLoading={fulfillmentMutation.isPending}
                onClick={handleSubmit}
                size="small"
                type="button"
              >
                {t("fulfillmentModal.confirm")}
              </Button>
            </div>
          </FocusModal.Header>

          <FocusModal.Body className="flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-[920px] flex-col gap-6 px-6 py-6">
              <div className="flex flex-col gap-1">
                <Text leading="compact" size="large" weight="plus">
                  {t("fulfillmentModal.title")}
                </Text>
                <Text
                  className="text-ui-fg-subtle"
                  leading="compact"
                  size="small"
                >
                  {t("fulfillmentModal.description")}
                </Text>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div className="flex flex-col gap-2">
                  <Label>{t("fulfillmentModal.location")}</Label>
                  <Select
                    disabled={
                      stockLocationsQuery.isLoading ||
                      fulfillmentMutation.isPending ||
                      !stockLocations.length
                    }
                    onValueChange={(value) => {
                      setLocationId(value)
                      setResult(null)
                    }}
                    value={locationId}
                  >
                    <Select.Trigger>
                      <Select.Value
                        placeholder={t("fulfillmentModal.locationPlaceholder")}
                      />
                    </Select.Trigger>
                    <Select.Content>
                      {stockLocations.map((location) => (
                        <Select.Item key={location.id} value={location.id}>
                          {location.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>

                <div className="flex h-8 items-center justify-between gap-3">
                  <Label htmlFor="order-dashboard-fulfillment-notify">
                    {t("fulfillmentModal.notifyCustomers")}
                  </Label>
                  <Switch
                    checked={sendNotification}
                    disabled={fulfillmentMutation.isPending}
                    id="order-dashboard-fulfillment-notify"
                    onCheckedChange={setSendNotification}
                  />
                </div>
              </div>

              {previewError ? (
                <Text
                  className="text-ui-fg-error"
                  leading="compact"
                  size="small"
                >
                  {getErrorMessage(previewError, t("toast.requestFailed"))}
                </Text>
              ) : isPreviewLoading ? (
                <Text
                  className="text-ui-fg-subtle"
                  leading="compact"
                  size="small"
                >
                  {t("fulfillmentModal.loading")}
                </Text>
              ) : stockLocations.length ? (
                locationId ? (
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <FulfillmentMetric
                        label={t("fulfillmentModal.selected", {
                          count: selectedOrders.length,
                        })}
                      />
                      <FulfillmentMetric
                        label={t("fulfillmentModal.eligible", {
                          count: preview.fulfillable.length,
                        })}
                      />
                      <FulfillmentMetric
                        label={t("fulfillmentModal.skippedCount", {
                          count: preview.skipped.length,
                        })}
                      />
                    </div>

                    <FulfillmentPreviewSection
                      emptyMessage={t("fulfillmentModal.noEligible")}
                      orders={preview.fulfillable}
                      title={t("fulfillmentModal.eligible", {
                        count: preview.fulfillable.length,
                      })}
                    />

                    {preview.skipped.length ? (
                      <BlockingOrderPreviewSection
                        blockedOrders={preview.skipped}
                        hiddenLabelKey="fulfillmentModal.skippedMore"
                        rowLabelKey="fulfillmentModal.skipped"
                        title={t("fulfillmentModal.skippedCount", {
                          count: preview.skipped.length,
                        })}
                      />
                    ) : null}

                    {result ? <FulfillmentResultPanel result={result} /> : null}
                  </div>
                ) : (
                  <Text
                    className="text-ui-fg-subtle"
                    leading="compact"
                    size="small"
                  >
                    {t("fulfillmentModal.previewUnavailable")}
                  </Text>
                )
              ) : (
                <Text
                  className="text-ui-fg-error"
                  leading="compact"
                  size="small"
                >
                  {t("fulfillmentModal.stockLocationsUnavailable")}
                </Text>
              )}
            </div>
          </FocusModal.Body>
        </div>
      </FocusModal.Content>
    </FocusModal>
  )
}

function FulfillmentMetric({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
      <Text leading="compact" size="small" weight="plus">
        {label}
      </Text>
    </div>
  )
}

function FulfillmentPreviewSection({
  emptyMessage,
  orders,
  title,
}: {
  emptyMessage: string
  orders: OrderDashboardFulfillmentPreviewOrder[]
  title: string
}) {
  const { t } = useTranslation("orderDashboard")
  const visibleOrders = orders.slice(0, 20)
  const hiddenCount = orders.length - visibleOrders.length

  return (
    <div className="flex flex-col gap-2">
      <Text leading="compact" size="small" weight="plus">
        {title}
      </Text>
      {orders.length ? (
        <div className="divide-y overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base">
          {visibleOrders.map((order) => {
            const itemCount = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0
            )

            return (
              <div
                className="grid gap-2 px-3 py-2 md:grid-cols-[160px_1fr_auto]"
                key={order.id}
              >
                <Text leading="compact" size="small" weight="plus">
                  {order.order_display_id}
                </Text>
                <Text
                  className="text-ui-fg-subtle"
                  leading="compact"
                  size="small"
                >
                  {order.itemSummaries
                    .map((item) => `${item.quantity}x ${item.title}`)
                    .join(", ")}
                </Text>
                <Text
                  className="text-ui-fg-muted"
                  leading="compact"
                  size="small"
                >
                  {t("fulfillmentModal.items", { count: itemCount })}
                </Text>
              </div>
            )
          })}
          {hiddenCount > 0 ? (
            <Text className="px-3 py-2 text-ui-fg-muted" size="small">
              {t("fulfillmentModal.eligibleMore", { count: hiddenCount })}
            </Text>
          ) : null}
        </div>
      ) : (
        <Text className="text-ui-fg-subtle" leading="compact" size="small">
          {emptyMessage}
        </Text>
      )}
    </div>
  )
}

function BlockingOrderPreviewSection({
  blockedOrders,
  hiddenLabelKey,
  rowLabelKey,
  title,
}: {
  blockedOrders: OrderDashboardBlockingOrder[]
  hiddenLabelKey: string
  rowLabelKey: string
  title: string
}) {
  const { t } = useTranslation("orderDashboard")
  const visibleOrders = blockedOrders.slice(0, 20)
  const hiddenCount = blockedOrders.length - visibleOrders.length

  return (
    <div className="flex flex-col gap-2">
      <Text leading="compact" size="small" weight="plus">
        {title}
      </Text>
      <div className="divide-y overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base">
        {visibleOrders.map((order) => (
          <Text
            className="px-3 py-2"
            key={`${order.id}-${order.reason}`}
            leading="compact"
            size="small"
          >
            {t(rowLabelKey, {
              order: order.order_display_id,
              reason: order.reason,
            })}
          </Text>
        ))}
        {hiddenCount > 0 ? (
          <Text className="px-3 py-2 text-ui-fg-muted" size="small">
            {t(hiddenLabelKey, { count: hiddenCount })}
          </Text>
        ) : null}
      </div>
    </div>
  )
}

function FulfillmentResultPanel({
  result,
}: {
  result: OrderDashboardFulfillmentBulkResult
}) {
  const { t } = useTranslation("orderDashboard")
  const fulfilledOrders = result.fulfilled.slice(0, 20)
  const hiddenFulfilledCount = result.fulfilled.length - fulfilledOrders.length

  return (
    <div className="flex flex-col gap-3 border-ui-border-base border-t pt-4">
      {result.fulfilled.length ? (
        <div className="flex flex-col gap-2">
          <Text leading="compact" size="small" weight="plus">
            {t("fulfillmentModal.fulfilledCount", {
              count: result.fulfilled.length,
            })}
          </Text>
          <div className="divide-y overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base">
            {fulfilledOrders.map((order) => (
              <Text
                className="px-3 py-2"
                key={order.id}
                leading="compact"
                size="small"
              >
                {t("fulfillmentModal.fulfilled", {
                  order: order.order_display_id,
                })}
              </Text>
            ))}
            {hiddenFulfilledCount > 0 ? (
              <Text className="px-3 py-2 text-ui-fg-muted" size="small">
                {t("fulfillmentModal.fulfilledMore", {
                  count: hiddenFulfilledCount,
                })}
              </Text>
            ) : null}
          </div>
        </div>
      ) : null}

      {result.failed.length ? (
        <BlockingOrderPreviewSection
          blockedOrders={result.failed}
          hiddenLabelKey="fulfillmentModal.failedMore"
          rowLabelKey="fulfillmentModal.failed"
          title={t("fulfillmentModal.failedCount", {
            count: result.failed.length,
          })}
        />
      ) : null}
    </div>
  )
}

function getBulkFulfillmentPreview(
  fulfillmentOrders: OrderDashboardFulfillmentOrder[],
  selectedOrders: OrderDashboardOrder[],
  shippingOptions: OrderDashboardShippingOption[],
  t: TranslationFunction
) {
  const fulfillmentOrdersById = new Map(
    fulfillmentOrders.map((order) => [order.id, order])
  )
  const shippingOptionsById = new Map(
    shippingOptions.map((option) => [option.id, option])
  )
  const fulfillable: OrderDashboardFulfillmentPreviewOrder[] = []
  const skipped: OrderDashboardBlockingOrder[] = []

  for (const selectedOrder of selectedOrders) {
    const order = fulfillmentOrdersById.get(selectedOrder.id)
    const orderDisplayId =
      selectedOrder.order_display_id ?? formatFulfillmentOrderDisplayId(order)

    if (!order) {
      skipped.push({
        id: selectedOrder.id,
        order_display_id: orderDisplayId,
        reason: t("fulfillmentBlocker.missingOrder"),
      })
      continue
    }

    const skipReason = getFulfillmentSkipReason(order, shippingOptionsById, t)

    if (skipReason) {
      skipped.push({
        id: selectedOrder.id,
        order_display_id: orderDisplayId,
        reason: skipReason,
      })
      continue
    }

    const shippingOptionId = getOrderShippingOptionId(order)
    if (!shippingOptionId) {
      continue
    }

    const shippingOption = shippingOptionsById.get(shippingOptionId)
    const items = getFulfillableShippingItems(order, shippingOption)
    const fulfillmentItems = items.map((item) => ({
      id: item.id,
      quantity: getFulfillableQuantity(item),
      title: item.title,
    }))

    fulfillable.push({
      id: selectedOrder.id,
      itemSummaries: fulfillmentItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        title: item.title,
      })),
      items: fulfillmentItems.map((item) => ({
        id: item.id,
        quantity: item.quantity,
      })),
      order_display_id: orderDisplayId,
      shippingOptionId,
    })
  }

  return { fulfillable, skipped }
}

function getFulfillmentSkipReason(
  order: OrderDashboardFulfillmentOrder,
  shippingOptionsById: Map<string, OrderDashboardShippingOption>,
  t: TranslationFunction
) {
  if (order.status === "canceled") {
    return t("fulfillmentBlocker.canceled")
  }

  const fulfillableItems = getFulfillableShippingItems(order)

  if (!fulfillableItems.length) {
    return t("fulfillmentBlocker.noFulfillableItems")
  }

  const shippingOptionId = getOrderShippingOptionId(order)

  if (!shippingOptionId) {
    return t("fulfillmentBlocker.noShippingOption")
  }

  const shippingOption = shippingOptionsById.get(shippingOptionId)

  if (!shippingOption) {
    return t("fulfillmentBlocker.shippingOptionUnavailable")
  }

  if (!getFulfillableShippingItems(order, shippingOption).length) {
    return t("fulfillmentBlocker.shippingProfileMismatch")
  }

  return
}

function getFulfillableShippingItems(
  order: OrderDashboardFulfillmentOrder,
  shippingOption?: OrderDashboardShippingOption
) {
  const shippingProfileId = shippingOption?.shipping_profile_id

  return (order.items ?? []).filter((item) => {
    if (item.requires_shipping !== true || getFulfillableQuantity(item) <= 0) {
      return false
    }

    if (!shippingProfileId) {
      return true
    }

    return getItemShippingProfileId(item) === shippingProfileId
  })
}

function getFulfillableQuantity(item: OrderDashboardFulfillmentItem) {
  return Math.max(item.quantity - (item.detail?.fulfilled_quantity ?? 0), 0)
}

function getItemShippingProfileId(item: OrderDashboardFulfillmentItem) {
  return item.variant?.product?.shipping_profile?.id ?? null
}

function getOrderShippingOptionId(order: OrderDashboardFulfillmentOrder) {
  return (
    order.shipping_methods?.find((method) => method.shipping_option_id)
      ?.shipping_option_id ?? null
  )
}

function formatFulfillmentOrderDisplayId(
  order?: OrderDashboardFulfillmentOrder
) {
  if (!order) {
    return "-"
  }

  return order.display_id ? `#${order.display_id}` : order.id
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
