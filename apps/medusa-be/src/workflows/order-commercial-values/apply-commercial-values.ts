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
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  beginOrderEditOrderWorkflow,
  cancelBeginOrderEditWorkflow,
  confirmOrderEditRequestWorkflow,
  createOrderChangeActionsWorkflow,
  orderEditUpdateItemQuantityWorkflow,
  requestOrderEditRequestWorkflow,
} from "@medusajs/medusa/core-flows"
import { isRecord } from "@techsio/std/object"

import {
  calculateCommercialValuesPreview,
  encodeCommercialDiscountDescription,
  isManualDiscountAdjustment,
  MANUAL_ITEM_DISCOUNT_CODE,
  MANUAL_ORDER_DISCOUNT_CODE,
  MANUAL_SHIPPING_DISCOUNT_CODE,
} from "../../utils/order-commercial-values"
import type {
  CommercialAdjustmentInput,
  CommercialValuesCalculationInput,
  CommercialValuesConfirmRequest,
  CommercialValuesConfirmResponse,
  CommercialValuesPreview,
} from "../../utils/order-commercial-values"

type NumericValue = number | string | null | undefined

interface ApplyCommercialValuesOrderItem {
  id: string
  adjustments?: CommercialAdjustmentInput[] | null | undefined
  quantity?: NumericValue
  unit_price?: NumericValue
}

interface ApplyCommercialValuesShippingMethod {
  id: string
  adjustments?: CommercialAdjustmentInput[] | null | undefined
}

type ApplyCommercialValuesAdjustmentTarget =
  | ApplyCommercialValuesOrderItem
  | ApplyCommercialValuesShippingMethod

interface ReplacementAdjustment {
  amount: number
  code?: string | undefined
  description?: string | undefined
  is_tax_inclusive?: boolean | undefined
  item_id?: string | undefined
  promotion_id?: string | undefined
  provider_id?: string | undefined
  shipping_method_id?: string | undefined
}

export interface ApplyCommercialValuesOrder {
  id: string
  items?: ApplyCommercialValuesOrderItem[] | null | undefined
  shipping_methods?: ApplyCommercialValuesShippingMethod[] | null | undefined
}

interface ActiveOrderChange {
  change_type?: string | null | undefined
  id: string
  version: number
}

interface ActiveOrderChangeRecord {
  change_type?: string | null | undefined
  id: string
  status?: string | null | undefined
  version?: unknown
}

type CommercialValuesPreviewItem = CommercialValuesPreview["items"][number]
type CommercialValuesPreviewShippingMethod =
  CommercialValuesPreview["shipping_methods"][number]

interface ApplyCommercialValuesInput {
  actor_id?: string | undefined
  calculation_input: CommercialValuesCalculationInput
  container: MedusaContainer
  order: ApplyCommercialValuesOrder
  request: CommercialValuesConfirmRequest
}

type ApplyCommercialValuesWorkflowInput = Omit<
  ApplyCommercialValuesInput,
  "container"
>

interface CommercialValuesOrderEditDependency {
  order_change_id: string
}

interface CommercialValuesOrderEditReadiness {
  active_order_change?: ActiveOrderChange | undefined
  order_id: string
}

type CommercialValuesOrderEditCompletion = Pick<
  CommercialValuesConfirmResponse,
  "mode" | "order_preview"
>

const COMMERCIAL_VALUES_LOCK_PREFIX = "order-commercial-values:apply"
const COMMERCIAL_VALUES_LOCK_TIMEOUT_SECONDS = 5
const MISSING_ORDER_CHANGE_ID_MESSAGE = "Order change id is missing"

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)

const toOptionalString = (value: unknown) =>
  typeof value === "string" ? value : undefined

const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== ""

const getFirstQueryRow = (data: unknown): unknown =>
  isUnknownArray(data) ? data[0] : undefined

const toFiniteNumber = (value: unknown) => {
  const numberValue = typeof value === "string" ? Number(value) : value

  if (typeof numberValue !== "number" || !Number.isFinite(numberValue)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Expected finite numeric value, got ${String(value)}`,
    )
  }

  return numberValue
}

const toInteger = (value: unknown) => {
  const numberValue = toFiniteNumber(value)

  if (!Number.isSafeInteger(numberValue)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Expected integer value, got ${String(value)}`,
    )
  }

  return numberValue
}

const toPositiveNumber = (value: unknown) => {
  const numberValue = toFiniteNumber(value)

  if (numberValue <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Expected positive numeric value, got ${String(value)}`,
    )
  }

  return numberValue
}

const requireOrderChangeId = (orderChangeId: unknown) => {
  if (typeof orderChangeId !== "string" || orderChangeId === "") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      MISSING_ORDER_CHANGE_ID_MESSAGE,
    )
  }

  return orderChangeId
}

const toActiveOrderChange = (
  orderChange: ActiveOrderChangeRecord | null | undefined,
): ActiveOrderChange => ({
  change_type: orderChange?.change_type ?? undefined,
  id: requireOrderChangeId(orderChange?.id),
  version: toInteger(orderChange?.version),
})

const toActiveOrderChangeRecord = (
  value: unknown,
): ActiveOrderChangeRecord | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  return {
    change_type: toOptionalString(value["change_type"]),
    id: toOptionalString(value["id"]) ?? "",
    status: toOptionalString(value["status"]),
    version: value["version"],
  }
}

const isReusableCommercialValuesOrderEdit = (
  activeOrderChange: ActiveOrderChangeRecord | null | undefined,
) =>
  activeOrderChange?.change_type === "edit" &&
  activeOrderChange.status === OrderChangeStatus.PENDING

const getCommercialValuesLockKey = (orderId: string) =>
  `${COMMERCIAL_VALUES_LOCK_PREFIX}:${encodeURIComponent(orderId)}`

const getRequestedItem = (
  request: CommercialValuesConfirmRequest,
  itemId: string,
) => request.items.find((item) => item.item_id === itemId)

const getPreviewItem = (preview: CommercialValuesPreview, itemId: string) =>
  preview.items.find((item) => item.item_id === itemId)

const getRequestedShippingMethod = (
  request: CommercialValuesConfirmRequest,
  shippingMethodId: string,
) =>
  request.shipping_methods?.find(
    (shippingMethod) => shippingMethod.shipping_method_id === shippingMethodId,
  )

const getPreviewShippingMethod = (
  preview: CommercialValuesPreview,
  shippingMethodId: string,
) =>
  preview.shipping_methods.find(
    (shippingMethod) => shippingMethod.shipping_method_id === shippingMethodId,
  )

const toReplacementAdjustment = (
  adjustment: CommercialAdjustmentInput,
  reference: { item_id?: string; shipping_method_id?: string },
): ReplacementAdjustment => ({
  amount: adjustment.amount,
  code: adjustment.code ?? undefined,
  description: adjustment.description ?? undefined,
  is_tax_inclusive: adjustment.is_tax_inclusive ?? undefined,
  item_id: adjustment.item_id ?? reference.item_id,
  promotion_id: adjustment.promotion_id ?? undefined,
  provider_id: adjustment.provider_id ?? undefined,
  shipping_method_id:
    adjustment.shipping_method_id ?? reference.shipping_method_id,
})

const getAdjustmentReference = (
  target: ApplyCommercialValuesAdjustmentTarget,
) =>
  "unit_price" in target
    ? { item_id: target.id }
    : { shipping_method_id: target.id }

const getPreservedAdjustments = (
  target: ApplyCommercialValuesAdjustmentTarget,
) => {
  const preservedAdjustments: ReplacementAdjustment[] = []

  for (const adjustment of target.adjustments ?? []) {
    if (!isManualDiscountAdjustment(adjustment)) {
      preservedAdjustments.push(
        toReplacementAdjustment(adjustment, getAdjustmentReference(target)),
      )
    }
  }

  return preservedAdjustments
}

const hasExistingManualAdjustment = (
  target: ApplyCommercialValuesAdjustmentTarget,
  code: string,
) => (target.adjustments ?? []).some((adjustment) => adjustment.code === code)

const getExistingManualAdjustments = (
  target: ApplyCommercialValuesAdjustmentTarget,
  code: string,
) => {
  const existingAdjustments: ReplacementAdjustment[] = []

  for (const adjustment of target.adjustments ?? []) {
    if (adjustment.code === code) {
      existingAdjustments.push(
        toReplacementAdjustment(adjustment, getAdjustmentReference(target)),
      )
    }
  }

  return existingAdjustments
}

const hasRequestedItemDiscount = (
  requested: ReturnType<typeof getRequestedItem>,
) => (requested ? "discount" in requested : false)

const hasRequestedShippingDiscount = (
  requested: ReturnType<typeof getRequestedShippingMethod>,
) => (requested ? "discount" in requested : false)

const toMedusaShippingAdjustmentAmount = (
  previewShippingMethod: CommercialValuesPreviewShippingMethod,
  displayAmount: number,
) => {
  const shippingTotal =
    previewShippingMethod.current_subtotal +
    previewShippingMethod.current_tax_total

  if (
    previewShippingMethod.current_tax_total <= 0 ||
    previewShippingMethod.current_subtotal <= 0 ||
    shippingTotal <= 0
  ) {
    return displayAmount
  }

  return (
    (displayAmount * previewShippingMethod.current_subtotal) / shippingTotal
  )
}

const buildManualDiscountAdjustments = ({
  item,
  itemDiscountRequested,
  orderDiscountRequested,
  requestedItemDiscount,
  requestedOrderDiscount,
  previewItem,
}: {
  item: ApplyCommercialValuesOrderItem
  itemDiscountRequested: boolean
  orderDiscountRequested: boolean
  requestedItemDiscount: CommercialValuesConfirmRequest["items"][number]["discount"]
  requestedOrderDiscount: CommercialValuesConfirmRequest["order_discount"]
  previewItem: CommercialValuesPreviewItem
}) => {
  const manualAdjustments: ReplacementAdjustment[] = []

  if (!itemDiscountRequested) {
    manualAdjustments.push(
      ...getExistingManualAdjustments(item, MANUAL_ITEM_DISCOUNT_CODE),
    )
  } else if (previewItem.manual_item_discount_amount > 0) {
    manualAdjustments.push({
      amount: previewItem.manual_item_discount_amount,
      code: MANUAL_ITEM_DISCOUNT_CODE,
      description: encodeCommercialDiscountDescription(
        "Manual item discount",
        requestedItemDiscount,
      ),
      is_tax_inclusive: previewItem.is_tax_inclusive || undefined,
      item_id: item.id,
    })
  }

  if (!orderDiscountRequested) {
    manualAdjustments.push(
      ...getExistingManualAdjustments(item, MANUAL_ORDER_DISCOUNT_CODE),
    )
  } else if (previewItem.manual_order_discount_amount > 0) {
    manualAdjustments.push({
      amount: previewItem.manual_order_discount_amount,
      code: MANUAL_ORDER_DISCOUNT_CODE,
      description: encodeCommercialDiscountDescription(
        "Allocated manual order discount",
        requestedOrderDiscount,
      ),
      is_tax_inclusive: previewItem.is_tax_inclusive || undefined,
      item_id: item.id,
    })
  }

  return manualAdjustments
}

const buildManualShippingDiscountAdjustments = ({
  orderDiscountRequested,
  previewShippingMethod,
  requestedOrderDiscount,
  requestedShippingDiscount,
  shippingDiscountRequested,
  shippingMethod,
}: {
  orderDiscountRequested: boolean
  previewShippingMethod: CommercialValuesPreviewShippingMethod
  requestedOrderDiscount: CommercialValuesConfirmRequest["order_discount"]
  requestedShippingDiscount: NonNullable<
    CommercialValuesConfirmRequest["shipping_methods"]
  >[number]["discount"]
  shippingDiscountRequested: boolean
  shippingMethod: ApplyCommercialValuesShippingMethod
}) => {
  const manualAdjustments: ReplacementAdjustment[] = []

  if (!shippingDiscountRequested) {
    manualAdjustments.push(
      ...getExistingManualAdjustments(
        shippingMethod,
        MANUAL_SHIPPING_DISCOUNT_CODE,
      ),
    )
  } else if (previewShippingMethod.manual_shipping_discount_amount > 0) {
    manualAdjustments.push({
      amount: toMedusaShippingAdjustmentAmount(
        previewShippingMethod,
        previewShippingMethod.manual_shipping_discount_amount,
      ),
      code: MANUAL_SHIPPING_DISCOUNT_CODE,
      description: encodeCommercialDiscountDescription(
        "Manual shipping discount",
        requestedShippingDiscount,
      ),
      shipping_method_id: shippingMethod.id,
    })
  }

  if (!orderDiscountRequested) {
    manualAdjustments.push(
      ...getExistingManualAdjustments(
        shippingMethod,
        MANUAL_ORDER_DISCOUNT_CODE,
      ),
    )
  } else if (previewShippingMethod.manual_order_discount_amount > 0) {
    manualAdjustments.push({
      amount: toMedusaShippingAdjustmentAmount(
        previewShippingMethod,
        previewShippingMethod.manual_order_discount_amount,
      ),
      code: MANUAL_ORDER_DISCOUNT_CODE,
      description: encodeCommercialDiscountDescription(
        "Allocated manual order discount",
        requestedOrderDiscount,
      ),
      shipping_method_id: shippingMethod.id,
    })
  }

  return manualAdjustments
}

const shouldReplaceManualDiscounts = ({
  item,
  itemDiscountRequested,
  orderDiscountRequested,
  previewItem,
}: {
  item: ApplyCommercialValuesOrderItem
  itemDiscountRequested: boolean
  orderDiscountRequested: boolean
  previewItem: CommercialValuesPreviewItem
}) => {
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

const shouldReplaceManualShippingDiscounts = ({
  orderDiscountRequested,
  previewShippingMethod,
  shippingDiscountRequested,
  shippingMethod,
}: {
  orderDiscountRequested: boolean
  previewShippingMethod: CommercialValuesPreviewShippingMethod
  shippingDiscountRequested: boolean
  shippingMethod: ApplyCommercialValuesShippingMethod
}) => {
  const shouldReplaceShippingDiscount =
    shippingDiscountRequested &&
    (hasExistingManualAdjustment(
      shippingMethod,
      MANUAL_SHIPPING_DISCOUNT_CODE,
    ) ||
      previewShippingMethod.manual_shipping_discount_amount > 0)
  const shouldReplaceOrderDiscount =
    orderDiscountRequested &&
    (hasExistingManualAdjustment(shippingMethod, MANUAL_ORDER_DISCOUNT_CODE) ||
      previewShippingMethod.manual_order_discount_amount > 0)

  return shouldReplaceShippingDiscount || shouldReplaceOrderDiscount
}

const buildItemUpdateInputs = (
  order: ApplyCommercialValuesOrder,
  request: CommercialValuesConfirmRequest,
) => {
  const itemActions = (order.items ?? []).flatMap((item) => {
    const requested = getRequestedItem(request, item.id)
    const currentUnitPrice = toFiniteNumber(item.unit_price)

    if (!requested || requested.unit_price === currentUnitPrice) {
      return []
    }

    return [
      {
        id: item.id,
        ...(hasText(request.internal_note)
          ? { internal_note: request.internal_note }
          : {}),
        quantity: toPositiveNumber(item.quantity),
        unit_price: requested.unit_price,
      },
    ]
  })

  return itemActions
}

const buildReplacementActions = ({
  activeOrderChange,
  order,
  preview,
  request,
}: {
  activeOrderChange: ActiveOrderChange
  order: ApplyCommercialValuesOrder
  preview: CommercialValuesPreview
  request: CommercialValuesConfirmRequest
}) => {
  const itemActions = (order.items ?? []).flatMap((item) => {
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
      requestedItemDiscount: requested?.discount,
      requestedOrderDiscount: request.order_discount,
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
        ...(hasText(request.internal_note)
          ? { internal_note: request.internal_note }
          : {}),
        order_change_id: activeOrderChange.id,
        order_id: order.id,
        version: activeOrderChange.version,
      },
    ]
  })

  const shippingActions = (order.shipping_methods ?? []).flatMap(
    (shippingMethod) => {
      const requested = getRequestedShippingMethod(request, shippingMethod.id)
      const previewShippingMethod = getPreviewShippingMethod(
        preview,
        shippingMethod.id,
      )

      if (!previewShippingMethod) {
        return []
      }

      const shippingDiscountRequested = hasRequestedShippingDiscount(requested)
      const orderDiscountRequested = request.order_discount !== undefined
      const preservedAdjustments = getPreservedAdjustments(shippingMethod)
      const manualAdjustments = buildManualShippingDiscountAdjustments({
        orderDiscountRequested,
        previewShippingMethod,
        requestedOrderDiscount: request.order_discount,
        requestedShippingDiscount: requested?.discount,
        shippingDiscountRequested,
        shippingMethod,
      })

      if (
        !shouldReplaceManualShippingDiscounts({
          orderDiscountRequested,
          previewShippingMethod,
          shippingDiscountRequested,
          shippingMethod,
        })
      ) {
        return []
      }

      return [
        {
          action: ChangeActionType.SHIPPING_ADJUSTMENTS_REPLACE,
          details: {
            adjustments: [...preservedAdjustments, ...manualAdjustments],
            manual_discounts: {
              order_discount_amount:
                previewShippingMethod.manual_order_discount_amount,
              shipping_discount_amount:
                previewShippingMethod.manual_shipping_discount_amount,
            },
            reference_id: shippingMethod.id,
          },
          ...(hasText(request.internal_note)
            ? { internal_note: request.internal_note }
            : {}),
          order_change_id: activeOrderChange.id,
          order_id: order.id,
          version: activeOrderChange.version,
        },
      ]
    },
  )

  return [...itemActions, ...shippingActions]
}

const fetchActiveOrderChange = async (query: Query, orderId: string) => {
  const { data }: { data: unknown } = await query.graph({
    entity: "order_change",
    fields: ["id", "version", "change_type", "status"],
    filters: {
      order_id: orderId,
      status: [OrderChangeStatus.PENDING, OrderChangeStatus.REQUESTED],
    },
    pagination: { take: 1 },
  })

  return toActiveOrderChangeRecord(getFirstQueryRow(data))
}

const fetchOrderVersion = async (query: Query, orderId: string) => {
  const { data }: { data: unknown } = await query.graph({
    entity: "order",
    fields: ["id", "version"],
    filters: { id: orderId },
  })

  const order = getFirstQueryRow(data)

  if (!isRecord(order)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Order ${orderId} was not found`,
    )
  }

  return toInteger(order["version"] ?? 0)
}

const assertOrderCanBeginCommercialEdit = async (
  query: Query,
  orderId: string,
  expectedOrderVersion: number,
) => {
  const activeOrderChange = await fetchActiveOrderChange(query, orderId)

  if (
    activeOrderChange &&
    !isReusableCommercialValuesOrderEdit(activeOrderChange)
  ) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Order already has active order change ${activeOrderChange.id}`,
    )
  }

  const orderVersion = await fetchOrderVersion(query, orderId)
  if (orderVersion !== expectedOrderVersion) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Expected order version ${expectedOrderVersion}, got ${orderVersion}`,
    )
  }

  return activeOrderChange ? toActiveOrderChange(activeOrderChange) : undefined
}

const cancelStartedEdit = async (
  container: MedusaContainer,
  logger: Logger,
  orderId: string,
) => {
  try {
    await cancelBeginOrderEditWorkflow(container).run({
      input: { order_id: orderId },
    })
  } catch (error) {
    logger.error(
      `Failed to cancel commercial values order edit for ${orderId}`,
      error instanceof Error ? error : new Error(String(error)),
    )
  }
}

const previewCommercialValuesStep = createStep(
  "preview-commercial-values",
  (calculationInput: CommercialValuesCalculationInput) =>
    new StepResponse(calculateCommercialValuesPreview(calculationInput)),
)

const assertCommercialValuesOrderEditCanBeginStep = createStep(
  "assert-commercial-values-order-edit-can-begin",
  async (
    input: {
      expected_order_version: number
      order_id: string
    },
    { container },
  ) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const activeOrderChange = await assertOrderCanBeginCommercialEdit(
      query,
      input.order_id,
      input.expected_order_version,
    )

    return new StepResponse({
      active_order_change: activeOrderChange,
      order_id: input.order_id,
    })
  },
)

const beginCommercialValuesOrderEditStep = createStep(
  "begin-commercial-values-order-edit",
  async (
    input: {
      actor_id?: string | undefined
      internal_note?: string | undefined
      readiness: CommercialValuesOrderEditReadiness
    },
    { container },
  ) => {
    if (input.readiness.active_order_change) {
      return new StepResponse(input.readiness.active_order_change, {
        order_id: input.readiness.order_id,
        started_order_edit: false,
      })
    }

    const { result: orderChange } = await beginOrderEditOrderWorkflow(
      container,
    ).run({
      input: {
        ...(hasText(input.actor_id) ? { created_by: input.actor_id } : {}),
        ...(hasText(input.internal_note)
          ? { internal_note: input.internal_note }
          : {}),
        order_id: input.readiness.order_id,
      },
    })
    const activeOrderChange = toActiveOrderChange(orderChange)

    return new StepResponse(activeOrderChange, {
      order_id: input.readiness.order_id,
      started_order_edit: true,
    })
  },
  async (input, { container }) => {
    if (input?.started_order_edit !== true) {
      return
    }

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    await cancelStartedEdit(container, logger, input.order_id)
  },
)

const updateCommercialValuesItemsStep = createStep(
  "update-commercial-values-items",
  async (
    input: {
      active_order_change: ActiveOrderChange
      order: ApplyCommercialValuesOrder
      request: CommercialValuesConfirmRequest
    },
    { container },
  ) => {
    const itemUpdates = buildItemUpdateInputs(input.order, input.request)

    if (itemUpdates.length > 0) {
      await orderEditUpdateItemQuantityWorkflow(container).run({
        input: {
          items: itemUpdates,
          order_id: input.order.id,
        },
      })
    }

    return new StepResponse({
      order_change_id: input.active_order_change.id,
    })
  },
)

const replaceCommercialValuesAdjustmentsStep = createStep(
  "replace-commercial-values-adjustments",
  async (
    input: {
      active_order_change: ActiveOrderChange
      item_update: CommercialValuesOrderEditDependency
      order: ApplyCommercialValuesOrder
      preview: CommercialValuesPreview
      request: CommercialValuesConfirmRequest
    },
    { container },
  ) => {
    if (input.item_update.order_change_id !== input.active_order_change.id) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "Commercial values item updates used a stale order change",
      )
    }

    const replacementActions = buildReplacementActions({
      activeOrderChange: input.active_order_change,
      order: input.order,
      preview: input.preview,
      request: input.request,
    })

    if (replacementActions.length > 0) {
      await createOrderChangeActionsWorkflow(container).run({
        input: replacementActions,
      })
    }

    return new StepResponse({
      order_change_id: input.active_order_change.id,
    })
  },
)

const completeCommercialValuesOrderEditStep = createStep(
  "complete-commercial-values-order-edit",
  async (
    input: {
      actor_id?: string | undefined
      active_order_change: ActiveOrderChange
      confirmation_mode: "confirm" | "request"
      order_id: string
      replacements: CommercialValuesOrderEditDependency
    },
    { container },
  ): Promise<StepResponse<CommercialValuesOrderEditCompletion>> => {
    if (input.replacements.order_change_id !== input.active_order_change.id) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "Commercial values replacements used a stale order change",
      )
    }

    if (input.confirmation_mode === "request") {
      const { result: requestResult } = await requestOrderEditRequestWorkflow(
        container,
      ).run({
        input: {
          order_id: input.order_id,
          ...(hasText(input.actor_id) ? { requested_by: input.actor_id } : {}),
        },
      })

      const result: CommercialValuesOrderEditCompletion = {
        mode: "requested" as const,
        order_preview: requestResult,
      }

      return new StepResponse(result)
    }

    const { result: confirmResult } = await confirmOrderEditRequestWorkflow(
      container,
    ).run({
      input: {
        ...(hasText(input.actor_id) ? { confirmed_by: input.actor_id } : {}),
        order_id: input.order_id,
      },
    })

    const result: CommercialValuesOrderEditCompletion = {
      mode: "confirmed" as const,
      order_preview: confirmResult,
    }

    return new StepResponse(result)
  },
)

export const applyOrderCommercialValuesWorkflow = createWorkflow(
  "apply-order-commercial-values",
  (workflowInput: ApplyCommercialValuesWorkflowInput) => {
    const preview = previewCommercialValuesStep(workflowInput.calculation_input)
    const readiness = assertCommercialValuesOrderEditCanBeginStep({
      expected_order_version: workflowInput.request.expected_order_version,
      order_id: workflowInput.order.id,
    })
    const activeOrderChange = beginCommercialValuesOrderEditStep({
      actor_id: workflowInput.actor_id,
      internal_note: workflowInput.request.internal_note,
      readiness,
    })
    const itemUpdate = updateCommercialValuesItemsStep({
      active_order_change: activeOrderChange,
      order: workflowInput.order,
      request: workflowInput.request,
    })
    const replacements = replaceCommercialValuesAdjustmentsStep({
      active_order_change: activeOrderChange,
      item_update: itemUpdate,
      order: workflowInput.order,
      preview,
      request: workflowInput.request,
    })
    const completion = completeCommercialValuesOrderEditStep(
      transform(
        { activeOrderChange, replacements, workflowInput },
        ({
          activeOrderChange: currentOrderChange,
          replacements: currentReplacements,
          workflowInput: currentWorkflowInput,
        }) => ({
          active_order_change: currentOrderChange,
          actor_id: currentWorkflowInput.actor_id,
          confirmation_mode:
            currentWorkflowInput.request.confirmation_mode ?? "confirm",
          order_id: currentWorkflowInput.order.id,
          replacements: currentReplacements,
        }),
      ),
    )

    return new WorkflowResponse({
      mode: completion.mode,
      order_change_id: activeOrderChange.id,
      order_preview: completion.order_preview,
      preview,
    })
  },
)

export const applyOrderCommercialValues = async ({
  actor_id,
  calculation_input,
  container,
  order,
  request,
}: ApplyCommercialValuesInput): Promise<CommercialValuesConfirmResponse> => {
  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  return await lockingModule.execute(
    getCommercialValuesLockKey(order.id),
    async () => {
      const { result } = await applyOrderCommercialValuesWorkflow(
        container,
      ).run({
        input: {
          actor_id,
          calculation_input,
          order,
          request,
        },
      })

      return result
    },
    { timeout: COMMERCIAL_VALUES_LOCK_TIMEOUT_SECONDS },
  )
}
