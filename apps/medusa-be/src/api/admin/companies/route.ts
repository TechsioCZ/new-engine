import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createCompaniesWorkflow } from "../../../workflows/company/workflows"
import type {
  AdminCreateCompanyType,
  AdminGetCompanyParamsType,
} from "./validators"

type CompanyListStatus = NonNullable<AdminGetCompanyParamsType["status"]>

const ORDER_FIELDS = new Set(["name", "created_at", "updated_at"])
const LEADING_DASH_REGEX = /^-/
const LIKE_WILDCARD_REGEX = /[%_\\]/g

const escapeLikePattern = (value: string) =>
  value.replace(LIKE_WILDCARD_REGEX, (match) => `\\${match}`)

const parseCompanyOrder = (input?: string) => {
  const value = input ?? "name"
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
  withDeleted?: boolean
) => {
  const {
    order_by: _orderBy,
    q,
    status: requestedStatus,
    ...filters
  } = filterableFields
  const status =
    (requestedStatus as CompanyListStatus | undefined) ??
    (withDeleted ? "all" : "active")
  const searchTerm = typeof q === "string" ? q.trim() : ""

  if (searchTerm) {
    const escapedSearchTerm = escapeLikePattern(searchTerm)

    filters.$or = [
      { name: { $ilike: `%${escapedSearchTerm}%` } },
      { email: { $ilike: `%${escapedSearchTerm}%` } },
      { phone: { $ilike: `%${escapedSearchTerm}%` } },
    ]
  }

  if (status === "deleted") {
    filters.deleted_at = { $ne: null }
  }

  return {
    filters,
    withDeleted: status !== "active",
  }
}

export const GET = async (
  req: AuthenticatedMedusaRequest<unknown, AdminGetCompanyParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { fields, pagination, withDeleted } = req.queryConfig
  const listFilters = buildCompanyListFilters(req.filterableFields, withDeleted)
  const order = parseCompanyOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order
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
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? companies.length,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<
    AdminCreateCompanyType | AdminCreateCompanyType[]
  >,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { result: createdCompanies } = await createCompaniesWorkflow.run({
    input: Array.isArray(req.validatedBody)
      ? req.validatedBody.map((company) => ({ ...company }))
      : [{ ...req.validatedBody }],
    container: req.scope,
  })

  const { data: companies } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id: createdCompanies.map((company) => company.id) },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ companies })
}
