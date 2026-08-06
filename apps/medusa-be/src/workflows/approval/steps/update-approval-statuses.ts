import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { isRecord } from "@techsio/std/object"

import { APPROVAL_MODULE } from "../../../modules/approval"
import { ApprovalStatusType } from "../../../types/approval/module"
import type {
  ModuleApproval,
  ModuleApprovalStatus,
} from "../../../types/approval/module"
import type { IApprovalModuleService } from "../../../types/approval/service"

const APPROVAL_STATUSES = new Set<unknown>([
  ApprovalStatusType.PENDING,
  ApprovalStatusType.APPROVED,
  ApprovalStatusType.REJECTED,
])

const toApprovalStatusSnapshot = (value: unknown): ModuleApprovalStatus => {
  if (!isRecord(value)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Approval status snapshot is invalid",
    )
  }

  const { cart_id: cartId, id, status } = value
  if (
    typeof id !== "string" ||
    typeof cartId !== "string" ||
    !APPROVAL_STATUSES.has(status)
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Approval status snapshot is missing required fields",
    )
  }

  let validatedStatus: ModuleApprovalStatus["status"] =
    ApprovalStatusType.PENDING
  if (status === ApprovalStatusType.APPROVED) {
    validatedStatus = ApprovalStatusType.APPROVED
  } else if (status === ApprovalStatusType.REJECTED) {
    validatedStatus = ApprovalStatusType.REJECTED
  }

  return { cart_id: cartId, id, status: validatedStatus }
}

export const updateApprovalStatusStep = createStep(
  "update-approval-status",
  async (
    input: ModuleApproval,
    { container },
  ): Promise<StepResponse<undefined, ModuleApprovalStatus>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const graphResult: unknown = await query.graph({
      entity: "approval_status",
      fields: ["*"],
      filters: {
        cart_id: input.cart_id,
      },
      pagination: {
        skip: 0,
        take: 1,
      },
    })
    const graphData: unknown = isRecord(graphResult)
      ? graphResult["data"]
      : undefined
    const approvalStatuses: unknown[] = Array.isArray(graphData)
      ? graphData
      : []
    const [approvalStatus] = approvalStatuses

    if (approvalStatus === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Approval status for cart ${input.cart_id} was not found`,
      )
    }

    const previousData = toApprovalStatusSnapshot(approvalStatus)

    const hasPendingApprovals = await approvalModule.hasPendingApprovals(
      input.cart_id,
    )

    if (input.status === ApprovalStatusType.APPROVED && !hasPendingApprovals) {
      await approvalModule.updateApprovalStatuses([
        {
          id: previousData.id,
          status: ApprovalStatusType.APPROVED,
        },
      ])
    }

    if (input.status === ApprovalStatusType.REJECTED) {
      await approvalModule.updateApprovalStatuses([
        {
          id: previousData.id,
          status: ApprovalStatusType.REJECTED,
        },
      ])
    }

    return new StepResponse(undefined, previousData)
  },
  async (previousData: ModuleApprovalStatus | undefined, { container }) => {
    if (previousData === undefined) {
      return
    }

    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    await approvalModule.updateApprovalStatuses([
      {
        id: previousData.id,
        status: previousData.status,
      },
    ])
  },
)
