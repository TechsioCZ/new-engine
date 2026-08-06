import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"

import { APPROVAL_MODULE } from "../../../modules/approval"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ModuleApprovalSettings } from "../../../types"
import { validateCompanyActiveStep } from "../../company/steps/validate-company-active"
import { dismissCompanyApprovalSettingsLinksStep } from "../steps/dismiss-company-approval-settings-links"
import { ensureApprovalSettingsStep } from "../steps/ensure-approval-settings"

export const ensureApprovalSettingsWorkflow = createWorkflow(
  "ensure-approval-settings",
  (companyIds: string[]): WorkflowResponse<ModuleApprovalSettings[]> => {
    validateCompanyActiveStep(companyIds)

    const ensureResult = ensureApprovalSettingsStep(companyIds)
    const approvalSettings = transform(
      { ensureResult },
      (data) => data.ensureResult.approval_settings,
    )
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

    return new WorkflowResponse(approvalSettings)
  },
)
