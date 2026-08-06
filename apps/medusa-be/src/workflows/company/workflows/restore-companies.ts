import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"

import { APPROVAL_MODULE } from "../../../modules/approval"
import { COMPANY_MODULE } from "../../../modules/company"
import { dismissCompanyApprovalSettingsLinksStep } from "../../approval/steps/dismiss-company-approval-settings-links"
import { ensureApprovalSettingsStep } from "../../approval/steps/ensure-approval-settings"
import { restoreCompaniesStep } from "../steps/restore-companies"
import { restoreCompanyAdminAuthMetadataStep } from "../steps/restore-company-admin-auth-metadata"

export const restoreCompaniesWorkflow = createWorkflow(
  "restore-companies",
  (input: { ids: string[] }) => {
    const restoredIds = restoreCompaniesStep(input.ids)
    restoreCompanyAdminAuthMetadataStep(restoredIds)
    const ensureResult = ensureApprovalSettingsStep(restoredIds)
    const createdApprovalSettings = transform(
      { ensureResult },
      (data) => data.ensureResult.created_approval_settings,
    )
    const linkData = transform(createdApprovalSettings, (settings) =>
      settings.map((setting) => ({
        [COMPANY_MODULE]: {
          company_id: setting.company_id,
        },
        [APPROVAL_MODULE]: {
          approval_settings_id: setting.id,
        },
      })),
    )
    const createdCompanyIds = transform(createdApprovalSettings, (settings) =>
      settings.map((setting) => setting.company_id),
    )

    const { then: linkCreatedApprovalSettings } = when(
      createdApprovalSettings,
      (settings) => settings.length > 0,
    )
    linkCreatedApprovalSettings(() => {
      dismissCompanyApprovalSettingsLinksStep(createdCompanyIds)
      createRemoteLinkStep(linkData)
    })

    return new WorkflowResponse(restoredIds)
  },
)
