import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { requirePathParam } from "../../../../../utils/path-params"
import { addCompanyToCustomerGroupWorkflow } from "../../../../../workflows/company/workflows/"
import type { AdminAddCompanyToCustomerGroupType } from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminAddCompanyToCustomerGroupType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Company id")
  const { group_id } = req.validatedBody

  await addCompanyToCustomerGroupWorkflow(req.scope).run({
    input: { company_id: id, group_id },
  })

  const {
    data: [company],
  } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )

  res.json({ company })
}
