import type { Link } from "@medusajs/framework/modules-sdk"
import type { ICustomerModuleService, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { COMPANY_MODULE } from "../../../modules/company"
import type { QueryCompanyProjection } from "../../../types/company/query"

interface RemoveCompanyCustomerGroupLinkCompensation {
  company_id: string
  customer_ids: string[]
  group_id?: string
  link_removed?: boolean
}

interface RemoveCompanyCustomerGroupLinkInput {
  company_id: string
  expected_group_id?: string
  preserve_link?: boolean
}

const normalizeInput = (
  input: RemoveCompanyCustomerGroupLinkInput | string,
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

const getCustomerGroupCustomerIds = (
  employees: QueryCompanyProjection["employees"],
): string[] =>
  (employees ?? []).flatMap((employee) => {
    const customerId = employee?.customer?.id
    return customerId !== undefined && customerId.length > 0 ? [customerId] : []
  })

export const removeCompanyCustomerGroupLinkStep = createStep(
  "remove-company-customer-group-link",
  async (
    input: RemoveCompanyCustomerGroupLinkInput | string,
    { container },
  ): Promise<
    StepResponse<undefined, RemoveCompanyCustomerGroupLinkCompensation>
  > => {
    const {
      company_id: companyId,
      expected_group_id: expectedGroupId,
      preserve_link: preserveLink,
    } = normalizeInput(input)
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )

    const companyResult: { data: QueryCompanyProjection[] } = await query.graph(
      {
        entity: "companies",
        fields: [
          "id",
          "customer_group.*",
          "employees.*",
          "employees.customer.*",
        ],
        filters: { id: companyId },
      },
      { throwIfKeyNotFound: true },
    )
    const [company] = companyResult.data

    if (company === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Company ${companyId} was not found`,
      )
    }

    const groupId = company.customer_group?.id

    if (
      expectedGroupId !== undefined &&
      expectedGroupId.length > 0 &&
      groupId !== expectedGroupId
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Company is not linked to the requested customer group.",
      )
    }

    if (typeof groupId !== "string" || groupId.length === 0) {
      return new StepResponse(undefined, {
        company_id: companyId,
        customer_ids: [],
        link_removed: false,
      })
    }

    const customerIds = getCustomerGroupCustomerIds(company.employees)
    const customerGroupCustomers = customerIds.map((customerId) => ({
      customer_group_id: groupId,
      customer_id: customerId,
    }))

    if (customerGroupCustomers.length > 0) {
      await customerModuleService.removeCustomerFromGroup(
        customerGroupCustomers,
      )
    }

    if (preserveLink !== true) {
      await link.dismiss(getCompanyCustomerGroupLink(companyId, groupId))
    }

    return new StepResponse(undefined, {
      company_id: companyId,
      customer_ids: customerGroupCustomers.map(
        ({ customer_id }) => customer_id,
      ),
      group_id: groupId,
      link_removed: preserveLink !== true,
    })
  },
  async (
    input: RemoveCompanyCustomerGroupLinkCompensation | undefined,
    { container },
  ) => {
    if (input?.group_id === undefined || input.group_id.length === 0) {
      return
    }

    const groupId = input.group_id
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )

    if (input.link_removed === true) {
      await link.create(getCompanyCustomerGroupLink(input.company_id, groupId))
    }

    if (input.customer_ids.length > 0) {
      await customerModuleService.addCustomerToGroup(
        input.customer_ids.map((id) => ({
          customer_group_id: groupId,
          customer_id: id,
        })),
      )
    }
  },
)
