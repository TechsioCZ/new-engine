import type { ICustomerModuleService, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { isRecord } from "@techsio/std/object"

import { isUnknownArray } from "../../../utils/guards"

const getGraphRecord = (
  result: unknown,
  entity: string,
): Record<string, unknown> | undefined => {
  const data: unknown = isRecord(result) ? result["data"] : undefined
  if (!isUnknownArray(data)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${entity} query returned invalid data`,
    )
  }
  const [record] = data
  if (record === undefined) {
    return undefined
  }
  if (!isRecord(record)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${entity} query returned an invalid record`,
    )
  }
  return record
}

const getNestedId = (
  record: Record<string, unknown>,
  relation: string,
  context: string,
): string => {
  const related = record[relation]
  if (!isRecord(related) || typeof related["id"] !== "string") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${context} query returned an invalid ${relation} relation`,
    )
  }
  return related["id"]
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
    const employee = getGraphRecord(employeeResult, "Employee")

    if (employee === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Employee "${input.employee_id}" was not found`,
      )
    }

    const companyId = getNestedId(employee, "company", "Employee")
    const companyResult: unknown = await query.graph(
      {
        entity: "company",
        fields: ["id", "customer_group.*"],
        filters: { id: companyId },
      },
      { throwIfKeyNotFound: true },
    )
    const company = getGraphRecord(companyResult, "Company")

    if (company === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Company for employee "${input.employee_id}" was not found`,
      )
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )

    const customerGroupValue = company["customer_group"]
    const customerGroupId = isRecord(customerGroupValue)
      ? customerGroupValue["id"]
      : undefined
    if (customerGroupId !== undefined && typeof customerGroupId !== "string") {
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
