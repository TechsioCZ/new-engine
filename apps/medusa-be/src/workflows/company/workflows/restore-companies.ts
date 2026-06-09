import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { APPROVAL_MODULE } from "../../../modules/approval"
import { COMPANY_MODULE } from "../../../modules/company"
import { ensureApprovalSettingsStep } from "../../approval/steps"
import { restoreCompaniesStep } from "../steps"

export const restoreCompaniesWorkflow = createWorkflow(
  "restore-companies",
  (input: { ids: string[] }) => {
    const restoredIds = restoreCompaniesStep(input.ids)
    const approvalSettings = ensureApprovalSettingsStep(restoredIds)
    const linkData = transform(approvalSettings, (settings) =>
      settings.map((setting) => ({
        [COMPANY_MODULE]: {
          company_id: setting.company_id,
        },
        [APPROVAL_MODULE]: {
          approval_settings_id: setting.id,
        },
      }))
    )

    when(approvalSettings, (settings) => settings.length > 0).then(() => {
      createRemoteLinkStep(linkData)
    })

    return new WorkflowResponse(restoredIds)
  }
)
