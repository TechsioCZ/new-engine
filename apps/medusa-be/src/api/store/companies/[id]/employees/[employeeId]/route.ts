import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { definedProperties } from "../../../../../../utils/defined-properties"
import { requirePathParam } from "../../../../../../utils/path-params"
import {
  deleteEmployeesWorkflow,
  updateEmployeesWorkflow,
} from "../../../../../../workflows/employee/workflows"
import type {
  StoreGetEmployeeParamsType,
  StoreUpdateEmployeeType,
} from "../../../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest<StoreGetEmployeeParamsType>,
  res: MedusaResponse
) => {
  const id = requirePathParam(req.params["id"], "Company id")
  const employeeId = requirePathParam(req.params["employeeId"], "Employee id")
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
        company_id: id,
        id: employeeId,
      },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ employee })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreUpdateEmployeeType>,
  res: MedusaResponse
) => {
  const id = requirePathParam(req.params["id"], "Company id")
  const employeeId = requirePathParam(req.params["employeeId"], "Employee id")
  const { spending_limit, is_admin } = req.validatedBody
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  await updateEmployeesWorkflow(req.scope).run({
    input: definedProperties({
      company_id: id,
      id: employeeId,
      is_admin,
      spending_limit,
    }),
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
        company_id: id,
        id: employeeId,
      },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ employee })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const id = requirePathParam(req.params["id"], "Company id")
  const employeeId = requirePathParam(req.params["employeeId"], "Employee id")

  await deleteEmployeesWorkflow(req.scope).run({
    input: {
      company_id: id,
      id: employeeId,
    },
  })

  res.json({
    deleted: true,
    id: employeeId,
    object: "employee",
  })
}
