import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { definedProperties } from "../../../../utils/defined-properties"
import { requirePathParam } from "../../../../utils/path-params"
import { deleteCompaniesWorkflow } from "../../../../workflows/company/workflows/delete-companies"
import { updateCompaniesWorkflow } from "../../../../workflows/company/workflows/update-companies"
import type {
  StoreGetCompanyParamsType,
  StoreUpdateCompanyType,
} from "../validators"

const COMPANY_ID_LABEL = "Company id"

const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value)

const isCompanyRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  typeof Reflect.get(value, "id") === "string"

const getCompany = async (
  req: AuthenticatedMedusaRequest<StoreGetCompanyParamsType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], COMPANY_ID_LABEL)

  const graphResult: unknown = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )
  const data: unknown =
    typeof graphResult === "object" && graphResult !== null
      ? Reflect.get(graphResult, "data")
      : undefined
  if (!isUnknownArray(data)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Company query returned an invalid result",
    )
  }
  const company: unknown = data[0]
  if (!isCompanyRecord(company)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Company query returned an invalid company",
    )
  }

  res.json({ company })
}

const updateCompany = async (
  req: AuthenticatedMedusaRequest<StoreUpdateCompanyType>,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], COMPANY_ID_LABEL)
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

  const graphResult: unknown = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true },
  )
  const data: unknown =
    typeof graphResult === "object" && graphResult !== null
      ? Reflect.get(graphResult, "data")
      : undefined
  if (!isUnknownArray(data)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Company query returned an invalid result",
    )
  }
  const company: unknown = data[0]
  if (!isCompanyRecord(company)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Company query returned an invalid company",
    )
  }

  res.json({ company })
}

const deleteCompany = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], COMPANY_ID_LABEL)

  await deleteCompaniesWorkflow(req.scope).run({
    input: { id },
    throwOnError: true,
  })

  res.status(204).send()
}

export { deleteCompany as DELETE, getCompany as GET, updateCompany as POST }
