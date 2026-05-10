import type { MedusaContainer } from "@medusajs/framework"
import type { ILockingModule, Logger, Query } from "@medusajs/framework/types"
import {
  ChangeActionType,
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  OrderChangeStatus,
} from "@medusajs/framework/utils"
import {
  beginOrderEditOrderWorkflow,
  cancelBeginOrderEditWorkflow,
  confirmOrderEditRequestWorkflow,
  createOrderChangeActionsWorkflow,
  orderEditUpdateItemQuantityWorkflow,
  requestOrderEditRequestWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  type CommercialAdjustmentInput,
  type CommercialValuesCalculationInput,
  type CommercialValuesConfirmRequest,
  type CommercialValuesConfirmResponse,
  type CommercialValuesPreview,
  calculateCommercialValuesPreview,
  isManualDiscountAdjustment,
  MANUAL_ITEM_DISCOUNT_CODE,
  MANUAL_ORDER_DISCOUNT_CODE,
} from "../../utils/order-commercial-values"

type ApplyCommercialValuesOrderItem = {
  id: string
  adjustments?: CommercialAdjustmentInput[] | null
  quantity?: number | string | null
  unit_price?: number | string | null
}

type ReplacementAdjustment = {
  amount: number
  code?: string
  description?: string
  is_tax_inclusive?: boolean
  item_id: string
  promotion_id?: string
  provider_id?: string
}

export type ApplyCommercialValuesOrder = {
  id: string
  items?: ApplyCommercialValuesOrderItem[] | null
}

type ActiveOrderChange = {
  id: string
  version: number
}

type ActiveOrderChangeRecord = {
  id: string
  version?: number | string | null
}

type CommercialValuesPreviewItem = CommercialValuesPreview["items"][number]

type ApplyCommercialValuesInput = {
  actor_id?: string
  calculation_input: CommercialValuesCalculationInput
  container: MedusaContainer
  order: ApplyCommercialValuesOrder
  request: CommercialValuesConfirmRequest
}

const COMMERCIAL_VALUES_LOCK_PREFIX = "order-commercial-values:apply"
const COMMERCIAL_VALUES_LOCK_TIMEOUT_SECONDS = 5

function toFiniteNumber(value: number | string | null | undefined) {
  const numberValue = typeof value === "string" ? Number(value) : value

  if (typeof numberValue !== "number" || !Number.isFinite(numberValue)) {
    throw new Error(`Expected finite numeric value, got ${String(value)}`)
  }

  return numberValue
}

function toInteger(value: number | string | null | undefined) {
  const numberValue = toFiniteNumber(value)

  if (!Number.isSafeInteger(numberValue)) {
    throw new Error(`Expected integer value, got ${String(value)}`)
  }

  return numberValue
}

function toPositiveNumber(value: number | string | null | undefined) {
  const numberValue = toFiniteNumber(value)

  if (numberValue <= 0) {
    throw new Error(`Expected positive numeric value, got ${String(value)}`)
  }

  return numberValue
}

function toActiveOrderChange(
  orderChange: ActiveOrderChangeRecord | null | undefined
): ActiveOrderChange {
  if (!orderChange?.id) {
    throw new Error("Order change id is missing")
  }

  return {
    id: orderChange.id,
    version: toInteger(orderChange.version),
  }
}

function getCommercialValuesLockKey(orderId: string) {
  return `${COMMERCIAL_VALUES_LOCK_PREFIX}:${encodeURIComponent(orderId)}`
}

function getRequestedItem(
  request: CommercialValuesConfirmRequest,
  itemId: string
) {
  return request.items.find((item) => item.item_id === itemId)
}

function getPreviewItem(preview: CommercialValuesPreview, itemId: string) {
  return preview.items.find((item) => item.item_id === itemId)
}

function toReplacementAdjustment(
  adjustment: CommercialAdjustmentInput,
  itemId: string
): ReplacementAdjustment {
  return {
    amount: adjustment.amount,
    code: adjustment.code ?? undefined,
    description: adjustment.description ?? undefined,
    is_tax_inclusive: adjustment.is_tax_inclusive ?? undefined,
    item_id: adjustment.item_id ?? itemId,
    promotion_id: adjustment.promotion_id ?? undefined,
    provider_id: adjustment.provider_id ?? undefined,
  }
}

function getPreservedAdjustments(item: ApplyCommercialValuesOrderItem) {
  return (item.adjustments ?? [])
    .filter((adjustment) => !isManualDiscountAdjustment(adjustment))
    .map((adjustment) => toReplacementAdjustment(adjustment, item.id))
}

function hasExistingManualAdjustment(
  item: ApplyCommercialValuesOrderItem,
  code: string
) {
  return (item.adjustments ?? []).some((adjustment) => adjustment.code === code)
}

function getExistingManualAdjustments(
  item: ApplyCommercialValuesOrderItem,
  code: string
) {
  return (item.adjustments ?? [])
    .filter((adjustment) => adjustment.code === code)
    .map((adjustment) => toReplacementAdjustment(adjustment, item.id))
}

function hasRequestedItemDiscount(
  requested: ReturnType<typeof getRequestedItem>
) {
  return requested ? "discount" in requested : false
}

function buildManualDiscountAdjustments({
  item,
  itemDiscountRequested,
  orderDiscountRequested,
  previewItem,
}: {
  item: ApplyCommercialValuesOrderItem
  itemDiscountRequested: boolean
  orderDiscountRequested: boolean
  previewItem: CommercialValuesPreviewItem
}) {
  const manualAdjustments: ReplacementAdjustment[] = []

  if (!itemDiscountRequested) {
    manualAdjustments.push(
      ...getExistingManualAdjustments(item, MANUAL_ITEM_DISCOUNT_CODE)
    )
  } else if (previewItem.manual_item_discount_amount > 0) {
    manualAdjustments.push({
      amount: previewItem.manual_item_discount_amount,
      code: MANUAL_ITEM_DISCOUNT_CODE,
      description: "Manual item discount",
      item_id: item.id,
    })
  }

  if (!orderDiscountRequested) {
    manualAdjustments.push(
      ...getExistingManualAdjustments(item, MANUAL_ORDER_DISCOUNT_CODE)
    )
  } else if (previewItem.manual_order_discount_amount > 0) {
    manualAdjustments.push({
      amount: previewItem.manual_order_discount_amount,
      code: MANUAL_ORDER_DISCOUNT_CODE,
      description: "Allocated manual order discount",
      item_id: item.id,
    })
  }

  return manualAdjustments
}

function shouldReplaceManualDiscounts({
  item,
  itemDiscountRequested,
  orderDiscountRequested,
  previewItem,
}: {
  item: ApplyCommercialValuesOrderItem
  itemDiscountRequested: boolean
  orderDiscountRequested: boolean
  previewItem: CommercialValuesPreviewItem
}) {
  const shouldReplaceItemDiscount =
    itemDiscountRequested &&
    (hasExistingManualAdjustment(item, MANUAL_ITEM_DISCOUNT_CODE) ||
      previewItem.manual_item_discount_amount > 0)
  const shouldReplaceOrderDiscount =
    orderDiscountRequested &&
    (hasExistingManualAdjustment(item, MANUAL_ORDER_DISCOUNT_CODE) ||
      previewItem.manual_order_discount_amount > 0)

  return shouldReplaceItemDiscount || shouldReplaceOrderDiscount
}

function buildItemUpdateInputs(
  order: ApplyCommercialValuesOrder,
  request: CommercialValuesConfirmRequest
) {
  return (order.items ?? []).flatMap((item) => {
    const requested = getRequestedItem(request, item.id)
    const currentUnitPrice = toFiniteNumber(item.unit_price)

    if (!requested || requested.unit_price === currentUnitPrice) {
      return []
    }

    return [
      {
        id: item.id,
        internal_note: request.internal_note,
        quantity: toPositiveNumber(item.quantity),
        unit_price: requested.unit_price,
      },
    ]
  })
}

function buildReplacementActions({
  activeOrderChange,
  order,
  preview,
  request,
}: {
  activeOrderChange: ActiveOrderChange
  order: ApplyCommercialValuesOrder
  preview: CommercialValuesPreview
  request: CommercialValuesConfirmRequest
}) {
  return (order.items ?? []).flatMap((item) => {
    const requested = getRequestedItem(request, item.id)
    const previewItem = getPreviewItem(preview, item.id)

    if (!previewItem) {
      return []
    }

    const itemDiscountRequested = hasRequestedItemDiscount(requested)
    const orderDiscountRequested = request.order_discount !== undefined
    const preservedAdjustments = getPreservedAdjustments(item)
    const manualAdjustments = buildManualDiscountAdjustments({
      item,
      itemDiscountRequested,
      orderDiscountRequested,
      previewItem,
    })

    if (
      !shouldReplaceManualDiscounts({
        item,
        itemDiscountRequested,
        orderDiscountRequested,
        previewItem,
      })
    ) {
      return []
    }

    return [
      {
        action: ChangeActionType.ITEM_ADJUSTMENTS_REPLACE,
        details: {
          adjustments: [...preservedAdjustments, ...manualAdjustments],
          manual_discounts: {
            item_discount_amount: previewItem.manual_item_discount_amount,
            order_discount_amount: previewItem.manual_order_discount_amount,
          },
          reference_id: item.id,
        },
        internal_note: request.internal_note,
        order_change_id: activeOrderChange.id,
        order_id: order.id,
        version: activeOrderChange.version,
      },
    ]
  })
}

async function fetchActiveOrderChange(query: Query, orderId: string) {
  const { data } = await query.graph({
    entity: "order_change",
    fields: ["id", "version"],
    filters: {
      order_id: orderId,
      status: [OrderChangeStatus.PENDING, OrderChangeStatus.REQUESTED],
    },
    pagination: { take: 1 },
  })

  const activeOrderChange = (data as ActiveOrderChangeRecord[])[0]

  return activeOrderChange ? toActiveOrderChange(activeOrderChange) : undefined
}

async function fetchOrderVersion(query: Query, orderId: string) {
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "version"],
    filters: { id: orderId },
  })

  const order = (
    data as Array<{ id: string; version?: number | string | null }>
  )[0]

  if (!order) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order ${orderId} was not found`
    )
  }

  return toInteger(order.version ?? 0)
}

async function assertOrderCanBeginCommercialEdit(
  query: Query,
  orderId: string,
  expectedOrderVersion: number
) {
  const activeOrderChange = await fetchActiveOrderChange(query, orderId)

  if (activeOrderChange) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Order already has active order change ${activeOrderChange.id}`
    )
  }

  const orderVersion = await fetchOrderVersion(query, orderId)
  if (orderVersion !== expectedOrderVersion) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Expected order version ${expectedOrderVersion}, got ${orderVersion}`
    )
  }
}

async function cancelStartedEdit(
  container: MedusaContainer,
  logger: Logger,
  orderId: string
) {
  try {
    await cancelBeginOrderEditWorkflow(container).run({
      input: { order_id: orderId },
    })
  } catch (error) {
    logger.error(
      `Failed to cancel commercial values order edit for ${orderId}`,
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

export async function applyOrderCommercialValues({
  actor_id,
  calculation_input,
  container,
  order,
  request,
}: ApplyCommercialValuesInput): Promise<CommercialValuesConfirmResponse> {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)
  const confirmationMode = request.confirmation_mode ?? "confirm"
  const preview = calculateCommercialValuesPreview(calculation_input)

  return lockingModule.execute(
    getCommercialValuesLockKey(order.id),
    async () => {
      let beganEdit = false
      let finishedEdit = false

      try {
        await assertOrderCanBeginCommercialEdit(
          query,
          order.id,
          request.expected_order_version
        )

        const { result: orderChange } = await beginOrderEditOrderWorkflow(
          container
        ).run({
          input: {
            created_by: actor_id,
            internal_note: request.internal_note,
            order_id: order.id,
          },
        })

        beganEdit = true

        const activeOrderChange = toActiveOrderChange(orderChange)
        const orderChangeId = activeOrderChange.id

        const itemUpdates = buildItemUpdateInputs(order, request)
        if (itemUpdates.length > 0) {
          await orderEditUpdateItemQuantityWorkflow(container).run({
            input: {
              items: itemUpdates,
              order_id: order.id,
            },
          })
        }

        const replacementActions = buildReplacementActions({
          activeOrderChange,
          order,
          preview,
          request,
        })

        if (replacementActions.length > 0) {
          await createOrderChangeActionsWorkflow(container).run({
            input: replacementActions,
          })
        }

        if (confirmationMode === "request") {
          const { result: requestResult } =
            await requestOrderEditRequestWorkflow(container).run({
              input: {
                order_id: order.id,
                requested_by: actor_id,
              },
            })
          finishedEdit = true

          return {
            mode: "requested",
            order_change_id: orderChangeId,
            order_preview: requestResult,
            preview,
          }
        }

        const { result: confirmResult } = await confirmOrderEditRequestWorkflow(
          container
        ).run({
          input: {
            confirmed_by: actor_id,
            order_id: order.id,
          },
        })
        finishedEdit = true

        return {
          mode: "confirmed",
          order_change_id: orderChangeId,
          order_preview: confirmResult,
          preview,
        }
      } finally {
        if (beganEdit && !finishedEdit) {
          await cancelStartedEdit(container, logger, order.id)
        }
      }
    },
    { timeout: COMMERCIAL_VALUES_LOCK_TIMEOUT_SECONDS }
  )
}
