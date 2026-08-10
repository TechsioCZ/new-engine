import type {
  ModuleApproval,
  ModuleApprovalSettings,
  ModuleApprovalStatus,
} from "./module"

export type QueryApprovalSettings = ModuleApprovalSettings

export type QueryApproval = ModuleApproval

export type QueryApprovalStatus = ModuleApprovalStatus

export interface QueryCartApproval {
  id: string
  approval_status?: Pick<ModuleApprovalStatus, "status"> | null
  company?: {
    approval_settings?: Pick<
      ModuleApprovalSettings,
      "requires_admin_approval" | "requires_sales_manager_approval"
    > | null
  } | null
}
