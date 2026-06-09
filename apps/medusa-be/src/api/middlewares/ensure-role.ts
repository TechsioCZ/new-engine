import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type CompanyEmployee = {
  customer?: {
    id?: string
  } | null
  is_admin?: boolean
}

type CompanyWithEmployees = {
  employees?: CompanyEmployee[]
}

export const ensureRole =
  (role: string) =>
  async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    if (role !== "company_admin") {
      return res.status(403).json({ message: "Forbidden" })
    }

    const { customer_id: customerId } = req.auth_context.app_metadata as {
      customer_id?: string
    }

    if (!customerId) {
      return res.status(403).json({ message: "Forbidden" })
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const companyId = req.params.id

    if (!companyId) {
      const {
        data: [customer],
      } = await query.graph({
        entity: "customer",
        fields: ["employee.is_admin"],
        filters: { id: customerId },
      })

      if (customer?.employee?.is_admin) {
        return next()
      }

      return res.status(403).json({ message: "Forbidden" })
    }

    const {
      data: [company],
    } = await query.graph({
      entity: "companies",
      fields: [
        "id",
        "employees.id",
        "employees.is_admin",
        "employees.customer.id",
      ],
      filters: { id: companyId },
    })

    if (company?.employees?.length === 0) {
      return next()
    }

    const typedCompany = company as CompanyWithEmployees
    const isCompanyAdmin = typedCompany.employees?.some(
      (employee) => employee.is_admin && employee.customer?.id === customerId
    )

    if (isCompanyAdmin) {
      return next()
    }

    return res.status(403).json({ message: "Forbidden" })
  }
