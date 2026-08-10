import type {
  IOrderModuleService,
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
} from "../../utils/order-business-status"

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
    const orders = await orderService.listOrders(
      { id: orderIds },
      { select: ["id", "metadata"], take: orderIds.length }
    )
    const ordersById = new Map(orders.map((order) => [order.id, order]))
    const missingOrderIds = orderIds.filter((id) => !ordersById.has(id))

    if (missingOrderIds.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Orders were not found: ${missingOrderIds.join(", ")}`
      )
    }

    const changedOrders = orders.filter(
      (order) =>
        (getManualOrderBusinessStatusId(order) ?? null) !== input.status
    )
    const updates = changedOrders.map((order) => ({
      id: order.id,
      metadata: buildOrderBusinessStatusMetadata(order.metadata, input.status),
    }))
    const previousValues = changedOrders.map((order) => ({
      id: order.id,
      metadata: order.metadata,
    }))

    if (updates.length) {
      await orderService.updateOrders(updates)
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

    await orderService.updateOrders(previousValues)
  }
)

export const updateOrderBusinessStatusesWorkflow = createWorkflow(
  "update-order-business-statuses",
  (input: UpdateOrderBusinessStatusesInput) =>
    new WorkflowResponse(updateOrderBusinessStatusesStep(input))
)
