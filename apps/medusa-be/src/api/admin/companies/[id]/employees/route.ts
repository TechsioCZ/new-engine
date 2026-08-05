import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { definedProperties } from "../../../../../utils/defined-properties"
import { requirePathParam } from "../../../../../utils/path-params"
import { createEmployeesWorkflow } from "../../../../../workflows/employee/workflows"
import type {
  AdminCreateEmployeeType,
  AdminGetEmployeeParamsType,
} from "../../validators"

export const GET = async (
  req: MedusaRequest<AdminGetEmployeeParamsType>,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], "Company id")
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [company],
    metadata,
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
  const employees = company?.employees ?? []

  res.json({
    count: metadata?.count,
    employees,
    limit: metadata?.take,
    offset: metadata?.skip,
  })
}

export const POST = async (
  req: MedusaRequest<AdminCreateEmployeeType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Company id")

  const { result: createdEmployee } = await createEmployeesWorkflow(
    req.scope,
  ).run({
    input: {
      customerId: req.validatedBody.customer_id,
      employeeData: definedProperties({ ...req.validatedBody, company_id: id }),
    },
  })

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig.fields,
      filters: { id: createdEmployee.id },
    },
    { throwIfKeyNotFound: true },
  )

  res.json({ employee })
}
