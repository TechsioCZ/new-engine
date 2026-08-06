import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord, omitUndefined } from "@techsio/std/object"

import { requirePathParam } from "../../../../../utils/path-params"
import { createEmployeesWorkflow } from "../../../../../workflows/employee/workflows/create-employees"
import type {
  StoreCreateEmployeeType,
  StoreGetEmployeeParamsType,
} from "../../validators"

interface CompanyEmployeesQueryRow {
  employees?: Record<string, unknown>[]
}

interface QueryMetadata {
  count?: number
  skip?: number
  take?: number
}

const isOptionalNumber = (value: unknown) =>
  value === undefined || typeof value === "number"

const isQueryMetadata = (value: unknown): value is QueryMetadata => {
  if (!isRecord(value)) {
    return false
  }

  const { count, skip, take } = value
  return (
    isOptionalNumber(count) && isOptionalNumber(skip) && isOptionalNumber(take)
  )
}

const isCompanyEmployeesQueryRow = (
  value: unknown,
): value is CompanyEmployeesQueryRow => {
  if (!isRecord(value)) {
    return false
  }

  const { employees } = value
  return (
    employees === undefined ||
    (Array.isArray(employees) && employees.every(isRecord))
  )
}

const parseGraphResponse = (value: unknown) => {
  if (!isRecord(value)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Employee query returned an invalid response.",
    )
  }

  const { data, metadata } = value
  if (!Array.isArray(data)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Employee query returned an invalid response.",
    )
  }
  if (metadata !== undefined && !isQueryMetadata(metadata)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Employee query returned invalid pagination metadata.",
    )
  }

  return { data, metadata }
}

const get = async (
  req: AuthenticatedMedusaRequest<StoreGetEmployeeParamsType>,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], "Company id")
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const rawQueryResult: unknown = await query.graph(
    {
      entity: "company",
      fields: [...req.queryConfig.fields, "employees.*"],
      filters: {
        id,
        ...req.filterableFields,
      },
    },
    { throwIfKeyNotFound: true },
  )
  const queryResult = parseGraphResponse(rawQueryResult)
  if (!queryResult.data.every(isCompanyEmployeesQueryRow)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Employee query returned invalid company employee data.",
    )
  }

  const [company] = queryResult.data
  const { metadata } = queryResult
  const employees = company?.employees ?? []

  res.json({
    count: metadata?.count ?? employees.length,
    employees,
    limit: metadata?.take ?? employees.length,
    offset: metadata?.skip ?? 0,
  })
}

const post = async (
  req: AuthenticatedMedusaRequest<StoreCreateEmployeeType>,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], "Company id")
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const { result: createdEmployee } = await createEmployeesWorkflow(
    req.scope,
  ).run({
    input: {
      customerId: req.validatedBody.customer_id,
      employeeData: omitUndefined({
        ...req.validatedBody,
        company_id: id,
        is_admin: req.validatedBody.is_admin ?? undefined,
        spending_limit: req.validatedBody.spending_limit ?? undefined,
      }),
    },
  })

  const rawEmployeeQueryResult: unknown = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig.fields,
      filters: {
        ...req.filterableFields,
        id: createdEmployee.id,
      },
    },
    { throwIfKeyNotFound: true },
  )
  const employeeQueryResult = parseGraphResponse(rawEmployeeQueryResult)
  if (!employeeQueryResult.data.every(isRecord)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Employee query returned invalid employee data.",
    )
  }
  const [employee] = employeeQueryResult.data

  res.json({ employee: employee ?? null })
}

export { get as GET, post as POST }
