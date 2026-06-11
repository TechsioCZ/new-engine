import type { Link } from "@medusajs/framework/modules-sdk"
import type { LinkDefinition } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { APPROVAL_MODULE } from "../../../modules/approval"
import { COMPANY_MODULE } from "../../../modules/company"

const COMPANY_APPROVAL_SETTINGS_LINK_ENTRY_POINT = "company_approval_settings"

type CompanyApprovalSettingsLinkRow = {
  approval_settings_id?: string
  company_id?: string
}

const getCompanyApprovalSettingsLink = (
  companyId: string,
  approvalSettingsId: string
) => ({
  [COMPANY_MODULE]: {
    company_id: companyId,
  },
  [APPROVAL_MODULE]: {
    approval_settings_id: approvalSettingsId,
  },
})

export const dismissCompanyApprovalSettingsLinksStep = createStep(
  "dismiss-company-approval-settings-links",
  async (companyIds: string[], { container }) => {
    if (!companyIds.length) {
      return new StepResponse([], [])
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data: linkRows }: { data: CompanyApprovalSettingsLinkRow[] } =
      await query.graph({
        entity: COMPANY_APPROVAL_SETTINGS_LINK_ENTRY_POINT,
        fields: ["company_id", "approval_settings_id"],
        filters: {
          company_id: companyIds,
        },
      })
    const existingLinks = linkRows
      .filter((linkRow): linkRow is Required<CompanyApprovalSettingsLinkRow> =>
        Boolean(linkRow.company_id && linkRow.approval_settings_id)
      )
      .map((linkRow) =>
        getCompanyApprovalSettingsLink(
          linkRow.company_id,
          linkRow.approval_settings_id
        )
      ) as LinkDefinition[]

    if (existingLinks.length) {
      await link.dismiss(existingLinks)
    }

    return new StepResponse(existingLinks, existingLinks)
  },
  async (existingLinks: LinkDefinition[] | undefined, { container }) => {
    if (!existingLinks?.length) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    await link.create(existingLinks)
  }
)
