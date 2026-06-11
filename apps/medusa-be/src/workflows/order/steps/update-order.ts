import type {
  IOrderModuleService,
  UpdateOrderDTO,
} from "@medusajs/framework/types"
import {
  convertItemResponseToUpdateRequest,
  getSelectsAndRelationsFromObjectArray,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type UpdateOrderStepInput = Required<
  Pick<UpdateOrderDTO, "id" | "is_draft_order" | "status">
>

/*
  A step to update the order. This is being used in the update order workflow.
  The first function attempts to update the order, while the second function attempts to revert
  the update incase the workflow fails. The first function is also preparing the data to be reverted
  when a failure is triggered.
*/
export const updateOrderStep = createStep(
  "update-order",
  async (data: UpdateOrderStepInput, { container }) => {
    const { id, ...rest } = data
    const orderModule: IOrderModuleService = container.resolve(Modules.ORDER)
    const update: UpdateOrderDTO = rest

    const { selects, relations } = getSelectsAndRelationsFromObjectArray([data])

    const dataBeforeUpdate = await orderModule.listOrders(
      { id: data.id },
      { relations, select: selects }
    )

    const updatedQuotes = await orderModule.updateOrders(id, update)

    return new StepResponse(updatedQuotes, {
      dataBeforeUpdate,
      selects,
      relations,
    })
  },
  async (revertInput, { container }) => {
    if (!revertInput) {
      return
    }

    const { dataBeforeUpdate, selects, relations } = revertInput
    const orderModule: IOrderModuleService = container.resolve(Modules.ORDER)

    await orderModule.updateOrders(
      dataBeforeUpdate.map((data) =>
        convertItemResponseToUpdateRequest(data, selects, relations)
      )
    )
  }
)
