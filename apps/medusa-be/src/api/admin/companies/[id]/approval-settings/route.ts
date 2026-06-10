import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  ensureApprovalSettingsWorkflow,
  updateApprovalSettingsWorkflow,
} from "../../../../../workflows/approval/workflows"
import { adminApprovalSettingsFields } from "../../query-config"
import type { AdminUpdateApprovalSettingsType } from "../../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: approvalSettings, metadata } = await query.graph({
    entity: "approval_settings",
    fields: adminApprovalSettingsFields,
    filters: req.filterableFields,
    pagination: {
      ...req.remoteQueryConfig.pagination,
    },
  })

  res.json({
    approvalSettings,
    count: metadata?.count ?? approvalSettings.length,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? approvalSettings.length,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateApprovalSettingsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params
  const { requires_admin_approval, requires_sales_manager_approval } =
    req.validatedBody

  let {
    data: [currentApprovalSettings],
  } = await query.graph({
    entity: "approval_settings",
    fields: ["id"],
    filters: { company_id: id },
  })

  if (!currentApprovalSettings) {
    const { result: createdApprovalSettings } =
      await ensureApprovalSettingsWorkflow.run({
        input: [id],
        container: req.scope,
      })

    currentApprovalSettings = createdApprovalSettings[0]

    if (!currentApprovalSettings) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Approval settings for company ${id} were not found`
      )
    }
  }

  const { result: updatedApprovalSettings } =
    await updateApprovalSettingsWorkflow.run({
      input: {
        company_id: id,
        id: currentApprovalSettings.id,
        requires_admin_approval,
        requires_sales_manager_approval,
      },
      container: req.scope,
    })

  const { data: approvalSettings } = await query.graph(
    {
      entity: "approval_settings",
      fields: adminApprovalSettingsFields,
      filters: {
        id: updatedApprovalSettings.id,
      },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ approvalSettings })
}
