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

type ApplyCommercialValuesWorkflowInput = Omit<
  ApplyCommercialValuesInput,
  "container"
>

type CommercialValuesOrderEditDependency = {
  order_change_id: string
}

type CommercialValuesOrderEditReadiness = {
  order_id: string
}

type CommercialValuesOrderEditCompletion = Pick<
  CommercialValuesConfirmResponse,
  "mode" | "order_preview"
>

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

const previewCommercialValuesStep = createStep(
  "preview-order-commercial-values",
  async (calculationInput: CommercialValuesCalculationInput) =>
    new StepResponse(calculateCommercialValuesPreview(calculationInput))
)

const assertCommercialValuesOrderEditCanBeginStep = createStep(
  "assert-commercial-values-order-edit-can-begin",
  async (
    input: {
      expected_order_version: number
      order_id: string
    },
    { container }
  ) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    await assertOrderCanBeginCommercialEdit(
      query,
      input.order_id,
      input.expected_order_version
    )

    return new StepResponse({
      order_id: input.order_id,
    })
  }
)

const beginCommercialValuesOrderEditStep = createStep(
  "begin-commercial-values-order-edit",
  async (
    input: {
      actor_id?: string
      internal_note?: string
      readiness: CommercialValuesOrderEditReadiness
    },
    { container }
  ) => {
    const { result: orderChange } = await beginOrderEditOrderWorkflow(
      container
    ).run({
      input: {
        created_by: input.actor_id,
        internal_note: input.internal_note,
        order_id: input.readiness.order_id,
      },
    })
    const activeOrderChange = toActiveOrderChange(orderChange)

    return new StepResponse(activeOrderChange, {
      order_id: input.readiness.order_id,
    })
  },
  async (input, { container }) => {
    if (!input) {
      return
    }

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    await cancelStartedEdit(container, logger, input.order_id)
  }
)

const updateCommercialValuesItemsStep = createStep(
  "update-commercial-values-items",
  async (
    input: {
      active_order_change: ActiveOrderChange
      order: ApplyCommercialValuesOrder
      request: CommercialValuesConfirmRequest
    },
    { container }
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
  }
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
    { container }
  ) => {
    if (input.item_update.order_change_id !== input.active_order_change.id) {
      throw new Error(
        "Commercial values item updates used a stale order change"
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
  }
)

const completeCommercialValuesOrderEditStep = createStep(
  "complete-commercial-values-order-edit",
  async (
    input: {
      actor_id?: string
      active_order_change: ActiveOrderChange
      confirmation_mode: "confirm" | "request"
      order_id: string
      replacements: CommercialValuesOrderEditDependency
    },
    { container }
  ): Promise<StepResponse<CommercialValuesOrderEditCompletion>> => {
    if (input.replacements.order_change_id !== input.active_order_change.id) {
      throw new Error(
        "Commercial values replacements used a stale order change"
      )
    }

    if (input.confirmation_mode === "request") {
      const { result: requestResult } = await requestOrderEditRequestWorkflow(
        container
      ).run({
        input: {
          order_id: input.order_id,
          requested_by: input.actor_id,
        },
      })

      const result: CommercialValuesOrderEditCompletion = {
        mode: "requested" as const,
        order_preview: requestResult,
      }

      return new StepResponse(result)
    }

    const { result: confirmResult } = await confirmOrderEditRequestWorkflow(
      container
    ).run({
      input: {
        confirmed_by: input.actor_id,
        order_id: input.order_id,
      },
    })

    const result: CommercialValuesOrderEditCompletion = {
      mode: "confirmed" as const,
      order_preview: confirmResult,
    }

    return new StepResponse(result)
  }
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
          actor_id: currentWorkflowInput.actor_id,
          active_order_change: currentOrderChange,
          confirmation_mode:
            currentWorkflowInput.request.confirmation_mode ?? "confirm",
          order_id: currentWorkflowInput.order.id,
          replacements: currentReplacements,
        })
      )
    )

    return new WorkflowResponse({
      mode: completion.mode,
      order_change_id: activeOrderChange.id,
      order_preview: completion.order_preview,
      preview,
    })
  }
)

export async function applyOrderCommercialValues({
  actor_id,
  calculation_input,
  container,
  order,
  request,
}: ApplyCommercialValuesInput): Promise<CommercialValuesConfirmResponse> {
  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  return lockingModule.execute(
    getCommercialValuesLockKey(order.id),
    async () => {
      const { result } = await applyOrderCommercialValuesWorkflow(
        container
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
    { timeout: COMMERCIAL_VALUES_LOCK_TIMEOUT_SECONDS }
  )
}
