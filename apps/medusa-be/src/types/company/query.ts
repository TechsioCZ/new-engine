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
