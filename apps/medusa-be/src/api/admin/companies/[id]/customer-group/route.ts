import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { requirePathParam } from "../../../../../utils/path-params"
import { addCompanyToCustomerGroupWorkflow } from "../../../../../workflows/company/workflows/add-company-to-customer-group"
import type { AdminAddCompanyToCustomerGroupType } from "../../validators"

const post = async (
  req: AuthenticatedMedusaRequest<AdminAddCompanyToCustomerGroupType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Company id")
  const { group_id } = req.validatedBody

  await addCompanyToCustomerGroupWorkflow(req.scope).run({
    input: { company_id: id, group_id },
  })

  const queryResult: { data: Record<string, unknown>[] } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )
  const [company] = queryResult.data

  res.json({ company: company ?? null })
}

export { post as POST }
