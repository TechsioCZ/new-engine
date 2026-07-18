import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/utils"

import { APPROVAL_MODULE } from "../../../modules/approval"
import {
  ApprovalStatusType,
  type IApprovalModuleService,
  type ModuleApproval,
  type ModuleApprovalStatus,
} from "../../../types"

function toApprovalStatusSnapshot(value: unknown): ModuleApprovalStatus {
  if (typeof value !== "object" || value === null) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Approval status snapshot is invalid"
    )
  }

  const id = Reflect.get(value, "id")
  const cartId = Reflect.get(value, "cart_id")
  const status = Reflect.get(value, "status")
  if (
    typeof id !== "string" ||
    typeof cartId !== "string" ||
    !(
      status === ApprovalStatusType.PENDING ||
      status === ApprovalStatusType.APPROVED ||
      status === ApprovalStatusType.REJECTED
    )
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Approval status snapshot is missing required fields"
    )
  }

  return { cart_id: cartId, id, status }
}

export const updateApprovalStatusStep = createStep(
  "update-approval-status",
  async (
    input: ModuleApproval,
    { container }
  ): Promise<StepResponse<undefined, ModuleApprovalStatus>> => {
    const query = container.resolve("query")
    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const {
      data: [approvalStatus],
    } = await query.graph({
      entity: "approval_status",
      fields: ["*", "status"],
      filters: {
        cart_id: input.cart_id,
      },
      pagination: {
        skip: 0,
        take: 1,
      },
    })

    if (!approvalStatus) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Approval status for cart ${input.cart_id} was not found`
      )
    }

    const previousData = toApprovalStatusSnapshot(approvalStatus)

    const hasPendingApprovals = await approvalModule.hasPendingApprovals(
      input.cart_id
    )

    if (input.status === ApprovalStatusType.APPROVED && !hasPendingApprovals) {
      await approvalModule.updateApprovalStatuses([
        {
          id: approvalStatus.id,
          status: ApprovalStatusType.APPROVED,
        },
      ])
    }

    if (input.status === ApprovalStatusType.REJECTED) {
      await approvalModule.updateApprovalStatuses([
        {
          id: approvalStatus.id,
          status: ApprovalStatusType.REJECTED,
        },
      ])
    }

    return new StepResponse(undefined, previousData)
  },
  async (previousData: ModuleApprovalStatus | undefined, { container }) => {
    if (!previousData) {
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
  }
)
