import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { omitUndefined } from "@techsio/std/object"

import { requirePathParam } from "../../../../../utils/path-params"
import { createEmployeesWorkflow } from "../../../../../workflows/employee/workflows/create-employees"
import type {
  StoreCreateEmployeeType,
  StoreGetEmployeeParamsType,
} from "../../validators"

interface CompanyEmployeesQueryRow {
  employees?: Record<string, unknown>[]
}

const get = async (
  req: AuthenticatedMedusaRequest<StoreGetEmployeeParamsType>,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], "Company id")
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const queryResult: {
    data: CompanyEmployeesQueryRow[]
    metadata?: { count?: number; skip?: number; take?: number }
  } = await query.graph(
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

  const employeeQueryResult: { data: Record<string, unknown>[] } =
    await query.graph(
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
  const [employee] = employeeQueryResult.data

  res.json({ employee: employee ?? null })
}

export { get as GET, post as POST }
