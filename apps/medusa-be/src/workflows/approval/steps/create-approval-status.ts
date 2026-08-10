import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { APPROVAL_MODULE } from "../../../modules/approval"
import { ApprovalStatusType } from "../../../types/approval/module"
import type { ModuleApprovalStatus } from "../../../types/approval/module"
import type { IApprovalModuleService } from "../../../types/approval/service"

export const createApprovalStatusStep = createStep<
  string[],
  ModuleApprovalStatus,
  string[]
>(
  "create-approval-status",
  async (
    cartIds: string[],
    { container },
  ): Promise<StepResponse<ModuleApprovalStatus, string[]>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const [firstCartId] = cartIds

    if (firstCartId === undefined || firstCartId.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one cart id is required to create an approval status",
      )
    }

    const graphResult: { data: ModuleApprovalStatus[] } = await query.graph({
      entity: "approval_status",
      fields: ["*"],
      filters: {
        cart_id: firstCartId,
      },
    })

    const [existingApprovalStatus] = graphResult.data
    if (existingApprovalStatus !== undefined) {
      const [updatedApprovalStatus] =
        await approvalModuleService.updateApprovalStatuses([
          {
            id: existingApprovalStatus.id,
            status: ApprovalStatusType.PENDING,
          },
        ])

      if (updatedApprovalStatus === undefined) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Failed to update approval status",
        )
      }

      return new StepResponse(updatedApprovalStatus, [updatedApprovalStatus.id])
    }

    const approvalStatusesToCreate = cartIds.map((cartId) => ({
      cart_id: cartId,
      status: ApprovalStatusType.PENDING,
    }))

    const [createdApprovalStatus] =
      await approvalModuleService.createApprovalStatuses(
        approvalStatusesToCreate,
      )

    if (createdApprovalStatus === undefined) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Failed to create approval status",
      )
    }

    return new StepResponse(createdApprovalStatus, [createdApprovalStatus.id])
  },
  async (statusIds: string[] | undefined, { container }) => {
    if (statusIds === undefined) {
      return
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    await approvalModuleService.deleteApprovalStatuses(statusIds)
  },
)
