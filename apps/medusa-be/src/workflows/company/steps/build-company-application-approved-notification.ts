import type { CreateNotificationDTO } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { resendEmailTemplates } from "../../../modules/resend/templates"

type CompanyApplicationApprovedEmailCompany = {
  email?: string | null
  id: string
  name?: string | null
}

export const buildCompanyApplicationApprovedNotificationStep = createStep(
  "build-company-application-approved-notification",
  async (company: CompanyApplicationApprovedEmailCompany) => {
    if (!company.email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Company ${company.id} does not have an email address.`
      )
    }

    const notification: CreateNotificationDTO = {
      channel: "email",
      data: {
        company_id: company.id,
        company_name: company.name ?? "",
      },
      resource_id: company.id,
      resource_type: "company",
      template: resendEmailTemplates.COMPANY_APPLICATION_APPROVED,
      to: company.email,
      trigger_type: "company.application_approved",
    }

    return new StepResponse([notification])
  }
)
