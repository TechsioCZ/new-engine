import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { APPROVAL_MODULE } from "../../../modules/approval"
import {
  ApprovalStatusType,
  ApprovalType,
} from "../../../types/approval/module"
import type { ModuleCreateApproval } from "../../../types/approval/module"
import type { QueryCartApproval } from "../../../types/approval/query"
import type { IApprovalModuleService } from "../../../types/approval/service"

export const createApprovalStep = createStep(
  "create-approval",
  async (
    input:
      | Omit<ModuleCreateApproval, "type">
      | Omit<ModuleCreateApproval, "type">[],
    { container },
  ) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const approvalData = Array.isArray(input) ? input : [input]
    const [firstApproval] = approvalData
    if (firstApproval === undefined) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No approval data provided",
      )
    }

    const graphResult: { data: QueryCartApproval[] } = await query.graph(
      {
        entity: "cart",
        fields: [
          "id",
          "approvals.*",
          "approval_status.*",
          "company.id",
          "company.approval_settings.*",
        ],
        filters: {
          id: firstApproval.cart_id,
        },
      },
      {
        throwIfKeyNotFound: true,
      },
    )
    const [cart] = graphResult.data
    if (cart === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart ${firstApproval.cart_id} was not found`,
      )
    }
    const cartApprovalStatus = cart.approval_status?.status

    if (cartApprovalStatus === ApprovalStatusType.PENDING) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Cart already has a pending approval",
      )
    }
    if (cartApprovalStatus === ApprovalStatusType.APPROVED) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Cart is already approved",
      )
    }

    const settings = cart.company?.approval_settings
    const approvalsToCreate: ModuleCreateApproval[] = []
    if (settings?.requires_admin_approval === true) {
      approvalsToCreate.push(
        ...approvalData.map((approval) => ({
          ...approval,
          type: ApprovalType.ADMIN,
        })),
      )
    }
    if (settings?.requires_sales_manager_approval === true) {
      approvalsToCreate.push(
        ...approvalData.map((approval) => ({
          ...approval,
          type: ApprovalType.SALES_MANAGER,
        })),
      )
    }

    if (approvalsToCreate.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No enabled approval types found",
      )
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)
    const approvals =
      await approvalModuleService.createApprovals(approvalsToCreate)
    return new StepResponse(
      approvals,
      approvals.map((approval) => approval.id),
    )
  },
  async (approvalIds: string[] | undefined, { container }) => {
    if (approvalIds === undefined || approvalIds.length === 0) {
      return
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)
    await approvalModuleService.deleteApprovals(approvalIds)
  },
)
