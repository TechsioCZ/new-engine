import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { requirePathParam } from "../../../../../../utils/path-params"
import {
  deleteEmployeesWorkflow,
  updateEmployeesWorkflow,
} from "../../../../../../workflows/employee/workflows"
import type {
  AdminGetEmployeeParamsType,
  AdminUpdateEmployeeType,
} from "../../../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetEmployeeParamsType>,
  res: MedusaResponse
) => {
  const { id, employeeId } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig?.fields,
      filters: { ...req.filterableFields, company_id: id, id: employeeId },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ employee })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateEmployeeType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params
  const employeeId = requirePathParam(req.params.employeeId, "Employee id")
  const { spending_limit, is_admin } = req.validatedBody

  await updateEmployeesWorkflow(req.scope).run({
    input: {
      id: employeeId,
      company_id: id,
      spending_limit,
      is_admin,
    },
  })

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig?.fields,
      filters: { ...req.filterableFields, company_id: id, id: employeeId },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ employee })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params
  const employeeId = requirePathParam(req.params.employeeId, "Employee id")

  await deleteEmployeesWorkflow(req.scope).run({
    input: {
      id: employeeId,
      company_id: id,
    },
  })

  res.status(200).json({
    id: employeeId,
    object: "employee",
    deleted: true,
  })
}
