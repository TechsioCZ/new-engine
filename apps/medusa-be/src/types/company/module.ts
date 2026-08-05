/* Entity: Company */

import type { CustomerDTO, CustomerGroupDTO } from "@medusajs/framework/types"

import type { ModuleApprovalSettings } from "../approval"

export const ModuleCompanySpendingLimitResetFrequency = {
  DAILY: "daily",
  MONTHLY: "monthly",
  NEVER: "never",
  WEEKLY: "weekly",
  YEARLY: "yearly",
} as const

export type ModuleCompanySpendingLimitResetFrequency =
  (typeof ModuleCompanySpendingLimitResetFrequency)[keyof typeof ModuleCompanySpendingLimitResetFrequency]

export interface ModuleCompany {
  id: string
  name: string
  phone: string | null
  email: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  logo_url: string | null
  currency_code: string | null
  spending_limit_reset_frequency: ModuleCompanySpendingLimitResetFrequency
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
  customer_group: CustomerGroupDTO
  approval_settings: ModuleApprovalSettings
}

export interface ModuleCreateCompany {
  name: string
  phone?: string | null
  email: string
  address?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  country?: string | null
  logo_url?: string | null
  currency_code: string
  spending_limit_reset_frequency?: ModuleCompanySpendingLimitResetFrequency
}

export interface ModuleUpdateCompany extends Partial<ModuleCompany> {
  id: string
}

export interface ModuleDeleteCompany {
  id: string
}

/* Entity: Employee */

export interface ModuleEmployee {
  id: string
  spending_limit: number
  is_admin: boolean
  company_id: string
  created_at: Date
  updated_at: Date
  deleted_at?: Date | null
  customer: CustomerDTO
  company: ModuleCompany
}

export interface ModuleCreateEmployee {
  customer_id: string
  spending_limit?: number
  is_admin?: boolean
  company_id: string
}

export interface ModuleUpdateEmployee extends Partial<ModuleEmployee> {
  id: string
}
