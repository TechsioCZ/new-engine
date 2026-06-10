import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { APPROVAL_MODULE } from "../../../modules/approval"
import type {
  IApprovalModuleService,
  ModuleApprovalSettings,
} from "../../../types"

export type EnsureApprovalSettingsStepResult = {
  approval_settings: ModuleApprovalSettings[]
  created_approval_settings: ModuleApprovalSettings[]
}

type EnsureApprovalSettingsCompensation = {
  created_ids: string[]
  restored_ids: string[]
}

const getLatestSetting = (
  current: ModuleApprovalSettings | undefined,
  candidate: ModuleApprovalSettings
) => {
  if (!current) {
    return candidate
  }

  return candidate.updated_at > current.updated_at ? candidate : current
}

export const ensureApprovalSettingsStep = createStep(
  "ensure-approval-settings",
  async (
    companyIds: string[],
    { container }
  ): Promise<
    StepResponse<
      EnsureApprovalSettingsStepResult,
      EnsureApprovalSettingsCompensation
    >
  > => {
    if (!companyIds.length) {
      return new StepResponse(
        {
          approval_settings: [],
          created_approval_settings: [],
        },
        {
          created_ids: [],
          restored_ids: [],
        }
      )
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)
    const existingSettings = await approvalModuleService.listApprovalSettings(
      {
        company_id: companyIds,
      },
      {
        withDeleted: true,
      }
    )
    const activeSettingsByCompanyId = new Map<string, ModuleApprovalSettings>()
    const deletedSettingsByCompanyId = new Map<string, ModuleApprovalSettings>()

    for (const setting of existingSettings) {
      if (setting.deleted_at) {
        deletedSettingsByCompanyId.set(
          setting.company_id,
          getLatestSetting(
            deletedSettingsByCompanyId.get(setting.company_id),
            setting
          )
        )
        continue
      }

      activeSettingsByCompanyId.set(
        setting.company_id,
        getLatestSetting(
          activeSettingsByCompanyId.get(setting.company_id),
          setting
        )
      )
    }

    const settingsToRestore = companyIds.flatMap((companyId) => {
      if (activeSettingsByCompanyId.has(companyId)) {
        return []
      }

      const deletedSetting = deletedSettingsByCompanyId.get(companyId)

      return deletedSetting ? [deletedSetting] : []
    })
    const restoredSettingIds = settingsToRestore.map((setting) => setting.id)

    if (restoredSettingIds.length) {
      await approvalModuleService.restoreApprovalSettings(restoredSettingIds)
    }

    const missingCompanyIds = companyIds.filter(
      (companyId) =>
        !(
          activeSettingsByCompanyId.has(companyId) ||
          deletedSettingsByCompanyId.has(companyId)
        )
    )
    const createdSettings = missingCompanyIds.length
      ? await approvalModuleService.createApprovalSettings(
          missingCompanyIds.map((companyId) => ({
            company_id: companyId,
            requires_admin_approval: false,
            requires_sales_manager_approval: false,
          }))
        )
      : []

    return new StepResponse(
      {
        approval_settings: [...settingsToRestore, ...createdSettings],
        created_approval_settings: createdSettings,
      },
      {
        created_ids: createdSettings.map((setting) => setting.id),
        restored_ids: restoredSettingIds,
      }
    )
  },
  async (
    input: EnsureApprovalSettingsCompensation | undefined,
    { container }
  ) => {
    if (!(input?.created_ids.length || input?.restored_ids.length)) {
      return
    }

    const approvalModuleService =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE)

    if (input.created_ids.length) {
      await approvalModuleService.deleteApprovalSettings(input.created_ids)
    }

    if (input.restored_ids.length) {
      await approvalModuleService.softDeleteApprovalSettings(input.restored_ids)
    }
  }
)
