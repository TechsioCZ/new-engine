import type { CompanyDTO, EmployeeDTO } from "./common"

export type CreateCompanyDTO = Omit<
  Partial<CompanyDTO>,
  "id" | "createdAt" | "updatedAt"
>

export type UpdateCompanyDTO = Partial<CompanyDTO> & {
  id: string
}

export interface DeleteCompanyDTO {
  id: string
}

export type CreateEmployeeDTO = Omit<
  Partial<EmployeeDTO>,
  "id" | "createdAt" | "updatedAt"
> & {
  customer_id: string
}

export type UpdateEmployeeDTO = Partial<EmployeeDTO> & {
  id: string
}

export interface DeleteEmployeeDTO {
  id: string
}
