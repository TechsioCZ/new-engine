import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { requirePathParam } from "../../../../../utils/path-params"
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

  const id = requirePathParam(req.params.id, "Company id")

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
      await ensureApprovalSettingsWorkflow(req.scope).run({
        input: [id],
      })

    approvalSettingsId = createdApprovalSettings[0]?.id

    if (!approvalSettingsId) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Approval settings for company ${id} were not found`
      )
    }
  }

  if (!approvalSettingsId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Approval settings for company ${id} were not found`
    )
  }

  await updateApprovalSettingsWorkflow(req.scope).run({
    input: {
      company_id: id,
      id: approvalSettingsId,
      requires_admin_approval,
    },
  })

  res.status(201).send()
}
