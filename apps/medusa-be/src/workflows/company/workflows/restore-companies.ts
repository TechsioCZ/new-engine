import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { APPROVAL_MODULE } from "../../../modules/approval"
import { COMPANY_MODULE } from "../../../modules/company"
import {
  dismissCompanyApprovalSettingsLinksStep,
  ensureApprovalSettingsStep,
} from "../../approval/steps"
import {
  restoreCompaniesStep,
  restoreCompanyAdminAuthMetadataStep,
} from "../steps"

export const restoreCompaniesWorkflow = createWorkflow(
  "restore-companies",
  (input: { ids: string[] }) => {
    const restoredIds = restoreCompaniesStep(input.ids)
    restoreCompanyAdminAuthMetadataStep(restoredIds)
    const ensureResult = ensureApprovalSettingsStep(restoredIds)
    const createdApprovalSettings = transform(
      { ensureResult },
      (data) => data.ensureResult.created_approval_settings
    )
    const linkData = transform(createdApprovalSettings, (settings) =>
      settings.map((setting) => ({
        [COMPANY_MODULE]: {
          company_id: setting.company_id,
        },
        [APPROVAL_MODULE]: {
          approval_settings_id: setting.id,
        },
      }))
    )
    const createdCompanyIds = transform(createdApprovalSettings, (settings) =>
      settings.map((setting) => setting.company_id)
    )

    when(createdApprovalSettings, (settings) => settings.length > 0).then(
      () => {
        dismissCompanyApprovalSettingsLinksStep(createdCompanyIds)
        createRemoteLinkStep(linkData)
      }
    )

    return new WorkflowResponse(restoredIds)
  }
)
