/* Entity: Approval Settings */

export interface ModuleApprovalSettings {
  id: string
  company_id: string
  requires_admin_approval: boolean
  requires_sales_manager_approval: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ModuleCreateApprovalSettings {
  company_id: string
  requires_admin_approval: boolean
  requires_sales_manager_approval: boolean
}

export interface ModuleUpdateApprovalSettings {
  id: string
  requires_admin_approval?: boolean
  requires_sales_manager_approval?: boolean
}

/* Entity: Approval */
export const ApprovalType = {
  ADMIN: "admin",
  SALES_MANAGER: "sales_manager",
} as const

export type ApprovalType = (typeof ApprovalType)[keyof typeof ApprovalType]

export const ApprovalStatusType = {
  APPROVED: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
} as const

export type ApprovalStatusType =
  (typeof ApprovalStatusType)[keyof typeof ApprovalStatusType]

export interface ModuleApproval {
  id: string
  cart_id: string
  type: ApprovalType
  status: ApprovalStatusType
  created_by: string
  handled_by: string | null
}

export interface ModuleCreateApproval {
  cart_id: string
  type: ApprovalType
  created_by: string
}

export interface ModuleUpdateApproval {
  id: string
  status: ApprovalStatusType
  handled_by: string | null
}

/* Entity: Approval Status */
export interface ModuleApprovalStatus {
  id: string
  cart_id: string
  status: ApprovalStatusType
}

export interface ModuleCreateApprovalStatus {
  cart_id: string
  status: ApprovalStatusType
}

export interface ModuleUpdateApprovalStatus {
  id: string
  status: ApprovalStatusType
}
