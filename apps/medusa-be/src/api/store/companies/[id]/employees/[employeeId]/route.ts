import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  deleteEmployeesWorkflow,
  updateEmployeesWorkflow,
} from "../../../../../../workflows/employee/workflows"
import type {
  StoreGetEmployeeParamsType,
  StoreUpdateEmployeeType,
} from "../../../validators"

export const GET = async (
  req: MedusaRequest<StoreGetEmployeeParamsType>,
  res: MedusaResponse
) => {
  const { employeeId } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      // TODO: fix this
      fields: req.queryConfig.fields,
      filters: {
        ...req.filterableFields,
        id: employeeId,
      },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ employee })
}

export const POST = async (
  req: MedusaRequest<StoreUpdateEmployeeType>,
  res: MedusaResponse
) => {
  const { id, employeeId } = req.params
  const { spending_limit, is_admin } = req.validatedBody
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  await updateEmployeesWorkflow.run({
    input: {
      id: employeeId,
      company_id: id,
      spending_limit,
      is_admin,
    },
    container: req.scope,
  })

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      // TODO: fix this
      fields: req.queryConfig.fields,
      filters: {
        ...req.filterableFields,
        id: employeeId,
      },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ employee })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const employeeId = req.params.employeeId

  if (!employeeId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Employee id is required"
    )
  }

  await deleteEmployeesWorkflow.run({
    input: [employeeId],
    container: req.scope,
  })

  res.json({
    id: employeeId,
    object: "employee",
    deleted: true,
  })
}
