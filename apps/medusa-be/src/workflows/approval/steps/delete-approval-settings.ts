import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { APPROVAL_MODULE } from "../../../modules/approval"
import type {
  IApprovalModuleService,
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
    const approvalSettingsIds = approvalSettings.map((setting) => setting.id)

    if (approvalSettingsIds.length) {
      await approvalModule.softDeleteApprovalSettings(approvalSettingsIds)
    }

    return new StepResponse(undefined, approvalSettingsIds)
  },
  async (approvalSettingsIds: string[] | undefined, { container }) => {
    if (!approvalSettingsIds?.length) {
      return
    }

    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    await approvalModule.restoreApprovalSettings(approvalSettingsIds)
  }
)
