import type { PaginatedResponse } from "@medusajs/types"

import type { QueryCompany, QueryEmployee } from "./query"

/* Admin */

/* Company */
export type AdminCompanyResponse = {
  company: QueryCompany
}

export type AdminCreateCompaniesResponse = {
  companies: QueryCompany[]
}

export type AdminCompaniesResponse = PaginatedResponse<{
  companies: QueryCompany[]
}>

export type AdminCreateCompany = {
  name: string
  phone: string
  email: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  logo_url: string | null
  currency_code: string | null
}

export type AdminUpdateCompany = Partial<AdminCreateCompany>

/* Employee */

export type AdminEmployeeResponse = {
  employee: QueryEmployee
}

export type AdminEmployeesResponse = PaginatedResponse<{
  employees: QueryEmployee[]
}>

export type AdminCreateEmployee = {
  spending_limit: number
  is_admin: boolean
  company_id: string
  customer_id: string
}

export type AdminUpdateEmployee = Partial<
  Pick<AdminCreateEmployee, "spending_limit" | "is_admin">
>
