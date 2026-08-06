import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { definedProperties } from "../../../../../../utils/defined-properties"
import { requirePathParam } from "../../../../../../utils/path-params"
import { deleteEmployeesWorkflow } from "../../../../../../workflows/employee/workflows/delete-employees"
import { updateEmployeesWorkflow } from "../../../../../../workflows/employee/workflows/update-employees"
import type {
  StoreGetEmployeeParamsType,
  StoreUpdateEmployeeType,
} from "../../../validators"

const COMPANY_ID_LABEL = "Company id"
const EMPLOYEE_ID_LABEL = "Employee id"

const getEmployee = async (
  query: Query,
  fieldsValue: unknown,
  filterableFieldsValue: unknown,
  companyId: string,
  employeeId: string,
): Promise<unknown> => {
  const fields =
    Array.isArray(fieldsValue) &&
    fieldsValue.every((field) => typeof field === "string")
      ? fieldsValue
      : []
  const filterableFields = isRecord(filterableFieldsValue)
    ? filterableFieldsValue
    : {}
  const graphResult: unknown = await query.graph(
    {
      entity: "employee",
      fields,
      filters: {
        ...filterableFields,
        company_id: companyId,
        id: employeeId,
      },
    },
    { throwIfKeyNotFound: true },
  )

  return isRecord(graphResult) && Array.isArray(graphResult["data"])
    ? graphResult["data"][0]
    : undefined
}

const getEmployeeRoute = async (
  req: AuthenticatedMedusaRequest<StoreGetEmployeeParamsType>,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], COMPANY_ID_LABEL)
  const employeeId = requirePathParam(
    req.params["employeeId"],
    EMPLOYEE_ID_LABEL,
  )
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const employee = await getEmployee(
    query,
    req.queryConfig.fields,
    req.filterableFields,
    id,
    employeeId,
  )

  res.json({ employee })
}

const postEmployeeRoute = async (
  req: AuthenticatedMedusaRequest<StoreUpdateEmployeeType>,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], COMPANY_ID_LABEL)
  const employeeId = requirePathParam(
    req.params["employeeId"],
    EMPLOYEE_ID_LABEL,
  )
  const { spending_limit, is_admin } = req.validatedBody
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)

  await updateEmployeesWorkflow(req.scope).run({
    input: definedProperties({
      company_id: id,
      id: employeeId,
      is_admin,
      spending_limit,
    }),
  })

  const employee = await getEmployee(
    query,
    req.queryConfig.fields,
    req.filterableFields,
    id,
    employeeId,
  )

  res.json({ employee })
}

const deleteEmployeeRoute = async (
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

  res.json({
    deleted: true,
    id: employeeId,
    object: "employee",
  })
}

export {
  deleteEmployeeRoute as DELETE,
  getEmployeeRoute as GET,
  postEmployeeRoute as POST,
}
