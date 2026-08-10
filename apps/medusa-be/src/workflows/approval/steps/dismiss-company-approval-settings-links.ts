import type { Link } from "@medusajs/framework/modules-sdk"
import type { LinkDefinition, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { APPROVAL_MODULE } from "../../../modules/approval"
import { COMPANY_MODULE } from "../../../modules/company"

const COMPANY_APPROVAL_SETTINGS_LINK_ENTRY_POINT = "company_approval_settings"

interface CompanyApprovalSettingsLinkRow {
  approval_settings_id?: string
  company_id?: string
}

const getCompanyApprovalSettingsLink = (
  companyId: string,
  approvalSettingsId: string,
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
    if (companyIds.length === 0) {
      return new StepResponse([], [])
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const { data: linkRows }: { data: CompanyApprovalSettingsLinkRow[] } =
      await query.graph({
        entity: COMPANY_APPROVAL_SETTINGS_LINK_ENTRY_POINT,
        fields: ["company_id", "approval_settings_id"],
        filters: {
          company_id: companyIds,
        },
      })
    const existingLinks: LinkDefinition[] = linkRows
      .filter(
        (linkRow): linkRow is Required<CompanyApprovalSettingsLinkRow> =>
          linkRow.company_id !== undefined &&
          linkRow.company_id.length > 0 &&
          linkRow.approval_settings_id !== undefined &&
          linkRow.approval_settings_id.length > 0,
      )
      .map((linkRow) =>
        getCompanyApprovalSettingsLink(
          linkRow.company_id,
          linkRow.approval_settings_id,
        ),
      )

    if (existingLinks.length > 0) {
      await link.dismiss(existingLinks)
    }

    return new StepResponse(existingLinks, existingLinks)
  },
  async (existingLinks: LinkDefinition[] | undefined, { container }) => {
    if (existingLinks === undefined || existingLinks.length === 0) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    await link.create(existingLinks)
  },
)
