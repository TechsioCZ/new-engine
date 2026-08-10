import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { RemoteQueryInput } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { omitUndefined } from "@techsio/std/object"

import { createCompaniesWorkflow } from "../../../workflows/company/workflows/create-companies"
import type {
  AdminCreateCompanyType,
  AdminGetCompanyParamsType,
} from "./validators"

type CompanyGraphFilters = NonNullable<RemoteQueryInput<"companies">["filters"]>
type CompanyGraphPagination = NonNullable<
  RemoteQueryInput<"companies">["pagination"]
>
type CompanyGraphOrder = NonNullable<CompanyGraphPagination["order"]>
type CompanyListControls = Pick<AdminGetCompanyParamsType, "q" | "status">
type CompanyListStatus = NonNullable<CompanyListControls["status"]>

const ORDER_FIELDS = new Set(["name", "created_at", "updated_at"])
const LEADING_DASH_REGEX = /^-/u
const LIKE_WILDCARD_REGEX = /[%_\\]/gu

const escapeLikePattern = (value: string) =>
  value.replace(LIKE_WILDCARD_REGEX, (match) => `\\${match}`)

const parseCompanyOrder = (value = "name"): CompanyGraphOrder => {
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
  { q, status: requestedStatus }: CompanyListControls,
  withDeleted = false,
): { filters: CompanyGraphFilters; withDeleted: boolean } => {
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

  const escapedSearchTerm =
    searchTerm.length > 0 ? escapeLikePattern(searchTerm) : undefined
  const filters: CompanyGraphFilters = {
    ...(escapedSearchTerm === undefined
      ? {}
      : {
          $or: [
            { name: { $ilike: `%${escapedSearchTerm}%` } },
            { email: { $ilike: `%${escapedSearchTerm}%` } },
            { phone: { $ilike: `%${escapedSearchTerm}%` } },
          ],
        }),
    ...(status === "deleted" ? { deleted_at: { $ne: null } } : {}),
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
      ? req.validatedBody.map((company) => omitUndefined(company))
      : [omitUndefined(req.validatedBody)],
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
