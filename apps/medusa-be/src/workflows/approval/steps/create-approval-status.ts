/* istanbul ignore file */
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { APPROVAL_MODULE } from "../../../modules/approval"
import { ApprovalStatusType, type IApprovalModuleService } from "../../../types"

export const createApprovalStatusStep = createStep(
  "create-approval-status",
  async (cartIds: string[], { container }) => {
    if (!cartIds.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one cart id is required"
      )
    }

    const query = container.resolve<RemoteQueryFunction>(
      ContainerRegistrationKeys.QUERY
    )
    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const {
      data: [existingApprovalStatus],
    } = await query.graph({
      entity: "approval_status",
      fields: ["*"],
      filters: {
        cart_id: cartIds[0],
      },
    })

    if (existingApprovalStatus) {
      const [approvalStatus] =
        await approvalModuleService.updateApprovalStatuses([
          {
            id: existingApprovalStatus.id,
            status: ApprovalStatusType.PENDING,
          },
        ])

      if (!approvalStatus) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Failed to update approval status"
        )
      }

      return new StepResponse(approvalStatus, [approvalStatus.id])
    }

    const approvalStatusesToCreate = cartIds.map((cartId) => ({
      cart_id: cartId,
      status: ApprovalStatusType.PENDING,
    }))

    const [approvalStatus] = await approvalModuleService.createApprovalStatuses(
      approvalStatusesToCreate
    )

    if (!approvalStatus) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Failed to create approval status"
      )
    }

    return new StepResponse(approvalStatus, [approvalStatus.id])
  },
  async (statusIds, { container }) => {
    if (!statusIds) {
      return
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    await approvalModuleService.deleteApprovalStatuses(statusIds)
  }
)
