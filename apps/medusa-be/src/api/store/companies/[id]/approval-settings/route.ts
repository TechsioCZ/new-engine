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
import { storeApprovalSettingsFields } from "../../query-config"
import type { StoreUpdateApprovalSettingsType } from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreUpdateApprovalSettingsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { id } = req.params

  const {
    data: [approvalSettings],
  } = await query.graph({
    entity: "approval_settings",
    fields: storeApprovalSettingsFields,
    filters: { company_id: id },
  })

  const { requires_admin_approval } = req.validatedBody
  let approvalSettingsId = approvalSettings?.id

  if (!approvalSettings) {
    const { result: createdApprovalSettings } =
      await ensureApprovalSettingsWorkflow.run({
        input: [id],
        container: req.scope,
      })

    approvalSettingsId = createdApprovalSettings[0]?.id

    if (!approvalSettingsId) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Approval settings for company ${id} were not found`
      )
    }
  }

  await updateApprovalSettingsWorkflow.run({
    input: {
      company_id: id,
      id: approvalSettingsId,
      requires_admin_approval,
    },
    container: req.scope,
  })

  res.status(201).send()
}
