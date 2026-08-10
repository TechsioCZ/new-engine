import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { omitUndefined } from "@techsio/std/object"

import { requirePathParam } from "../../../../../utils/path-params"
import { createEmployeesWorkflow } from "../../../../../workflows/employee/workflows/create-employees"
import type {
  AdminCreateEmployeeType,
  AdminGetEmployeeParamsType,
} from "../../validators"

const companyQuerySchema = z.object({
  data: z.array(z.object({ employees: z.array(z.unknown()).optional() })),
  metadata: z
    .object({
      count: z.number().optional(),
      skip: z.number().optional(),
      take: z.number().optional(),
    })
    .optional(),
})
const createdEmployeeSchema = z.object({ id: z.string().min(1) })
const employeeQuerySchema = z.object({ data: z.array(z.unknown()) })

const getCompanyEmployees = async (
  req: MedusaRequest<AdminGetEmployeeParamsType>,
  res: MedusaResponse,
) => {
  const id = requirePathParam(req.params["id"], "Company id")
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const companyQueryResult: unknown = await query.graph(
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
  const { data: companies, metadata } =
    companyQuerySchema.parse(companyQueryResult)
  const employees = companies[0]?.employees ?? []

  res.json({
    count: metadata?.count,
    employees,
    limit: metadata?.take,
    offset: metadata?.skip,
  })
}

const createCompanyEmployee = async (
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
      employeeData: omitUndefined({ ...req.validatedBody, company_id: id }),
    },
  })

  const { id: createdEmployeeId } = createdEmployeeSchema.parse(createdEmployee)
  const employeeQueryResult: unknown = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig.fields,
      filters: { id: createdEmployeeId },
    },
    { throwIfKeyNotFound: true },
  )
  const [employee] = employeeQuerySchema.parse(employeeQueryResult).data

  res.json({ employee })
}

export { createCompanyEmployee as POST, getCompanyEmployees as GET }
