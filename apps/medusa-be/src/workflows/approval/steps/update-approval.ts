import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { APPROVAL_MODULE } from "../../../modules/approval"
import { ApprovalStatusType } from "../../../types/approval/module"
import type {
  ModuleApproval,
  ModuleUpdateApproval,
} from "../../../types/approval/module"
import type { IApprovalModuleService } from "../../../types/approval/service"

const parseApprovalId = (value: unknown): string => {
  if (typeof value === "string" && value !== "") {
    return value
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "Approval has an invalid id",
  )
}

const parseApprovalStatus = (value: unknown): ApprovalStatusType => {
  if (
    value === ApprovalStatusType.PENDING ||
    value === ApprovalStatusType.APPROVED ||
    value === ApprovalStatusType.REJECTED
  ) {
    return value
  }
  throw new MedusaError(
    MedusaError.Types.UNEXPECTED_STATE,
    "Approval has an invalid status",
  )
}

export const updateApprovalStep = createStep(
  "update-approval",
  async (
    input: ModuleUpdateApproval,
    { container },
  ): Promise<StepResponse<ModuleApproval, ModuleUpdateApproval>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const approvalQueryResult: { data: ModuleApproval[] } = await query.graph({
      entity: "approval",
      fields: ["*"],
      filters: {
        id: input.id,
      },
    })
    const [approval] = approvalQueryResult.data

    if (approval === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Approval ${input.id} was not found`,
      )
    }

    if (input.status === ApprovalStatusType.REJECTED) {
      const approvalsQueryResult: { data: ModuleApproval[] } =
        await query.graph({
          entity: "approval",
          fields: ["*"],
          filters: {
            cart_id: approval.cart_id,
            id: {
              $ne: approval.id,
            },
          },
        })
      const { data: approvalsToReject } = approvalsQueryResult

      const updateData = approvalsToReject.map((approvalToReject) => ({
        handled_by: input.handled_by,
        id: parseApprovalId(approvalToReject.id),
        status: ApprovalStatusType.REJECTED,
      }))

      await approvalModule.updateApprovals(updateData)
    }

    const previousData: ModuleUpdateApproval = {
      handled_by: approval.handled_by,
      id: parseApprovalId(approval.id),
      status: parseApprovalStatus(approval.status),
    }

    const [updatedApproval] = await approvalModule.updateApprovals([input])

    return new StepResponse(updatedApproval, previousData)
  },
  async (previousData: ModuleUpdateApproval | undefined, { container }) => {
    if (previousData === undefined) {
      return
    }

    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const updateData = Array.isArray(previousData)
      ? previousData
      : [previousData]

    await approvalModule.updateApprovals(updateData)
  },
)
