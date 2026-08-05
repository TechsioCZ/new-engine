import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { requirePathParam } from "../../../../../utils/path-params"
import { restoreCompaniesWorkflow } from "../../../../../workflows/company/workflows"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Company id")

  await restoreCompaniesWorkflow(req.scope).run({
    input: {
      ids: [id],
    },
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

  res.status(200).json({ company })
}
