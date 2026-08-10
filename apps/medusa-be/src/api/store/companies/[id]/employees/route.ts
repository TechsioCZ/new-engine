import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord, omitUndefined, getRecordValue } from "@techsio/std/object"

import { requirePathParam } from "../../../../../utils/path-params"
import { createEmployeesWorkflow } from "../../../../../workflows/employee/workflows/create-employees"
import type {
  StoreCreateEmployeeType,
  StoreGetEmployeeParamsType,
} from "../../validators"

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

  const count = getRecordValue(value, "count")
  const skip = getRecordValue(value, "skip")
  const take = getRecordValue(value, "take")
  return (
    isOptionalNumber(count) && isOptionalNumber(skip) && isOptionalNumber(take)
  )
}

const getCompanyEmployees = (value: unknown): object[] => {
  if (!isRecord(value)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Employee query returned invalid company data.",
    )
  }

  const employees = getRecordValue(value, "employees")
  if (employees === undefined || employees === null) {
    return []
  }
  if (
    !Array.isArray(employees) ||
    employees.some((employee) => employee !== null && !isRecord(employee))
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Employee query returned invalid company employee data.",
    )
  }

  return employees.filter(isRecord)
}

const parseGraphResponse = (value: unknown) => {
  if (!isRecord(value)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Employee query returned an invalid response.",
    )
  }

  const dataValue = getRecordValue(value, "data")
  const metadata = getRecordValue(value, "metadata")
  if (!Array.isArray(dataValue)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Employee query returned an invalid response.",
    )
  }
  const data: unknown[] = dataValue
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
  const [company] = queryResult.data
  const { metadata } = queryResult
  const employees = company === undefined ? [] : getCompanyEmployees(company)

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
  const [employee] = employeeQueryResult.data
  if (employee !== undefined && employee !== null && !isRecord(employee)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Employee query returned invalid employee data.",
    )
  }

  res.json({ employee: employee ?? null })
}

export { get as GET, post as POST }
