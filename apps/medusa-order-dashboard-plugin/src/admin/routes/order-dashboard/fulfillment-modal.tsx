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
import { useState } from "react"
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

type TranslationFunction = ReturnType<typeof useTranslation>["t"]

interface OrderDashboardBlockingOrder {
  id: string
  order_display_id: string
  reason: string
}

interface OrderDashboardFulfillmentPreviewOrder {
  id: string
  itemSummaries: {
    id: string
    quantity: number
    title: string
  }[]
  items: OrderDashboardFulfillmentCreateItem[]
  order_display_id: string
  shippingOptionId: string
}

interface OrderDashboardFulfillmentBulkResult {
  failed: OrderDashboardBlockingOrder[]
  fulfilled: {
    id: string
    order_display_id: string
  }[]
}

interface OrderDashboardFulfillmentPreview {
  fulfillable: OrderDashboardFulfillmentPreviewOrder[]
  skipped: OrderDashboardBlockingOrder[]
}

type FulfillmentAttempt =
  | {
      order: OrderDashboardBlockingOrder
      status: "failed"
    }
  | {
      order: OrderDashboardFulfillmentBulkResult["fulfilled"][number]
      status: "fulfilled"
    }

interface OrderFulfillmentModalProps {
  onCompleted: () => void
  onOpenChange: (open: boolean) => void
  onOrdersChanged: () => void
  open: boolean
  selectedOrderIds: string[]
  selectedOrders: OrderDashboardOrder[]
}

const getFailureMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const getFulfillableQuantity = (item: OrderDashboardFulfillmentItem) =>
  Math.max(item.quantity - (item.detail?.fulfilled_quantity ?? 0), 0)

const getItemShippingProfileId = (item: OrderDashboardFulfillmentItem) =>
  item.variant?.product?.shipping_profile?.id ?? null

const getFulfillableShippingItems = (
  order: OrderDashboardFulfillmentOrder,
  shippingOption?: OrderDashboardShippingOption,
) => {
  const shippingProfileId = shippingOption?.shipping_profile_id

  return (order.items ?? []).filter((item) => {
    if (item.requires_shipping !== true || getFulfillableQuantity(item) <= 0) {
      return false
    }

    if (shippingProfileId === undefined || shippingProfileId === null) {
      return true
    }

    return getItemShippingProfileId(item) === shippingProfileId
  })
}

const getOrderShippingOptionId = (
  order: OrderDashboardFulfillmentOrder,
): string | null =>
  order.shipping_methods?.find(
    (method) =>
      method.shipping_option_id !== undefined &&
      method.shipping_option_id !== null &&
      method.shipping_option_id !== "",
  )?.shipping_option_id ?? null

const formatFulfillmentOrderDisplayId = (
  order?: OrderDashboardFulfillmentOrder,
) => {
  if (!order) {
    return "-"
  }

  return order.display_id === undefined || order.display_id === null
    ? order.id
    : `#${order.display_id}`
}

const getFulfillmentSkipReason = (
  order: OrderDashboardFulfillmentOrder,
  shippingOptionsById: Map<string, OrderDashboardShippingOption>,
  t: TranslationFunction,
): string | null => {
  if (order.status === "canceled") {
    return t("fulfillmentBlocker.canceled")
  }

  const fulfillableItems = getFulfillableShippingItems(order)

  if (fulfillableItems.length === 0) {
    return t("fulfillmentBlocker.noFulfillableItems")
  }

  const shippingOptionId = getOrderShippingOptionId(order)

  if (shippingOptionId === null) {
    return t("fulfillmentBlocker.noShippingOption")
  }

  const shippingOption = shippingOptionsById.get(shippingOptionId)

  if (!shippingOption) {
    return t("fulfillmentBlocker.shippingOptionUnavailable")
  }

  if (getFulfillableShippingItems(order, shippingOption).length === 0) {
    return t("fulfillmentBlocker.shippingProfileMismatch")
  }

  return null
}

const getBulkFulfillmentPreview = (
  fulfillmentOrders: OrderDashboardFulfillmentOrder[],
  selectedOrders: OrderDashboardOrder[],
  shippingOptions: OrderDashboardShippingOption[],
  t: TranslationFunction,
): OrderDashboardFulfillmentPreview => {
  const fulfillmentOrdersById = new Map(
    fulfillmentOrders.map((order) => [order.id, order]),
  )
  const shippingOptionsById = new Map(
    shippingOptions.map((option) => [option.id, option]),
  )
  const fulfillable: OrderDashboardFulfillmentPreviewOrder[] = []
  const skipped: OrderDashboardBlockingOrder[] = []

  for (const selectedOrder of selectedOrders) {
    const order = fulfillmentOrdersById.get(selectedOrder.id)
    const orderDisplayId =
      selectedOrder.order_display_id ?? formatFulfillmentOrderDisplayId(order)

    if (order) {
      const skipReason = getFulfillmentSkipReason(order, shippingOptionsById, t)

      if (skipReason === null) {
        const shippingOptionId = getOrderShippingOptionId(order)

        if (shippingOptionId !== null) {
          const shippingOption = shippingOptionsById.get(shippingOptionId)
          const fulfillmentItems = getFulfillableShippingItems(
            order,
            shippingOption,
          ).map((item) => ({
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
      } else {
        skipped.push({
          id: selectedOrder.id,
          order_display_id: orderDisplayId,
          reason: skipReason,
        })
      }
    } else {
      skipped.push({
        id: selectedOrder.id,
        order_display_id: orderDisplayId,
        reason: t("fulfillmentBlocker.missingOrder"),
      })
    }
  }

  return { fulfillable, skipped }
}

const FulfillmentMetric = ({ label }: { label: string }) => (
  <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle px-3 py-2">
    <Text leading="compact" size="small" weight="plus">
      {label}
    </Text>
  </div>
)

const FulfillmentPreviewSection = ({
  emptyMessage,
  orders,
  title,
}: {
  emptyMessage: string
  orders: OrderDashboardFulfillmentPreviewOrder[]
  title: string
}) => {
  const { t } = useTranslation("orderDashboard")
  const visibleOrders = orders.slice(0, 20)
  const hiddenCount = orders.length - visibleOrders.length

  return (
    <div className="flex flex-col gap-2">
      <Text leading="compact" size="small" weight="plus">
        {title}
      </Text>
      {orders.length > 0 ? (
        <div className="divide-y overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base">
          {visibleOrders.map((order) => {
            const itemCount = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0,
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

const BlockingOrderPreviewSection = ({
  blockedOrders,
  hiddenLabelKey,
  rowLabelKey,
  title,
}: {
  blockedOrders: OrderDashboardBlockingOrder[]
  hiddenLabelKey: string
  rowLabelKey: string
  title: string
}) => {
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

const FulfillmentResultPanel = ({
  result,
}: {
  result: OrderDashboardFulfillmentBulkResult
}) => {
  const { t } = useTranslation("orderDashboard")
  const fulfilledOrders = result.fulfilled.slice(0, 20)
  const hiddenFulfilledCount = result.fulfilled.length - fulfilledOrders.length

  return (
    <div className="flex flex-col gap-3 border-ui-border-base border-t pt-4">
      {result.fulfilled.length > 0 ? (
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

      {result.failed.length > 0 ? (
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

const FulfillmentPreviewContent = ({
  isPreviewLoading,
  locationId,
  preview,
  previewError,
  result,
  selectedOrderCount,
  stockLocationCount,
  t,
}: {
  isPreviewLoading: boolean
  locationId: string
  preview: OrderDashboardFulfillmentPreview
  previewError: Error | null
  result: OrderDashboardFulfillmentBulkResult | null
  selectedOrderCount: number
  stockLocationCount: number
  t: TranslationFunction
}) => {
  if (previewError) {
    return (
      <Text className="text-ui-fg-error" leading="compact" size="small">
        {getFailureMessage(previewError, t("toast.requestFailed"))}
      </Text>
    )
  }

  if (isPreviewLoading) {
    return (
      <Text className="text-ui-fg-subtle" leading="compact" size="small">
        {t("fulfillmentModal.loading")}
      </Text>
    )
  }

  if (stockLocationCount === 0) {
    return (
      <Text className="text-ui-fg-error" leading="compact" size="small">
        {t("fulfillmentModal.stockLocationsUnavailable")}
      </Text>
    )
  }

  if (locationId === "") {
    return (
      <Text className="text-ui-fg-subtle" leading="compact" size="small">
        {t("fulfillmentModal.previewUnavailable")}
      </Text>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <FulfillmentMetric
          label={t("fulfillmentModal.selected", {
            count: selectedOrderCount,
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

      {preview.skipped.length > 0 ? (
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
  )
}

const OpenOrderFulfillmentModal = ({
  onCompleted,
  onOpenChange,
  onOrdersChanged,
  open,
  selectedOrderIds,
  selectedOrders,
}: OrderFulfillmentModalProps) => {
  const { t } = useTranslation("orderDashboard")
  const [locationIdOverride, setLocationIdOverride] = useState<string | null>(
    null,
  )
  const [sendNotificationOverride, setSendNotificationOverride] = useState<
    boolean | null
  >(null)
  const [result, setResult] =
    useState<OrderDashboardFulfillmentBulkResult | null>(null)

  const fulfillmentOrdersQuery = useQuery({
    queryFn: async () =>
      await listOrderDashboardFulfillmentOrders(selectedOrderIds),
    queryKey: ["order-dashboard-fulfillment-orders", selectedOrderIds],
  })
  const stockLocationsQuery = useQuery({
    queryFn: listOrderDashboardStockLocations,
    queryKey: ["order-dashboard-stock-locations"],
  })
  const stockLocations = stockLocationsQuery.data ?? []
  const locationId = locationIdOverride ?? stockLocations[0]?.id ?? ""
  const shippingOptionsQuery = useQuery({
    enabled: locationId !== "",
    queryFn: async () => await listOrderDashboardShippingOptions(locationId),
    queryKey: ["order-dashboard-shipping-options", locationId],
  })
  const shippingOptions = shippingOptionsQuery.data
  const preview =
    locationId !== "" && fulfillmentOrdersQuery.data && shippingOptions
      ? getBulkFulfillmentPreview(
          fulfillmentOrdersQuery.data,
          selectedOrders,
          shippingOptions,
          t,
        )
      : { fulfillable: [], skipped: [] }
  const isPreviewLoading = [
    fulfillmentOrdersQuery.isLoading,
    stockLocationsQuery.isLoading,
    locationId !== "" && shippingOptionsQuery.isLoading,
  ].includes(true)
  const previewError =
    [
      fulfillmentOrdersQuery.error,
      stockLocationsQuery.error,
      shippingOptionsQuery.error,
    ].find((error): error is Error => error instanceof Error) ?? null
  const defaultSendNotification =
    fulfillmentOrdersQuery.data?.some(
      (order) => order.no_notification !== true,
    ) ?? true
  const sendNotification = sendNotificationOverride ?? defaultSendNotification

  const fulfillmentMutation = useMutation({
    mutationFn: async (
      orders: OrderDashboardFulfillmentPreviewOrder[],
    ): Promise<OrderDashboardFulfillmentBulkResult> => {
      const attempts = await Promise.all(
        orders.map(async (order): Promise<FulfillmentAttempt> => {
          try {
            await createOrderDashboardFulfillment({
              items: order.items,
              locationId,
              noNotification: !sendNotification,
              orderId: order.id,
              shippingOptionId: order.shippingOptionId,
            })
            return {
              order: {
                id: order.id,
                order_display_id: order.order_display_id,
              },
              status: "fulfilled",
            }
          } catch (error) {
            return {
              order: {
                id: order.id,
                order_display_id: order.order_display_id,
                reason: getFailureMessage(error, t("toast.requestFailed")),
              },
              status: "failed",
            }
          }
        }),
      )
      const fulfilled: OrderDashboardFulfillmentBulkResult["fulfilled"] = []
      const failed: OrderDashboardBlockingOrder[] = []

      for (const attempt of attempts) {
        if (attempt.status === "fulfilled") {
          fulfilled.push(attempt.order)
        } else {
          failed.push(attempt.order)
        }
      }

      return { failed, fulfilled }
    },
    onSuccess: (bulkResult) => {
      setResult(bulkResult)

      if (bulkResult.fulfilled.length > 0) {
        toast.success(
          bulkResult.failed.length > 0
            ? t("toast.fulfillmentCreatedWithFailed", {
                count: bulkResult.fulfilled.length,
                failedCount: bulkResult.failed.length,
              })
            : t("toast.fulfillmentCreated", {
                count: bulkResult.fulfilled.length,
              }),
        )
      } else {
        toast.error(
          bulkResult.failed[0]?.reason ?? t("toast.fulfillmentSkipped"),
        )
      }

      if (bulkResult.failed.length === 0) {
        onOpenChange(false)
        onCompleted()
      } else if (bulkResult.fulfilled.length > 0) {
        onOrdersChanged()
      }
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    if (!fulfillmentMutation.isPending) {
      onOpenChange(nextOpen)
    }
  }

  const handleSubmit = () => {
    if (preview.fulfillable.length === 0) {
      toast.error(t("toast.fulfillmentSkipped"))
    } else {
      fulfillmentMutation.mutate(preview.fulfillable)
    }
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
                  preview.fulfillable.length === 0 ||
                  isPreviewLoading ||
                  previewError !== null ||
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
                      stockLocations.length === 0
                    }
                    onValueChange={(value) => {
                      setLocationIdOverride(value)
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
                    onCheckedChange={setSendNotificationOverride}
                  />
                </div>
              </div>

              <FulfillmentPreviewContent
                isPreviewLoading={isPreviewLoading}
                locationId={locationId}
                preview={preview}
                previewError={previewError}
                result={result}
                selectedOrderCount={selectedOrders.length}
                stockLocationCount={stockLocations.length}
                t={t}
              />
            </div>
          </FocusModal.Body>
        </div>
      </FocusModal.Content>
    </FocusModal>
  )
}

const orderFulfillmentModal = (props: OrderFulfillmentModalProps) =>
  props.open ? <OpenOrderFulfillmentModal {...props} /> : null

export { orderFulfillmentModal as OrderFulfillmentModal }
