import type { Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"

interface AdminRoleCandidate {
  customer_id?: string | null | undefined
  email?: string | null | undefined
}

const graphDateSchema = z.union([z.date(), z.string(), z.null()]).optional()
const employeeCustomerLinksResultSchema = z.object({
  data: z.array(
    z.object({
      customer_id: z.string().optional(),
      employee_id: z.string().optional(),
    }),
  ),
})
const employeesResultSchema = z.object({
  data: z.array(
    z.object({
      company: z
        .object({
          deleted_at: graphDateSchema,
          id: z.string().nullable().optional(),
        })
        .nullable()
        .optional(),
      customer: z
        .object({ id: z.string().nullable().optional() })
        .nullable()
        .optional(),
      deleted_at: graphDateSchema,
      id: z.string(),
      is_admin: z.boolean().optional(),
    }),
  ),
})
const providerIdentitiesResultSchema = z.object({
  data: z.array(z.object({ id: z.string() })),
})

const EMPLOYEE_CUSTOMER_LINK_ENTRY_POINT = "employee_customer"

export const getProviderIdentityIdsWithoutActiveAdminRole = async ({
  candidates,
  excludedCompanyIds = [],
  excludedEmployeeIds = [],
  query,
}: {
  candidates: AdminRoleCandidate[]
  excludedCompanyIds?: string[]
  excludedEmployeeIds?: string[]
  query: Query
}) => {
  const candidatesByCustomerId = new Map<string, AdminRoleCandidate>()

  for (const candidate of candidates) {
    const { customer_id: customerId, email } = candidate
    if (
      typeof customerId === "string" &&
      customerId.length > 0 &&
      typeof email === "string" &&
      email.length > 0
    ) {
      candidatesByCustomerId.set(customerId, candidate)
    }
  }

  const customerIds = [...candidatesByCustomerId.keys()]

  if (customerIds.length === 0) {
    return []
  }

  const existingLinksResult: unknown = await query.graph({
    entity: EMPLOYEE_CUSTOMER_LINK_ENTRY_POINT,
    fields: ["customer_id", "employee_id"],
    filters: {
      customer_id: customerIds,
    },
  })
  const parsedExistingLinks =
    employeeCustomerLinksResultSchema.safeParse(existingLinksResult)
  if (!parsedExistingLinks.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Invalid employee-customer link graph response",
    )
  }
  const { data: existingLinks } = parsedExistingLinks.data
  const employeeIds = [
    ...new Set(
      existingLinks.flatMap((existingLink) =>
        existingLink.employee_id === undefined ||
        existingLink.employee_id.length === 0
          ? []
          : [existingLink.employee_id],
      ),
    ),
  ]
  const excludedEmployeeIdSet = new Set(excludedEmployeeIds)
  const excludedCompanyIdSet = new Set(excludedCompanyIds)
  const employeesResult: unknown =
    employeeIds.length > 0
      ? await query.graph({
          entity: "employee",
          fields: [
            "id",
            "deleted_at",
            "is_admin",
            "company.id",
            "company.deleted_at",
            "customer.id",
          ],
          filters: {
            id: employeeIds,
          },
          withDeleted: true,
        })
      : { data: [] }
  const parsedEmployees = employeesResultSchema.safeParse(employeesResult)
  if (!parsedEmployees.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Invalid employee graph response",
    )
  }
  const { data: employees } = parsedEmployees.data
  const activeAdminCustomerIds = new Set(
    employees.flatMap((employee) => {
      if (employee.is_admin !== true) {
        return []
      }
      if (employee.deleted_at !== undefined && employee.deleted_at !== null) {
        return []
      }
      if (
        employee.company?.deleted_at !== undefined &&
        employee.company.deleted_at !== null
      ) {
        return []
      }
      if (excludedEmployeeIdSet.has(employee.id)) {
        return []
      }
      if (excludedCompanyIdSet.has(employee.company?.id ?? "")) {
        return []
      }

      const { id: customerId } = employee.customer ?? {}
      return typeof customerId === "string" && customerId.length > 0
        ? [customerId]
        : []
    }),
  )
  const emailsToClear = [
    ...new Set(
      [...candidatesByCustomerId.entries()].flatMap(
        ([customerId, candidate]) => {
          if (activeAdminCustomerIds.has(customerId)) {
            return []
          }

          const { email } = candidate
          return typeof email === "string" && email.length > 0 ? [email] : []
        },
      ),
    ),
  ]

  if (emailsToClear.length === 0) {
    return []
  }

  const providerIdentitiesResult: unknown = await query.graph({
    entity: "provider_identity",
    fields: ["id"],
    filters: {
      entity_id: emailsToClear,
      provider: "emailpass",
    },
  })
  const parsedProviderIdentities = providerIdentitiesResultSchema.safeParse(
    providerIdentitiesResult,
  )
  if (!parsedProviderIdentities.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Invalid provider identity graph response",
    )
  }
  const { data: providerIdentities } = parsedProviderIdentities.data

  return providerIdentities.map((providerIdentity) => providerIdentity.id)
}
