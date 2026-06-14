import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/utils"
import { createEmployeesWorkflow } from "../../../../../workflows/employee/workflows"
import type {
  StoreCreateEmployeeType,
  StoreGetEmployeeParamsType,
} from "../../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetEmployeeParamsType>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [{ employees }],
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
    { throwIfKeyNotFound: true }
  )

  res.json({
    employees,
    count: metadata?.count ?? employees.length,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? employees.length,
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateEmployeeType>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { result: createdEmployee } = await createEmployeesWorkflow.run({
    input: {
      employeeData: {
        ...req.validatedBody,
        company_id: id,
      },
      customerId: req.validatedBody.customer_id,
    },
    container: req.scope,
  })

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig.fields,
      filters: {
        ...req.filterableFields,
        id: createdEmployee.id,
      },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ employee })
}
