import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { requirePathParam } from "../../../../utils/path-params"
import {
  deleteCompaniesWorkflow,
  updateCompaniesWorkflow,
} from "../../../../workflows/company/workflows/"
import type {
  AdminGetCompanyParamsType,
  AdminUpdateCompanyType,
} from "../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetCompanyParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const {
    data: [company],
  } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
      withDeleted: req.queryConfig.withDeleted,
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ company })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateCompanyType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params.id, "Company id")
  const workflowInput = {
    id,
    update: { ...req.validatedBody },
  }

  await updateCompaniesWorkflow(req.scope).run({
    input: workflowInput,
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
  const id = requirePathParam(req.params.id, "Company id")

  await deleteCompaniesWorkflow(req.scope).run({
    input: {
      id,
    },
  })

  res.status(200).json({
    id,
    object: "company",
    deleted: true,
  })
}
