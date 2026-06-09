import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService } from "../../../types"

const COMPANY_CUSTOMER_GROUP_LINK_ENTRY_POINT = "company_customer_group"

type CompanyCustomerGroupLinkRow = {
  company_id?: string
  customer_group_id?: string
}

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(toStringArray)
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const groupIds = [...new Set(toStringArray(req.query.group_id))]

  if (!groupIds.length) {
    res.json({ customer_group_links: [] })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const companyModuleService =
    req.scope.resolve<ICompanyModuleService>(COMPANY_MODULE)
  const { data } = await query.graph({
    entity: COMPANY_CUSTOMER_GROUP_LINK_ENTRY_POINT,
    fields: ["company_id", "customer_group_id"],
    filters: {
      customer_group_id: {
        $in: groupIds,
      },
    },
  })
  const linkedRows = data as CompanyCustomerGroupLinkRow[]

  const companyIds = [
    ...new Set(
      linkedRows
        .map((linkedRow) => linkedRow.company_id)
        .filter((companyId): companyId is string => Boolean(companyId))
    ),
  ]

  const companies = companyIds.length
    ? await companyModuleService.listCompanies(
        { id: companyIds },
        {
          select: ["id", "name", "deleted_at"],
          withDeleted: true,
        }
      )
    : []
  const companiesById = new Map(
    companies.map((company) => [company.id, company])
  )
  const customerGroupLinks = linkedRows.flatMap((linkedRow) => {
    if (!(linkedRow.company_id && linkedRow.customer_group_id)) {
      return []
    }

    const company = companiesById.get(linkedRow.company_id)

    if (!company) {
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
