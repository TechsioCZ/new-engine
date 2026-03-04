/* istanbul ignore file */
import type { ICustomerModuleService } from "@medusajs/framework/types"
import type { RemoteQueryFunction } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type CompanyEmployee = { customer?: { id?: string | null } | null } | null
type CompanyCustomerGroup = { id: string } | null | undefined
type CompanyGroupQueryResult = {
  customer_group?: CompanyCustomerGroup
  employees: CompanyEmployee[]
}

const isCompanyGroupQueryResult = (
  value: unknown
): value is CompanyGroupQueryResult => {
  if (!value || typeof value !== "object") {
    return false
  }

  if (!("employees" in value) || !Array.isArray(value.employees)) {
    return false
  }

  if (!("customer_group" in value)) {
    return true
  }

  const { customer_group } = value

  if (!customer_group) {
    return true
  }

  return (
    typeof customer_group === "object" &&
    "id" in customer_group &&
    typeof customer_group.id === "string"
  )
}

export const addCompanyEmployeesToCustomerGroupStep = createStep(
  "add-company-employees-to-customer-group",
  async (input: { company_id: string }, { container }) => {
    const query = container.resolve<RemoteQueryFunction>(
      ContainerRegistrationKeys.QUERY
    )

    const { data } = await query.graph(
      {
        entity: "companies",
        filters: { id: input.company_id },
        fields: [
          "*",
          "customer_group.*",
          "employees.*",
          "employees.customer.*",
        ],
      },
      { throwIfKeyNotFound: true }
    )

    const company = data[0]

    if (!isCompanyGroupQueryResult(company)) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Company not found")
    }

    const { customer_group, employees } = company

    if (!customer_group?.id) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Customer group not found"
      )
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )
    const customerGroupCustomers = employees
      .filter(
        (
          employee
        ): employee is typeof employee & {
          customer: { id: string }
        } =>
          Boolean(employee) &&
          Boolean(employee?.customer) &&
          Boolean(employee?.customer?.id)
      )
      .map((employee): { customer_id: string; customer_group_id: string } => ({
        customer_id: employee.customer.id,
        customer_group_id: customer_group.id,
      }))

    await customerModuleService.addCustomerToGroup(customerGroupCustomers)

    return new StepResponse(customer_group, {
      customer_ids: customerGroupCustomers.map((customer) => customer.customer_id),
      group_id: customer_group.id,
    })
  },
  async (input, { container }) => {
    if (
      !input?.group_id ||
      !Array.isArray(input.customer_ids) ||
      input.customer_ids.length === 0
    ) {
      return
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    await customerModuleService.removeCustomerFromGroup(
      input.customer_ids.map((customerId) => ({
        customer_id: customerId,
        customer_group_id: input.group_id,
      }))
    )
  }
)
