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
import type { IApprovalModuleService } from "../../../types/approval/service"

interface CartApprovalProjection {
  approval_status?: { status?: unknown } | null
  company?: {
    approval_settings?: {
      requires_admin_approval?: boolean
      requires_sales_manager_approval?: boolean
    } | null
  } | null
  id: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isOptionalBoolean = (value: unknown) =>
  value === undefined || typeof value === "boolean"

const isCartApprovalProjection = (
  value: unknown,
): value is CartApprovalProjection => {
  if (!isRecord(value) || typeof value["id"] !== "string") {
    return false
  }

  const { approval_status: approvalStatus, company } = value
  if (
    approvalStatus !== undefined &&
    approvalStatus !== null &&
    !isRecord(approvalStatus)
  ) {
    return false
  }

  if (company === undefined || company === null) {
    return true
  }
  if (!isRecord(company)) {
    return false
  }

  const settings = company["approval_settings"]
  if (settings === undefined || settings === null) {
    return true
  }
  if (!isRecord(settings)) {
    return false
  }
  return [
    settings["requires_admin_approval"],
    settings["requires_sales_manager_approval"],
  ].every(isOptionalBoolean)
}

const parseApprovalStatus = (value: unknown): ApprovalStatusType | undefined =>
  [
    ApprovalStatusType.PENDING,
    ApprovalStatusType.APPROVED,
    ApprovalStatusType.REJECTED,
  ].find((status) => status === value)

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

    const graphResult: unknown = await query.graph(
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
    const data: unknown = isRecord(graphResult)
      ? graphResult["data"]
      : undefined
    const cart: unknown = Array.isArray(data) ? data[0] : undefined
    if (cart === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart ${firstApproval.cart_id} was not found`,
      )
    }
    if (!isCartApprovalProjection(cart)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Cart ${firstApproval.cart_id} returned invalid approval data`,
      )
    }

    const rawApprovalStatus = cart.approval_status?.status
    const cartApprovalStatus = parseApprovalStatus(rawApprovalStatus)
    if (rawApprovalStatus !== undefined && cartApprovalStatus === undefined) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Cart ${cart.id} has an invalid approval status`,
      )
    }

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
