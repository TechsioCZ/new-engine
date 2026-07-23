import type { HttpTypes } from "@medusajs/framework/types"
import type { CustomerDTO } from "@medusajs/types"

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
export type QueryGraphEmployee = {
  id: string
  spending_limit: number
  is_admin: boolean
  company_id: string
  created_at: Date | string
  updated_at: Date | string
  deleted_at?: Date | string | null | undefined
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
