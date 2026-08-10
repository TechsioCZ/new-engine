import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"

import { APPROVAL_MODULE } from "../../../modules/approval"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ModuleApprovalSettings, ModuleCompany } from "../../../types"
import { createApprovalSettingsStep } from "../steps/create-approval-settings"

export const createApprovalSettingsWorkflow = createWorkflow(
  "create-approval-settings",
  (input: ModuleCompany[]): WorkflowResponse<ModuleApprovalSettings[]> => {
    const approvalSettings = createApprovalSettingsStep(input)

    const linkData = transform(approvalSettings, (settings) =>
      settings.map((setting) => ({
        [COMPANY_MODULE]: {
          company_id: setting.company_id,
        },
        [APPROVAL_MODULE]: {
          approval_settings_id: setting.id,
        },
      })),
    )

    createRemoteLinkStep(linkData)

    return new WorkflowResponse(approvalSettings)
  },
)
