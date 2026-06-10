import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
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
  req: MedusaRequest<StoreUpdateApprovalSettingsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { id } = req.params

  let {
    data: [approval_settings],
  } = await query.graph({
    entity: "approval_settings",
    fields: storeApprovalSettingsFields,
    filters: { company_id: id },
  })

  const { requires_admin_approval } = req.validatedBody

  if (!approval_settings) {
    const { result: createdApprovalSettings } =
      await ensureApprovalSettingsWorkflow.run({
        input: [id],
        container: req.scope,
      })

    approval_settings = createdApprovalSettings[0]

    if (!approval_settings) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Approval settings for company ${id} were not found`
      )
    }
  }

  await updateApprovalSettingsWorkflow.run({
    input: {
      company_id: id,
      id: approval_settings.id,
      requires_admin_approval,
    },
    container: req.scope,
  })

  res.status(201).send()
}
