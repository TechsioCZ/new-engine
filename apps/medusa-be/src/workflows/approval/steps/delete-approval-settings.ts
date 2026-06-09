import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { APPROVAL_MODULE } from "../../../modules/approval"
import type {
  IApprovalModuleService,
  ModuleApprovalSettings,
  ModuleApprovalSettingsFilters,
} from "../../../types"

type DeleteApprovalSettingsStepInput = {
  ids?: string[]
  companyIds?: string[]
}

export const deleteApprovalSettingsStep = createStep(
  "delete-approval-settings",
  async (input: DeleteApprovalSettingsStepInput, { container }) => {
    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    const filters: ModuleApprovalSettingsFilters = {}

    if (input.ids) {
      filters.id = input.ids
    }

    if (input.companyIds) {
      filters.company_id = input.companyIds
    }

    const approvalSettings = await approvalModule.listApprovalSettings(filters)

    await approvalModule.deleteApprovalSettings(
      approvalSettings.map((setting) => setting.id)
    )

    return new StepResponse(undefined, approvalSettings)
  },
  async (
    approvalSettings: ModuleApprovalSettings[] | undefined,
    { container }
  ) => {
    if (!approvalSettings?.length) {
      return
    }

    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    await approvalModule.createApprovalSettings(
      approvalSettings.map((setting) => ({
        company_id: setting.company_id,
        requires_admin_approval: setting.requires_admin_approval,
        requires_sales_manager_approval:
          setting.requires_sales_manager_approval,
      }))
    )
  }
)
