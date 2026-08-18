import type { CreateNotificationDTO } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { resendEmailTemplates } from "../../../modules/resend/templates"
import { resolveNotificationMarketContext } from "../../../utils/notification-market-context"

type CompanyApplicationRejectedEmailCompany = {
  country?: string | null
  email?: string | null
  id: string
  name?: string | null
}

export const buildCompanyApplicationRejectedNotificationStep = createStep(
  "build-company-application-rejected-notification",
  async (company: CompanyApplicationRejectedEmailCompany, { container }) => {
    if (!company.email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Company ${company.id} does not have an email address.`
      )
    }

    const marketContext = await resolveNotificationMarketContext(container, {
      countryCode: company.country,
    })

    const notification: CreateNotificationDTO = {
      channel: "email",
      data: {
        company_id: company.id,
        company_name: company.name ?? "",
        ...marketContext,
      },
      resource_id: company.id,
      resource_type: "company",
      template: resendEmailTemplates.COMPANY_APPLICATION_REJECTED,
      to: company.email,
      trigger_type: "company.application_rejected",
    }

    return new StepResponse([notification])
  }
)
