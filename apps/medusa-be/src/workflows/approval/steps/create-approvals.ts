/* istanbul ignore file */
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { APPROVAL_MODULE } from "../../../modules/approval"
import {
  ApprovalStatusType,
  ApprovalType,
  type IApprovalModuleService,
  type ModuleCreateApproval,
} from "../../../types"

export const createApprovalStep = createStep(
  "create-approval",
  async (
    input:
      | Omit<ModuleCreateApproval, "type">
      | Omit<ModuleCreateApproval, "type">[],
    { container }
  ) => {
    const query = container.resolve<RemoteQueryFunction>(
      ContainerRegistrationKeys.QUERY
    )

    const approvalData = Array.isArray(input) ? input : [input]
    const approvalLookupInput = approvalData[0]

    if (!approvalLookupInput) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one approval is required"
      )
    }

    const {
      data: [cart],
    } = await query.graph(
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
          id: approvalLookupInput.cart_id,
        },
      },
      {
        throwIfKeyNotFound: true,
      }
    )

    if (
      (cart.approval_status?.status as unknown as ApprovalStatusType) ===
      ApprovalStatusType.PENDING
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cart already has a pending approval"
      )
    }

    if (
      (cart.approval_status?.status as unknown as ApprovalStatusType) ===
      ApprovalStatusType.APPROVED
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cart is already approved"
      )
    }

    const { requires_admin_approval, requires_sales_manager_approval } =
      cart?.company?.approval_settings || {}

    const approvalsToCreate = [] as ModuleCreateApproval[]

    if (requires_admin_approval) {
      approvalsToCreate.push(
        ...approvalData.map((data) => ({
          ...data,
          type: ApprovalType.ADMIN,
        }))
      )
    }

    if (requires_sales_manager_approval) {
      approvalsToCreate.push(
        ...approvalData.map((data) => ({
          ...data,
          type: ApprovalType.SALES_MANAGER,
        }))
      )
    }

    if (approvalsToCreate.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No enabled approval types found"
      )
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const approvals =
      await approvalModuleService.createApprovals(approvalsToCreate)

    return new StepResponse(
      approvals,
      approvals.map((approval) => approval.id)
    )
  },
  async (approvalIds, { container }) => {
    if (!approvalIds) {
      return
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    await approvalModuleService.deleteApprovals(approvalIds)
  }
)
