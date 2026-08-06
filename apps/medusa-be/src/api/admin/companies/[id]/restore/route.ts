import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { requirePathParam } from "../../../../../utils/path-params"
import { restoreCompaniesWorkflow } from "../../../../../workflows/company/workflows/restore-companies"

const restoreCompany = async (
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

  const graphResult: unknown = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )
  const graphData: unknown = isRecord(graphResult)
    ? graphResult["data"]
    : undefined
  const company: unknown = Array.isArray(graphData) ? graphData[0] : undefined
  if (!isRecord(company)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Restored company ${id} could not be loaded.`,
    )
  }

  res.status(200).json({ company })
}

export { restoreCompany as POST }
