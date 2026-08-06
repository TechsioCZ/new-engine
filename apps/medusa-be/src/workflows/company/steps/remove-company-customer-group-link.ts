import type { Link } from "@medusajs/framework/modules-sdk"
import type { ICustomerModuleService, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { isRecord } from "@techsio/std/object"

import { COMPANY_MODULE } from "../../../modules/company"

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

const getCustomerGroupCustomerIds = (employees: unknown): string[] => {
  if (!Array.isArray(employees)) {
    return []
  }

  return employees.flatMap((employee) => {
    if (!isRecord(employee)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Company query returned an invalid employee record",
      )
    }
    const { customer } = employee
    if (customer === undefined || customer === null) {
      return []
    }
    if (!isRecord(customer) || typeof customer["id"] !== "string") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Company query returned an invalid employee customer",
      )
    }
    return customer["id"].length > 0 ? [customer["id"]] : []
  })
}

const getGraphData = (result: unknown): unknown[] => {
  if (!isRecord(result) || !Array.isArray(result["data"])) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Company query returned invalid data",
    )
  }
  return result["data"]
}

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

    const companyResult: unknown = await query.graph(
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
    const [company] = getGraphData(companyResult)

    if (company === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Company ${companyId} was not found`,
      )
    }

    if (!isRecord(company)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Company query returned an invalid company record",
      )
    }
    const customerGroup = company["customer_group"]
    const groupId = isRecord(customerGroup) ? customerGroup["id"] : undefined
    if (groupId !== undefined && typeof groupId !== "string") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Company query returned an invalid customer group identifier",
      )
    }

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

    const customerIds = getCustomerGroupCustomerIds(company["employees"])
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
