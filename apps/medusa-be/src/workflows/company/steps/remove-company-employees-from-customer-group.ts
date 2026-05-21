import type { ICustomerModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type EmployeeWithCustomer = {
  customer?: { id?: string } | null
}

type CustomerGroupCompensation = {
  customer_ids: string[]
  group_id: string
}

export const removeCompanyEmployeesFromCustomerGroupStep = createStep(
  "remove-company-employees-from-customer-group",
  async (input: { company_id: string }, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [{ employees, customer_group }],
    } = await query.graph({
      entity: "company",
      filters: { id: input.company_id },
      fields: ["id", "customer_group.*", "employees.*", "employees.customer.*"],
    })

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    const customerGroupId = customer_group?.id

    if (!customerGroupId) {
      return new StepResponse(customer_group, {
        customer_ids: [],
        group_id: "",
      })
    }

    const companyEmployees = (employees ?? []) as EmployeeWithCustomer[]
    const customerGroupCustomers = companyEmployees
      .filter(
        (
          employee: EmployeeWithCustomer
        ): employee is EmployeeWithCustomer & {
          customer: { id: string }
        } =>
          Boolean(employee) &&
          Boolean(employee?.customer) &&
          Boolean(employee?.customer?.id)
      )
      .map((employee) => ({
        customer_id: employee.customer.id,
        customer_group_id: customerGroupId,
      }))

    await customerModuleService.removeCustomerFromGroup(customerGroupCustomers)

    const {
      data: [{ customer_group: newCustomerGroup }],
    } = await query.graph(
      {
        entity: "company",
        filters: { id: input.company_id },
        fields: ["*", "customer_group.*"],
      },
      { throwIfKeyNotFound: true }
    )
    const newCustomerGroupId = newCustomerGroup?.id

    if (!newCustomerGroupId) {
      return new StepResponse(newCustomerGroup, {
        customer_ids: customerGroupCustomers.map(
          ({ customer_id }) => customer_id
        ),
        group_id: "",
      })
    }

    return new StepResponse(newCustomerGroup, {
      customer_ids: customerGroupCustomers.map(
        ({ customer_id }) => customer_id
      ),
      group_id: newCustomerGroupId,
    })
  },
  async (input: CustomerGroupCompensation | undefined, { container }) => {
    if (!input) {
      return
    }

    if (!(input.group_id && input.customer_ids.length)) {
      return
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    await customerModuleService.addCustomerToGroup(
      input.customer_ids.map((id) => ({
        customer_id: id,
        customer_group_id: input.group_id,
      }))
    )
  }
)
