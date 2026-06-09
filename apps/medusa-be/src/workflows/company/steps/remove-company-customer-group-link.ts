import type { Link } from "@medusajs/framework/modules-sdk"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"

type EmployeeWithCustomer = {
  customer?: { id?: string } | null
}

type RemoveCompanyCustomerGroupLinkCompensation = {
  company_id: string
  customer_ids: string[]
  group_id?: string
}

type RemoveCompanyCustomerGroupLinkInput = {
  company_id: string
  expected_group_id?: string
}

const normalizeInput = (
  input: RemoveCompanyCustomerGroupLinkInput | string
): RemoveCompanyCustomerGroupLinkInput =>
  typeof input === "string" ? { company_id: input } : input

const getCompanyCustomerGroupLink = (companyId: string, groupId: string) => ({
  [COMPANY_MODULE]: {
    company_id: companyId,
  },
  [Modules.CUSTOMER]: {
    customer_group_id: groupId,
  },
})

const getCustomerGroupCustomers = (
  employees: EmployeeWithCustomer[] | undefined,
  groupId: string
) =>
  (employees ?? [])
    .filter(
      (
        employee
      ): employee is EmployeeWithCustomer & { customer: { id: string } } =>
        Boolean(employee?.customer?.id)
    )
    .map((employee) => ({
      customer_id: employee.customer.id,
      customer_group_id: groupId,
    }))

export const removeCompanyCustomerGroupLinkStep = createStep(
  "remove-company-customer-group-link",
  async (
    input: RemoveCompanyCustomerGroupLinkInput | string,
    { container }
  ): Promise<
    StepResponse<undefined, RemoveCompanyCustomerGroupLinkCompensation>
  > => {
    const { company_id: companyId, expected_group_id: expectedGroupId } =
      normalizeInput(input)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    const {
      data: [company],
    } = await query.graph(
      {
        entity: "companies",
        filters: { id: companyId },
        fields: [
          "id",
          "customer_group.*",
          "employees.*",
          "employees.customer.*",
        ],
      },
      { throwIfKeyNotFound: true }
    )

    const groupId = company.customer_group?.id

    if (expectedGroupId && groupId !== expectedGroupId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Company is not linked to the requested customer group."
      )
    }

    if (!groupId) {
      return new StepResponse(undefined, {
        company_id: companyId,
        customer_ids: [],
      })
    }

    const customerGroupCustomers = getCustomerGroupCustomers(
      company.employees as EmployeeWithCustomer[] | undefined,
      groupId
    )

    if (customerGroupCustomers.length) {
      await customerModuleService.removeCustomerFromGroup(
        customerGroupCustomers
      )
    }

    await link.dismiss(getCompanyCustomerGroupLink(companyId, groupId))

    return new StepResponse(undefined, {
      company_id: companyId,
      customer_ids: customerGroupCustomers.map(
        ({ customer_id }) => customer_id
      ),
      group_id: groupId,
    })
  },
  async (
    input: RemoveCompanyCustomerGroupLinkCompensation | undefined,
    { container }
  ) => {
    if (!input?.group_id) {
      return
    }

    const groupId = input.group_id
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    await link.create(getCompanyCustomerGroupLink(input.company_id, groupId))

    if (input.customer_ids.length) {
      await customerModuleService.addCustomerToGroup(
        input.customer_ids.map((id) => ({
          customer_id: id,
          customer_group_id: groupId,
        }))
      )
    }
  }
)
