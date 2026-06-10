import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createCompaniesWorkflow } from "../../../workflows/company/workflows"
import type { AdminCreateCompanyType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { fields, pagination, withDeleted } = req.queryConfig

  const { data: companies, metadata } = await query.graph({
    entity: "companies",
    fields,
    filters: req.filterableFields,
    pagination,
    withDeleted,
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
