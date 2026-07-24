import type { HttpTypes } from "@medusajs/types"

import type { QueryCompany } from "../company"
import type { ApprovalStatusType } from "./module"
import type {
  QueryApproval,
  QueryApprovalSettings,
  QueryApprovalStatus,
} from "./query"

/* Admin */
export type AdminApprovalSettings = QueryApprovalSettings

export type AdminApprovalSettingsResponse = {
  approvalSettings: AdminApprovalSettings[]
}

export type AdminUpdateApprovalSettings = {
  id?: string
  requires_admin_approval: boolean
  requires_sales_manager_approval: boolean
}

export type AdminApproval = QueryApproval

export type AdminApprovalsResponse = {
  carts_with_approvals: AdminCartWithApprovals[]
  count: number
}

export type AdminCartWithApprovals = HttpTypes.StoreCart & {
  company: QueryCompany
  approval_status: QueryApprovalStatus
  approval_requests: QueryApproval[]
}

export type AdminUpdateApproval = {
  status: ApprovalStatusType
}
