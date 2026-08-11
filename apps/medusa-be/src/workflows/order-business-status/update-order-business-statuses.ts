import type {
  IOrderModuleService,
  OrderDTO,
  UpdateOrderDTO,
} from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  buildOrderBusinessStatusMetadata,
  getManualOrderBusinessStatusId,
  type ManualOrderBusinessStatusId,
  ORDER_BUSINESS_STATUS_METADATA_KEY,
} from "../../utils/order-business-status"

const ORDER_BUSINESS_STATUS_BATCH_SIZE = 100

export type UpdateOrderBusinessStatusesInput = {
  order_ids: string[]
  status: ManualOrderBusinessStatusId | null
}

export type UpdateOrderBusinessStatusesResult = {
  changed_count: number
  order_ids: string[]
  processed_count: number
  requested_count: number
  status: ManualOrderBusinessStatusId | null
  unchanged_count: number
}

type UpdateOrderBusinessStatusesCompensationInput = UpdateOrderDTO[]

function chunkValues<T>(values: T[]) {
  const chunks: T[][] = []

  for (
    let index = 0;
    index < values.length;
    index += ORDER_BUSINESS_STATUS_BATCH_SIZE
  ) {
    chunks.push(values.slice(index, index + ORDER_BUSINESS_STATUS_BATCH_SIZE))
  }

  return chunks
}

async function updateOrdersInBatches(
  orderService: IOrderModuleService,
  updates: UpdateOrderDTO[]
) {
  for (const updateBatch of chunkValues(updates)) {
    await orderService.updateOrders(updateBatch)
  }
}

async function updateOrdersWithRollback(
  orderService: IOrderModuleService,
  updates: UpdateOrderDTO[],
  previousValues: UpdateOrderDTO[]
) {
  let updatedOrderCount = 0

  try {
    for (const updateBatch of chunkValues(updates)) {
      await orderService.updateOrders(updateBatch)
      updatedOrderCount += updateBatch.length
    }
  } catch (updateError) {
    try {
      await updateOrdersInBatches(
        orderService,
        previousValues.slice(0, updatedOrderCount)
      )
    } catch (rollbackError) {
      throw new AggregateError(
        [updateError, rollbackError],
        "Order business status update and rollback both failed"
      )
    }

    throw updateError
  }
}

function buildCompensationUpdate(
  order: Pick<UpdateOrderDTO, "id" | "metadata">
): UpdateOrderDTO {
  const metadata = order.metadata ?? {}
  // Medusa merges metadata patches and treats an empty string as key removal.
  const previousManualStatus = Object.hasOwn(
    metadata,
    ORDER_BUSINESS_STATUS_METADATA_KEY
  )
    ? metadata[ORDER_BUSINESS_STATUS_METADATA_KEY]
    : ""

  return {
    id: order.id,
    metadata: {
      [ORDER_BUSINESS_STATUS_METADATA_KEY]: previousManualStatus,
    },
  }
}

export const updateOrderBusinessStatusesStep = createStep(
  "update-order-business-statuses",
  async (input: UpdateOrderBusinessStatusesInput, { container }) => {
    const orderIds = [...new Set(input.order_ids)]

    if (!orderIds.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one order id is required"
      )
    }

    const orderService = container.resolve<IOrderModuleService>(Modules.ORDER)
    const ordersById = new Map<string, OrderDTO>()

    for (const orderIdBatch of chunkValues(orderIds)) {
      const orders = await orderService.listOrders(
        { id: orderIdBatch },
        { select: ["id", "metadata"], take: orderIdBatch.length }
      )

      for (const order of orders) {
        ordersById.set(order.id, order)
      }
    }

    const missingOrderIds = orderIds.filter((id) => !ordersById.has(id))

    if (missingOrderIds.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Orders were not found: ${missingOrderIds.join(", ")}`
      )
    }

    const selectedOrders = orderIds
      .map((id) => ordersById.get(id))
      .filter((order): order is OrderDTO => order !== undefined)
    const changedOrders = selectedOrders.filter(
      (order) =>
        (getManualOrderBusinessStatusId(order) ?? null) !== input.status
    )
    const updates = changedOrders.map((order) => ({
      id: order.id,
      metadata: buildOrderBusinessStatusMetadata(order.metadata, input.status),
    }))
    const previousValues = changedOrders.map(buildCompensationUpdate)

    if (updates.length) {
      await updateOrdersWithRollback(orderService, updates, previousValues)
    }

    const result: UpdateOrderBusinessStatusesResult = {
      changed_count: updates.length,
      order_ids: orderIds,
      processed_count: orderIds.length,
      requested_count: input.order_ids.length,
      status: input.status,
      unchanged_count: orderIds.length - updates.length,
    }

    return new StepResponse<
      UpdateOrderBusinessStatusesResult,
      UpdateOrderBusinessStatusesCompensationInput
    >(result, previousValues)
  },
  async (previousValues, { container }) => {
    if (!previousValues?.length) {
      return
    }

    const orderService = container.resolve<IOrderModuleService>(Modules.ORDER)

    await updateOrdersInBatches(orderService, previousValues)
  }
)

function composeUpdateOrderBusinessStatusesWorkflow(
  input: UpdateOrderBusinessStatusesInput
) {
  return new WorkflowResponse(updateOrderBusinessStatusesStep(input))
}

export const updateOrderBusinessStatusesWorkflow = createWorkflow(
  "update-order-business-statuses",
  composeUpdateOrderBusinessStatusesWorkflow
)
