import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
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
  const { id } = req.params
  const workflowInput = {
    id,
    update: { ...req.validatedBody },
  }

  await updateCompaniesWorkflow.run({
    input: workflowInput,
    container: req.scope,
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
  const { id } = req.params

  await deleteCompaniesWorkflow.run({
    input: {
      id,
    },
    container: req.scope,
  })

  res.status(200).json({
    id,
    object: "company",
    deleted: true,
  })
}
