import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { APPROVAL_MODULE } from "../../../modules/approval"
import type {
  IApprovalModuleService,
  ModuleApprovalSettings,
  ModuleCompany,
} from "../../../types"

export const createApprovalSettingsStep = createStep(
  "create-approval-settings",
  async (
    input: ModuleCompany[],
    { container },
  ): Promise<StepResponse<ModuleApprovalSettings[], string[]>> => {
    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const approvalSettings = await approvalModuleService.createApprovalSettings(
      input.map((company) => ({
        company_id: company.id,
        requires_admin_approval: false,
        requires_sales_manager_approval: false,
      })),
    )

    return new StepResponse(
      approvalSettings,
      approvalSettings.map((setting) => setting.id),
    )
  },
  async (settingIds: string[] | undefined, { container }) => {
    if (settingIds === undefined) {
      return
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    await approvalModuleService.deleteApprovalSettings(settingIds)
  },
)
