import type { CustomerDTO, HttpTypes } from "@medusajs/framework/types"

import type { QueryApprovalSettings } from "../approval/query"
import type { ModuleCompany, ModuleEmployee } from "./module"

export type QueryCompany = ModuleCompany & {
  employees: QueryEmployee[]
  approval_settings: QueryApprovalSettings
  carts: HttpTypes.StoreCart[]
}

export type QueryEmployee = ModuleEmployee & {
  company: QueryCompany
  customer: CustomerDTO
}

/**
 * Employee row shape returned by `query.graph` in employee workflow steps.
 * Deliberately wide enough to accept generated graph rows, where dates may be
 * serialized strings and the customer relation may be absent.
 */
type QueryGraphDate = Date | string

export interface QueryGraphEmployee {
  id: string
  spending_limit: number
  is_admin: boolean
  company_id: string
  created_at: QueryGraphDate
  updated_at: QueryGraphDate
  deleted_at?: QueryGraphDate | null | undefined
  customer?:
    | {
        id: string
        email: string | null
        first_name?: string | null | undefined
        last_name?: string | null | undefined
      }
    | null
    | undefined
}

interface QueryCompanyEmployeeProjection {
  customer?: {
    email?: string | null
    id: string
  } | null
  deleted_at?: Date | string | null
  is_admin?: boolean
}

export interface QueryCompanyProjection {
  customer_group?: { id: string } | null
  employees?: (QueryCompanyEmployeeProjection | null)[] | null
}
