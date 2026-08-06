import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { requirePathParam } from "../../../../../utils/path-params"
import { ensureApprovalSettingsWorkflow } from "../../../../../workflows/approval/workflows/ensure-approval-settings"
import { updateApprovalSettingsWorkflow } from "../../../../../workflows/approval/workflows/update-approval-settings"
import { storeApprovalSettingsFields } from "../../query-config"
import type { StoreUpdateApprovalSettingsType } from "../../validators"

const approvalSettingsQuerySchema = z.object({ id: z.string() })
const createdApprovalSettingsSchema = z.array(z.object({ id: z.string() }))

const updateCompanyApprovalSettings = async (
  req: AuthenticatedMedusaRequest<StoreUpdateApprovalSettingsType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const id = requirePathParam(req.params["id"], "Company id")

  const queryResult: unknown = await query.graph({
    entity: "approval_settings",
    fields: storeApprovalSettingsFields,
    filters: { company_id: id },
  })
  const [approvalSettings] = z
    .object({ data: z.array(approvalSettingsQuerySchema) })
    .parse(queryResult).data

  const { requires_admin_approval } = req.validatedBody
  let approvalSettingsId = approvalSettings?.id

  if (approvalSettings === undefined) {
    const { result: createdApprovalSettings } =
      await ensureApprovalSettingsWorkflow(req.scope).run({
        input: [id],
      })

    approvalSettingsId = createdApprovalSettingsSchema.parse(
      createdApprovalSettings,
    )[0]?.id

    if (approvalSettingsId === undefined || approvalSettingsId.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Approval settings for company ${id} were not found`,
      )
    }
  }

  if (approvalSettingsId === undefined || approvalSettingsId.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Approval settings for company ${id} were not found`,
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

export { updateCompanyApprovalSettings as POST }
