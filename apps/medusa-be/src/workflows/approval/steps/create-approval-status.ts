import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { APPROVAL_MODULE } from "../../../modules/approval"
import { ApprovalStatusType, type IApprovalModuleService } from "../../../types"

export const createApprovalStatusStep = createStep(
  "create-approval-status",
  async (cartIds: string[], { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const [firstCartId] = cartIds

    if (!firstCartId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one cart id is required to create an approval status"
      )
    }

    const {
      data: [existingApprovalStatus],
    } = await query.graph({
      entity: "approval_status",
      fields: ["*"],
      filters: {
        cart_id: firstCartId,
      },
    })

    if (existingApprovalStatus) {
      const [updatedApprovalStatus] =
        await approvalModuleService.updateApprovalStatuses([
          {
            id: existingApprovalStatus.id,
            status: ApprovalStatusType.PENDING,
          },
        ])

      if (!updatedApprovalStatus) {
        throw new Error("Failed to update approval status")
      }

      return new StepResponse(updatedApprovalStatus, [updatedApprovalStatus.id])
    }

    const approvalStatusesToCreate = cartIds.map((cartId) => ({
      cart_id: cartId,
      status: ApprovalStatusType.PENDING,
    }))

    const [createdApprovalStatus] =
      await approvalModuleService.createApprovalStatuses(
        approvalStatusesToCreate
      )

    if (!createdApprovalStatus) {
      throw new Error("Failed to create approval status")
    }

    return new StepResponse(createdApprovalStatus, [createdApprovalStatus.id])
  },
  async (statusIds: string[] | undefined, { container }) => {
    if (!statusIds) {
      return
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    await approvalModuleService.deleteApprovalStatuses(statusIds)
  }
)
