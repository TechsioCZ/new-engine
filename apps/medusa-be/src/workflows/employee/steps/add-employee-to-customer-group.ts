import type { ICustomerModuleService, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"

const employeeQuerySchema = z.object({
  data: z.array(z.object({ company: z.unknown() })),
})
const companyQuerySchema = z.object({
  data: z.array(z.object({ customer_group: z.unknown().optional() })),
})
const relatedIdSchema = z.object({ id: z.string() })

const getRelatedId = (
  value: unknown,
  relation: string,
  context: string,
): string => {
  const parsed = relatedIdSchema.safeParse(value)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${context} query returned an invalid ${relation} relation`,
    )
  }
  return parsed.data.id
}

export const addEmployeeToCustomerGroupStep = createStep(
  "add-employee-to-customer-group",
  async (
    input: { customer_id: string; employee_id: string },
    { container },
  ) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const employeeResult: unknown = await query.graph(
      {
        entity: "employee",
        fields: ["id", "company.*"],
        filters: { id: input.employee_id },
      },
      { throwIfKeyNotFound: true },
    )
    const parsedEmployeeResult = employeeQuerySchema.safeParse(employeeResult)
    if (!parsedEmployeeResult.success) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Employee query returned invalid data",
      )
    }
    const [employee] = parsedEmployeeResult.data.data

    if (employee === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Employee "${input.employee_id}" was not found`,
      )
    }

    const companyId = getRelatedId(employee.company, "company", "Employee")
    const companyResult: unknown = await query.graph(
      {
        entity: "company",
        fields: ["id", "customer_group.*"],
        filters: { id: companyId },
      },
      { throwIfKeyNotFound: true },
    )
    const parsedCompanyResult = companyQuerySchema.safeParse(companyResult)
    if (!parsedCompanyResult.success) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Company query returned invalid data",
      )
    }
    const [company] = parsedCompanyResult.data.data

    if (company === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Company for employee "${input.employee_id}" was not found`,
      )
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )

    const customerGroupRelation = relatedIdSchema.safeParse(
      company.customer_group,
    )
    const customerGroupId = customerGroupRelation.success
      ? customerGroupRelation.data.id
      : undefined
    if (
      company.customer_group !== undefined &&
      !customerGroupRelation.success
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Company query returned an invalid customer group identifier",
      )
    }

    if (
      input.customer_id.length === 0 ||
      typeof customerGroupId !== "string" ||
      customerGroupId.length === 0
    ) {
      return new StepResponse(null, {
        customer_id: input.customer_id,
        group_id:
          typeof customerGroupId === "string" ? customerGroupId : undefined,
      })
    }

    await customerModuleService.addCustomerToGroup({
      customer_group_id: customerGroupId,
      customer_id: input.customer_id,
    })

    const customerGroup =
      await customerModuleService.retrieveCustomerGroup(customerGroupId)

    return new StepResponse(customerGroup, {
      customer_id: input.customer_id,
      group_id: customerGroupId,
    })
  },
  async (
    input:
      | { customer_id: string | undefined; group_id: string | undefined }
      | undefined,
    { container },
  ) => {
    if (
      input?.customer_id === undefined ||
      input.customer_id.length === 0 ||
      input.group_id === undefined ||
      input.group_id.length === 0
    ) {
      return
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )

    await customerModuleService.removeCustomerFromGroup({
      customer_group_id: input.group_id,
      customer_id: input.customer_id,
    })
  },
)
