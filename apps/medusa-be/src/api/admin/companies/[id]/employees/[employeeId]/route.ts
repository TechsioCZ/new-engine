import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { definedProperties } from "../../../../../../utils/defined-properties"
import { requirePathParam } from "../../../../../../utils/path-params"
import { deleteEmployeesWorkflow } from "../../../../../../workflows/employee/workflows/delete-employees"
import { updateEmployeesWorkflow } from "../../../../../../workflows/employee/workflows/update-employees"
import type {
  AdminGetEmployeeParamsType,
  AdminUpdateEmployeeType,
} from "../../../validators"

const COMPANY_ID_LABEL = "Company id"
const EMPLOYEE_ID_LABEL = "Employee id"

const getEmployeeFromGraphResult = (
  result: unknown,
): Record<string, unknown> | undefined => {
  if (!isRecord(result) || !Array.isArray(result["data"])) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Employee query returned an invalid data payload",
    )
  }

  const records: unknown[] = result["data"]
  const [employee] = records
  if (employee === undefined) {
    return undefined
  }
  if (!isRecord(employee)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Employee query returned a non-object employee",
    )
  }

  return employee
}

const getEmployee = async (
  req: AuthenticatedMedusaRequest<AdminGetEmployeeParamsType>,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], COMPANY_ID_LABEL)
  const employeeId = requirePathParam(
    req.params["employeeId"],
    EMPLOYEE_ID_LABEL,
  )
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  const result: unknown = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig?.fields,
      filters: { ...req.filterableFields, company_id: id, id: employeeId },
    },
    { throwIfKeyNotFound: true },
  )
  const employee = getEmployeeFromGraphResult(result)

  res.json({ employee })
}

const updateEmployee = async (
  req: AuthenticatedMedusaRequest<AdminUpdateEmployeeType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], COMPANY_ID_LABEL)
  const employeeId = requirePathParam(
    req.params["employeeId"],
    EMPLOYEE_ID_LABEL,
  )
  const { spending_limit, is_admin } = req.validatedBody

  await updateEmployeesWorkflow(req.scope).run({
    input: definedProperties({
      company_id: id,
      id: employeeId,
      is_admin,
      spending_limit,
    }),
  })

  const result: unknown = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig?.fields,
      filters: { ...req.filterableFields, company_id: id, id: employeeId },
    },
    { throwIfKeyNotFound: true },
  )
  const employee = getEmployeeFromGraphResult(result)

  res.json({ employee })
}

const deleteEmployee = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], COMPANY_ID_LABEL)
  const employeeId = requirePathParam(
    req.params["employeeId"],
    EMPLOYEE_ID_LABEL,
  )

  await deleteEmployeesWorkflow(req.scope).run({
    input: {
      company_id: id,
      id: employeeId,
    },
  })

  res.status(200).json({
    deleted: true,
    id: employeeId,
    object: "employee",
  })
}

export { deleteEmployee as DELETE, getEmployee as GET, updateEmployee as POST }
