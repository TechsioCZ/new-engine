import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { definedProperties } from "../../../utils/defined-properties"
import { createCompaniesWorkflow } from "../../../workflows/company/workflows/create-companies"
import type {
  AdminCreateCompanyType,
  AdminGetCompanyParamsType,
} from "./validators"

type CompanyListStatus = NonNullable<AdminGetCompanyParamsType["status"]>

const ORDER_FIELDS = new Set(["name", "created_at", "updated_at"])
const LEADING_DASH_REGEX = /^-/u
const LIKE_WILDCARD_REGEX = /[%_\\]/gu

const escapeLikePattern = (value: string) =>
  value.replace(LIKE_WILDCARD_REGEX, (match) => `\\${match}`)

const parseCompanyOrder = (value = "name") => {
  const direction = value.startsWith("-") ? "DESC" : "ASC"
  const field = value.replace(LEADING_DASH_REGEX, "")

  if (!ORDER_FIELDS.has(field)) {
    return { name: "ASC" }
  }

  return {
    [field]: direction,
  }
}

const buildCompanyListFilters = (
  filterableFields: Record<string, unknown>,
  withDeleted = false,
) => {
  const { q, status: requestedStatus, ...filters } = filterableFields
  delete filters["order_by"]
  const status: CompanyListStatus = (() => {
    if (
      requestedStatus === "active" ||
      requestedStatus === "all" ||
      requestedStatus === "deleted"
    ) {
      return requestedStatus
    }

    return withDeleted ? "all" : "active"
  })()
  const searchTerm = typeof q === "string" ? q.trim() : ""

  if (searchTerm.length > 0) {
    const escapedSearchTerm = escapeLikePattern(searchTerm)

    filters["$or"] = [
      { name: { $ilike: `%${escapedSearchTerm}%` } },
      { email: { $ilike: `%${escapedSearchTerm}%` } },
      { phone: { $ilike: `%${escapedSearchTerm}%` } },
    ]
  }

  if (status === "deleted") {
    filters["deleted_at"] = { $ne: null }
  }

  return {
    filters,
    withDeleted: status !== "active",
  }
}

const getCompanies = async (
  req: AuthenticatedMedusaRequest<unknown, AdminGetCompanyParamsType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { fields, pagination, withDeleted } = req.queryConfig
  const listFilters = buildCompanyListFilters(req.filterableFields, withDeleted)
  const order = parseCompanyOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order,
  )

  const { data: companies, metadata } = await query.graph({
    entity: "companies",
    fields,
    filters: listFilters.filters,
    pagination: {
      ...pagination,
      order,
    },
    withDeleted: listFilters.withDeleted,
  })

  res.json({
    companies,
    count: metadata?.count ?? companies.length,
    limit: metadata?.take ?? companies.length,
    offset: metadata?.skip ?? 0,
  })
}

const createCompanies = async (
  req: AuthenticatedMedusaRequest<
    AdminCreateCompanyType | AdminCreateCompanyType[]
  >,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { result: createdCompanies } = await createCompaniesWorkflow(
    req.scope,
  ).run({
    input: Array.isArray(req.validatedBody)
      ? req.validatedBody.map((company) => definedProperties(company))
      : [definedProperties(req.validatedBody)],
  })

  const { data: companies } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id: createdCompanies.map((company) => company.id) },
    },
    { throwIfKeyNotFound: true },
  )

  res.json({ companies })
}

export { getCompanies as GET }
export { createCompanies as POST }
