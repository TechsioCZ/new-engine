import type { ProviderIdentityDTO } from "@medusajs/framework/types"

type QueryGraph = {
  graph: (input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    withDeleted?: boolean
  }) => Promise<{ data: unknown[] }>
}

type AdminRoleCandidate = {
  customer_id?: string | null
  email?: string | null
}

type EmployeeCustomerLinkRow = {
  customer_id?: string
  employee_id?: string
}

type EmployeeWithCustomer = {
  company?: {
    deleted_at?: Date | string | null
    id?: string | null
  } | null
  customer?: {
    id?: string | null
  } | null
  deleted_at?: Date | string | null
  id: string
  is_admin?: boolean
}

type ProviderIdentity = Pick<ProviderIdentityDTO, "id">

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
  query: QueryGraph
}) => {
  const candidatesByCustomerId = new Map<string, AdminRoleCandidate>()

  for (const candidate of candidates) {
    if (!(candidate.customer_id && candidate.email)) {
      continue
    }

    candidatesByCustomerId.set(candidate.customer_id, candidate)
  }

  const customerIds = [...candidatesByCustomerId.keys()]

  if (!customerIds.length) {
    return []
  }

  const { data: existingLinks } = (await query.graph({
    entity: EMPLOYEE_CUSTOMER_LINK_ENTRY_POINT,
    fields: ["customer_id", "employee_id"],
    filters: {
      customer_id: customerIds,
    },
  })) as { data: EmployeeCustomerLinkRow[] }
  const employeeIds = [
    ...new Set(
      existingLinks
        .map((existingLink) => existingLink.employee_id)
        .filter((employeeId): employeeId is string => Boolean(employeeId))
    ),
  ]
  const excludedEmployeeIdSet = new Set(excludedEmployeeIds)
  const excludedCompanyIdSet = new Set(excludedCompanyIds)
  const { data: employees } = employeeIds.length
    ? ((await query.graph({
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
      })) as { data: EmployeeWithCustomer[] })
    : { data: [] }
  const activeAdminCustomerIds = new Set(
    employees
      .filter(
        (employee) =>
          employee.is_admin &&
          !employee.deleted_at &&
          !employee.company?.deleted_at &&
          !excludedEmployeeIdSet.has(employee.id) &&
          !excludedCompanyIdSet.has(employee.company?.id ?? "")
      )
      .map((employee) => employee.customer?.id)
      .filter((customerId): customerId is string => Boolean(customerId))
  )
  const emailsToClear = [
    ...new Set(
      [...candidatesByCustomerId.entries()]
        .filter(([customerId]) => !activeAdminCustomerIds.has(customerId))
        .map(([, candidate]) => candidate.email)
        .filter((email): email is string => Boolean(email))
    ),
  ]

  if (!emailsToClear.length) {
    return []
  }

  const { data: providerIdentities } = (await query.graph({
    entity: "provider_identity",
    fields: ["id"],
    filters: {
      entity_id: emailsToClear,
      provider: "emailpass",
    },
  })) as { data: ProviderIdentity[] }

  return providerIdentities
    .map((providerIdentity) => providerIdentity.id)
    .filter((providerIdentityId): providerIdentityId is string =>
      Boolean(providerIdentityId)
    )
}
