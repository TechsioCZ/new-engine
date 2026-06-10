import type { Link } from "@medusajs/framework/modules-sdk"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService } from "../../../types"

const COMPANY_CUSTOMER_GROUP_LINK_ENTRY_POINT = "company_customer_group"

type EmployeeWithCustomer = {
  customer?: { id?: string } | null
}

type SetCompanyCustomerGroupInput = {
  company_id: string
  group_id: string
}

type SetCompanyCustomerGroupCompensation = {
  company_id: string
  customer_ids: string[]
  dismissed_deleted_owner_links: Array<{
    company_id: string
    customer_group_id: string
  }>
  new_group_id: string
  previous_group_id?: string
}

const getCompanyCustomerGroupLink = (companyId: string, groupId: string) => ({
  [COMPANY_MODULE]: {
    company_id: companyId,
  },
  [Modules.CUSTOMER]: {
    customer_group_id: groupId,
  },
})

type CompanyCustomerGroupLinkRow = {
  company_id?: string
  customer_group_id?: string
}

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

export const setCompanyCustomerGroupStep = createStep(
  "set-company-customer-group",
  async (
    input: SetCompanyCustomerGroupInput,
    { container }
  ): Promise<
    StepResponse<
      { group_id: string; previous_group_id?: string },
      SetCompanyCustomerGroupCompensation
    >
  > => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    const {
      data: [company],
    } = await query.graph(
      {
        entity: "companies",
        filters: { id: input.company_id },
        fields: [
          "id",
          "customer_group.*",
          "employees.*",
          "employees.customer.*",
        ],
      },
      { throwIfKeyNotFound: true }
    )

    const previousGroupId = company.customer_group?.id
    const previousGroupCustomers = previousGroupId
      ? getCustomerGroupCustomers(
          company.employees as EmployeeWithCustomer[] | undefined,
          previousGroupId
        )
      : []
    const newGroupCustomers = getCustomerGroupCustomers(
      company.employees as EmployeeWithCustomer[] | undefined,
      input.group_id
    )
    const { data: targetGroupLinks } = await query.graph({
      entity: COMPANY_CUSTOMER_GROUP_LINK_ENTRY_POINT,
      fields: ["company_id", "customer_group_id"],
      filters: {
        customer_group_id: input.group_id,
      },
    })
    const targetGroupOwnerIds = [
      ...new Set(
        (targetGroupLinks as CompanyCustomerGroupLinkRow[])
          .map((targetGroupLink) => targetGroupLink.company_id)
          .filter(
            (companyId): companyId is string =>
              typeof companyId === "string" && companyId !== input.company_id
          )
      ),
    ]

    if (targetGroupOwnerIds.length) {
      const targetGroupOwners = await companyModuleService.listCompanies(
        { id: targetGroupOwnerIds },
        {
          select: ["id", "name", "deleted_at"],
          withDeleted: true,
        }
      )
      const activeOwner = targetGroupOwners.find(
        (targetGroupOwner) => !targetGroupOwner.deleted_at
      )

      if (activeOwner) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Customer group is already linked to active company "${activeOwner.name}".`
        )
      }

      await link.dismiss(
        targetGroupOwnerIds.map((ownerId) =>
          getCompanyCustomerGroupLink(ownerId, input.group_id)
        )
      )
    }

    if (previousGroupId && previousGroupId !== input.group_id) {
      if (previousGroupCustomers.length) {
        await customerModuleService.removeCustomerFromGroup(
          previousGroupCustomers
        )
      }

      await link.dismiss(
        getCompanyCustomerGroupLink(input.company_id, previousGroupId)
      )
    }

    if (previousGroupId !== input.group_id) {
      await link.create(
        getCompanyCustomerGroupLink(input.company_id, input.group_id)
      )
    }

    if (newGroupCustomers.length) {
      await customerModuleService.addCustomerToGroup(newGroupCustomers)
    }

    return new StepResponse(
      { group_id: input.group_id, previous_group_id: previousGroupId },
      {
        company_id: input.company_id,
        customer_ids: newGroupCustomers.map(({ customer_id }) => customer_id),
        dismissed_deleted_owner_links: targetGroupOwnerIds.map((ownerId) => ({
          company_id: ownerId,
          customer_group_id: input.group_id,
        })),
        new_group_id: input.group_id,
        previous_group_id: previousGroupId,
      }
    )
  },
  async (
    input: SetCompanyCustomerGroupCompensation | undefined,
    { container }
  ) => {
    if (!input) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    if (input.customer_ids.length) {
      await customerModuleService.removeCustomerFromGroup(
        input.customer_ids.map((id) => ({
          customer_id: id,
          customer_group_id: input.new_group_id,
        }))
      )
    }

    await link.dismiss(
      getCompanyCustomerGroupLink(input.company_id, input.new_group_id)
    )

    if (input.previous_group_id) {
      const previousGroupId = input.previous_group_id

      await link.create(
        getCompanyCustomerGroupLink(input.company_id, previousGroupId)
      )

      if (input.customer_ids.length) {
        await customerModuleService.addCustomerToGroup(
          input.customer_ids.map((id) => ({
            customer_id: id,
            customer_group_id: previousGroupId,
          }))
        )
      }
    }

    if (input.dismissed_deleted_owner_links.length) {
      await link.create(
        input.dismissed_deleted_owner_links.map((dismissedLink) =>
          getCompanyCustomerGroupLink(
            dismissedLink.company_id,
            dismissedLink.customer_group_id
          )
        )
      )
    }
  }
)
