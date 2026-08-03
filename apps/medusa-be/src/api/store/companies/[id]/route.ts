import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { definedProperties } from "../../../../utils/defined-properties"
import { requirePathParam } from "../../../../utils/path-params"
import {
  deleteCompaniesWorkflow,
  updateCompaniesWorkflow,
} from "../../../../workflows/company/workflows/"
import type {
  StoreGetCompanyParamsType,
  StoreUpdateCompanyType,
} from "../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetCompanyParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Company id")

  const { data } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ company: data[0] })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreUpdateCompanyType>,
  res: MedusaResponse
) => {
  const id = requirePathParam(req.params["id"], "Company id")
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  await updateCompaniesWorkflow(req.scope).run({
    input: {
      id,
      update: definedProperties({
        ...req.validatedBody,
        spending_limit_reset_frequency:
          req.validatedBody.spending_limit_reset_frequency ?? undefined,
      }),
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
    { throwIfKeyNotFound: true }
  )

  res.json({ company })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const id = requirePathParam(req.params["id"], "Company id")

  await deleteCompaniesWorkflow(req.scope).run({
    input: { id },
    throwOnError: true,
  })

  res.status(204).send()
}
