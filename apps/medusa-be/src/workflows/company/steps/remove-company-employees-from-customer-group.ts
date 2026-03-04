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

export const removeCompanyEmployeesFromCustomerGroupStep = createStep(
  "remove-company-employees-from-customer-group",
  async (input: { company_id: string }, { container }) => {
    const query = container.resolve<RemoteQueryFunction>(
      ContainerRegistrationKeys.QUERY
    )

    const { data } = await query.graph({
      entity: "company",
      filters: { id: input.company_id },
      fields: ["id", "customer_group.*", "employees.*", "employees.customer.*"],
    })

    const company = (data as CompanyGroupQueryResult[])[0]

    if (!company) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Company not found")
    }

    const { employees, customer_group } = company

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
          Boolean(employee?.customer?.id) &&
          Boolean(customer_group?.id)
      )
      .map((employee): { customer_id: string; customer_group_id: string } => ({
        customer_id: employee.customer.id,
        customer_group_id: customer_group!.id,
      }))

    await customerModuleService.removeCustomerFromGroup(customerGroupCustomers)

    const { data: refreshedCompanies } = await query.graph(
      {
        entity: "company",
        filters: { id: input.company_id },
        fields: ["*", "customer_group.*"],
      },
      { throwIfKeyNotFound: true }
    )

    const refreshedCompany = (
      refreshedCompanies as Array<{
        customer_group?: CompanyCustomerGroup
      }>
    )[0]

    if (!refreshedCompany?.customer_group?.id) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Customer group not found"
      )
    }

    const newCustomerGroup = refreshedCompany.customer_group

    return new StepResponse(newCustomerGroup, {
      customer_ids: customerGroupCustomers.map((customer) => customer.customer_id),
      group_id: newCustomerGroup!.id,
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

    await customerModuleService.addCustomerToGroup(
      input.customer_ids.map((customerId) => ({
        customer_id: customerId,
        customer_group_id: input.group_id,
      }))
    )
  }
)
