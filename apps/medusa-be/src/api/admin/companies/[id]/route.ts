import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { definedProperties } from "../../../../utils/defined-properties"
import { requirePathParam } from "../../../../utils/path-params"
import { deleteCompaniesWorkflow } from "../../../../workflows/company/workflows/delete-companies"
import { updateCompaniesWorkflow } from "../../../../workflows/company/workflows/update-companies"
import type {
  AdminGetCompanyParamsType,
  AdminUpdateCompanyType,
} from "../validators"

const COMPANY_ID_LABEL = "Company id"

const getCompanyFromGraphResult = (result: unknown, id: string) => {
  if (!isRecord(result) || !Array.isArray(result["data"])) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Company query returned an invalid response",
    )
  }
  const company: unknown = result["data"][0]
  if (!isRecord(company)) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Company with id "${id}" was not found`,
    )
  }
  return company
}

const get = async (
  req: AuthenticatedMedusaRequest<AdminGetCompanyParamsType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], COMPANY_ID_LABEL)

  const graphResult: unknown = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
      ...(req.queryConfig.withDeleted === undefined
        ? {}
        : { withDeleted: req.queryConfig.withDeleted }),
    },
    { throwIfKeyNotFound: true },
  )
  const company = getCompanyFromGraphResult(graphResult, id)

  res.json({ company })
}

const post = async (
  req: AuthenticatedMedusaRequest<AdminUpdateCompanyType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], COMPANY_ID_LABEL)
  const workflowInput = {
    id,
    update: definedProperties(req.validatedBody),
  }

  await updateCompaniesWorkflow(req.scope).run({
    input: workflowInput,
  })

  const graphResult: unknown = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )
  const company = getCompanyFromGraphResult(graphResult, id)

  res.json({ company })
}

const remove = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const id = requirePathParam(req.params["id"], COMPANY_ID_LABEL)

  await deleteCompaniesWorkflow(req.scope).run({
    input: {
      id,
    },
  })

  res.status(200).json({
    deleted: true,
    id,
    object: "company",
  })
}

export { remove as DELETE, get as GET, post as POST }
