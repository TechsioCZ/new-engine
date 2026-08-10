import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { omitUndefined } from "@techsio/std/object"

import { createCompaniesWorkflow } from "../../../workflows/company/workflows/create-companies"
import type { StoreCreateCompanyType } from "./validators"

const post = async (
  req: AuthenticatedMedusaRequest<
    StoreCreateCompanyType | StoreCreateCompanyType[]
  >,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { result: createdCompanies } = await createCompaniesWorkflow(
    req.scope,
  ).run({
    input: Array.isArray(req.validatedBody)
      ? req.validatedBody.map((company) =>
          omitUndefined({
            ...company,
            spending_limit_reset_frequency:
              company.spending_limit_reset_frequency ?? undefined,
          }),
        )
      : [
          omitUndefined({
            ...req.validatedBody,
            spending_limit_reset_frequency:
              req.validatedBody.spending_limit_reset_frequency ?? undefined,
          }),
        ],
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

export { post as POST }
