import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { APPROVAL_MODULE } from "../../../modules/approval"
import type {
  IApprovalModuleService,
  ModuleApprovalSettings,
} from "../../../types"

export const ensureApprovalSettingsStep = createStep(
  "ensure-approval-settings",
  async (
    companyIds: string[],
    { container }
  ): Promise<StepResponse<ModuleApprovalSettings[], string[]>> => {
    if (!companyIds.length) {
      return new StepResponse([], [])
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)
    const existingSettings = await approvalModuleService.listApprovalSettings({
      company_id: companyIds,
    })
    const existingCompanyIds = new Set(
      existingSettings.map((setting) => setting.company_id)
    )
    const missingCompanyIds = companyIds.filter(
      (companyId) => !existingCompanyIds.has(companyId)
    )

    if (!missingCompanyIds.length) {
      return new StepResponse([], [])
    }

    const createdSettings = await approvalModuleService.createApprovalSettings(
      missingCompanyIds.map((companyId) => ({
        company_id: companyId,
        requires_admin_approval: false,
        requires_sales_manager_approval: false,
      }))
    )

    return new StepResponse(
      createdSettings,
      createdSettings.map((setting) => setting.id)
    )
  },
  async (settingIds: string[] | undefined, { container }) => {
    if (!settingIds?.length) {
      return
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    await approvalModuleService.deleteApprovalSettings(settingIds)
  }
)
