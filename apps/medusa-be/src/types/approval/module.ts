/* Entity: Approval Settings */

export type ModuleApprovalSettings = {
  id: string
  company_id: string
  requires_admin_approval: boolean
  requires_sales_manager_approval: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ModuleCreateApprovalSettings = {
  company_id: string
  requires_admin_approval: boolean
  requires_sales_manager_approval: boolean
}

export type ModuleUpdateApprovalSettings = {
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
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const

export type ApprovalStatusType =
  (typeof ApprovalStatusType)[keyof typeof ApprovalStatusType]

export type ModuleApproval = {
  id: string
  cart_id: string
  type: ApprovalType
  status: ApprovalStatusType
  created_by: string
  handled_by: string
}

export type ModuleCreateApproval = {
  cart_id: string
  type: ApprovalType
  created_by: string
}

export type ModuleUpdateApproval = {
  id: string
  status: ApprovalStatusType
  handled_by: string
}

/* Entity: Approval Status */
export type ModuleApprovalStatus = {
  id: string
  cart_id: string
  status: ApprovalStatusType
}

export type ModuleCreateApprovalStatus = {
  cart_id: string
  status: ApprovalStatusType
}

export type ModuleUpdateApprovalStatus = {
  id: string
  status: ApprovalStatusType
}
