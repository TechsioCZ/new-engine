import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { requirePathParam } from "../../../../../utils/path-params"
import { createEmployeesWorkflow } from "../../../../../workflows/employee/workflows"
import type {
  StoreCreateEmployeeType,
  StoreGetEmployeeParamsType,
} from "../../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetEmployeeParamsType>,
  res: MedusaResponse
) => {
  const id = requirePathParam(req.params.id, "Company id")
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
    { throwIfKeyNotFound: true }
  )
  const employees = company?.employees ?? []

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
  const id = requirePathParam(req.params.id, "Company id")
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { result: createdEmployee } = await createEmployeesWorkflow(
    req.scope
  ).run({
    input: {
      employeeData: {
        ...req.validatedBody,
        spending_limit: req.validatedBody.spending_limit ?? undefined,
        is_admin: req.validatedBody.is_admin ?? undefined,
        company_id: id,
      },
      customerId: req.validatedBody.customer_id,
    },
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
