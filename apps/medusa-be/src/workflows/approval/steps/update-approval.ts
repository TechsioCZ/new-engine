import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/utils"

import { APPROVAL_MODULE } from "../../../modules/approval"
import {
  ApprovalStatusType,
  type IApprovalModuleService,
  type ModuleApproval,
  type ModuleUpdateApproval,
} from "../../../types"

function parseApprovalStatus(value: unknown): ApprovalStatusType {
  if (
    value === ApprovalStatusType.PENDING ||
    value === ApprovalStatusType.APPROVED ||
    value === ApprovalStatusType.REJECTED
  ) {
    return value
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "Approval has an invalid status"
  )
}

export const updateApprovalStep = createStep(
  "update-approval",
  async (
    input: ModuleUpdateApproval,
    { container }
  ): Promise<StepResponse<ModuleApproval, ModuleUpdateApproval>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const {
      data: [approval],
    } = await query.graph({
      entity: "approval",
      fields: ["*"],
      filters: {
        id: input.id,
      },
    })

    if (!approval) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Approval ${input.id} was not found`
      )
    }

    if (input.status === ApprovalStatusType.REJECTED) {
      const { data: approvalsToReject } = await query.graph({
        entity: "approval",
        fields: ["*"],
        filters: {
          cart_id: approval.cart_id,
          id: {
            $ne: approval.id,
          },
        },
      })

      const updateData = approvalsToReject.map((approvalToReject) => ({
        id: approvalToReject.id,
        status: ApprovalStatusType.REJECTED,
        handled_by: input.handled_by,
      }))

      await approvalModule.updateApprovals(updateData)
    }

    const previousData: ModuleUpdateApproval = {
      handled_by: approval.handled_by,
      id: approval.id,
      status: parseApprovalStatus(approval.status),
    }

    const [updatedApproval] = await approvalModule.updateApprovals([input])

    return new StepResponse(updatedApproval, previousData)
  },
  async (previousData: ModuleUpdateApproval | undefined, { container }) => {
    if (!previousData) {
      return
    }

    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const updateData = Array.isArray(previousData)
      ? previousData
      : [previousData]

    await approvalModule.updateApprovals(updateData)
  }
)
