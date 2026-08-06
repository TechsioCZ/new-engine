import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService } from "../../../types"

const COMPANY_CUSTOMER_GROUP_LINK_ENTRY_POINT = "company_customer_group"

interface CompanyCustomerGroupLinkRow {
  company_id?: string
  customer_group_id?: string
}

const isCompanyCustomerGroupLinkRow = (
  value: unknown,
): value is CompanyCustomerGroupLinkRow => {
  if (!isRecord(value)) {
    return false
  }
  if (
    value["company_id"] !== undefined &&
    typeof value["company_id"] !== "string"
  ) {
    return false
  }
  return (
    value["customer_group_id"] === undefined ||
    typeof value["customer_group_id"] === "string"
  )
}

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(toStringArray)
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
  }

  return []
}

const getCompanyCustomerGroupLinks = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const groupIds = [...new Set(toStringArray(req.query["group_id"]))]

  if (groupIds.length === 0) {
    res.json({ customer_group_links: [] })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const companyModuleService =
    req.scope.resolve<ICompanyModuleService>(COMPANY_MODULE)
  const graphResult: unknown = await query.graph({
    entity: COMPANY_CUSTOMER_GROUP_LINK_ENTRY_POINT,
    fields: ["company_id", "customer_group_id"],
    filters: {
      customer_group_id: {
        $in: groupIds,
      },
    },
  })
  if (
    !isRecord(graphResult) ||
    !Array.isArray(graphResult["data"]) ||
    !graphResult["data"].every(isCompanyCustomerGroupLinkRow)
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Company customer-group query returned invalid link data.",
    )
  }
  const linkedRows = graphResult["data"]

  const companyIds = [
    ...new Set(
      linkedRows
        .map((linkedRow) => linkedRow.company_id)
        .filter(
          (companyId): companyId is string =>
            typeof companyId === "string" && companyId.length > 0,
        ),
    ),
  ]

  const companies =
    companyIds.length > 0
      ? await companyModuleService.listCompanies(
          { id: companyIds },
          {
            select: ["id", "name", "deleted_at"],
            withDeleted: true,
          },
        )
      : []
  const companiesById = new Map(
    companies.map((company) => [company.id, company]),
  )
  const customerGroupLinks = linkedRows.flatMap((linkedRow) => {
    if (
      linkedRow.company_id === undefined ||
      linkedRow.company_id.length === 0 ||
      linkedRow.customer_group_id === undefined ||
      linkedRow.customer_group_id.length === 0
    ) {
      return []
    }

    const company = companiesById.get(linkedRow.company_id)

    if (company === undefined) {
      return []
    }

    return [
      {
        company,
        customer_group_id: linkedRow.customer_group_id,
      },
    ]
  })

  res.json({ customer_group_links: customerGroupLinks })
}

export { getCompanyCustomerGroupLinks as GET }
