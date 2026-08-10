import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

const CompanySchema = z.object({
  employees: z
    .array(
      z.object({
        customer: z.object({ id: z.string().optional() }).nullable().optional(),
        is_admin: z.boolean().optional(),
      }),
    )
    .optional(),
})

const getCustomerId = (req: AuthenticatedMedusaRequest) => {
  const metadataResult = z
    .object({ customer_id: z.string().optional() })
    .safeParse(req.auth_context.app_metadata)
  const actorId = req.auth_context.actor_id

  if (metadataResult.success && metadataResult.data.customer_id !== undefined) {
    return metadataResult.data.customer_id
  }

  return typeof actorId === "string" ? actorId : undefined
}

const findRouteCompany = async (req: AuthenticatedMedusaRequest) => {
  const companyId = req.params["id"]
  if (typeof companyId !== "string" || companyId.length === 0) {
    return null
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "companies",
    fields: [
      "id",
      "employees.id",
      "employees.is_admin",
      "employees.customer.id",
    ],
    filters: { id: companyId },
  })

  return z.array(CompanySchema).parse(data).at(0) ?? null
}

const respondForbidden = (res: MedusaResponse): void => {
  res.status(403).json({ message: "Forbidden" })
}

export const ensureCompanyMember = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
): Promise<void> => {
  const customerId = getCustomerId(req)
  if (customerId === undefined) {
    respondForbidden(res)
    return
  }

  const company = await findRouteCompany(req)
  const isCompanyMember = company?.employees?.some(
    (employee) => employee.customer?.id === customerId,
  )

  if (isCompanyMember !== true) {
    respondForbidden(res)
    return
  }

  next()
}

export const ensureRole =
  (role: string) =>
  async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction,
  ): Promise<void> => {
    if (role !== "company_admin") {
      respondForbidden(res)
      return
    }

    const customerId = getCustomerId(req)
    if (customerId === undefined) {
      respondForbidden(res)
      return
    }

    const companyId = req.params["id"]
    if (typeof companyId !== "string" || companyId.length === 0) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "customer",
        fields: ["employee.is_admin"],
        filters: { id: customerId },
      })
      const customer = z
        .array(
          z.object({
            employee: z.object({ is_admin: z.boolean() }).nullable().optional(),
          }),
        )
        .parse(data)
        .at(0)

      if (customer?.employee?.is_admin !== true) {
        respondForbidden(res)
        return
      }

      next()
      return
    }

    const company = await findRouteCompany(req)
    const isCompanyAdmin = company?.employees?.some(
      (employee) =>
        employee.is_admin === true && employee.customer?.id === customerId,
    )

    if (isCompanyAdmin !== true) {
      respondForbidden(res)
      return
    }

    next()
  }
