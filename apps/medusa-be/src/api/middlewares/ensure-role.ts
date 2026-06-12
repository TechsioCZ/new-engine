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

const getCustomerId = (req: AuthenticatedMedusaRequest) => {
  const appMetadata = req.auth_context.app_metadata as
    | {
        customer_id?: string
      }
    | undefined
  const { customer_id } = appMetadata ?? {}

  return customer_id ?? req.auth_context.actor_id
}

const findRouteCompany = async (req: AuthenticatedMedusaRequest) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const companyId = req.params.id

  if (!companyId) {
    return
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

  return company as CompanyWithEmployees | undefined
}

export const ensureCompanyMember = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const customerId = getCustomerId(req)

  if (!customerId) {
    return res.status(403).json({ message: "Forbidden" })
  }

  const company = await findRouteCompany(req)
  const isCompanyMember = company?.employees?.some(
    (employee) => employee.customer?.id === customerId
  )

  if (isCompanyMember) {
    return next()
  }

  return res.status(403).json({ message: "Forbidden" })
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

    const customerId = getCustomerId(req)

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

    const company = await findRouteCompany(req)
    const isCompanyAdmin = company?.employees?.some(
      (employee) => employee.is_admin && employee.customer?.id === customerId
    )

    if (isCompanyAdmin) {
      return next()
    }

    return res.status(403).json({ message: "Forbidden" })
  }
