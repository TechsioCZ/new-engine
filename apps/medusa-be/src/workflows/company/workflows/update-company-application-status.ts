import {
  createWorkflow,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import {
  ModuleCompanyApplicationStatus,
  type ModuleCompanyApplicationStatus as ModuleCompanyApplicationStatusType,
} from "../../../types"
import { sendNotificationStep } from "../../steps/send-notification"
import {
  buildCompanyApplicationApprovedNotificationStep,
  buildCompanyApplicationRejectedNotificationStep,
  updateCompanyApplicationStatusStep,
  validateCompanyActiveStep,
} from "../steps"

type UpdateCompanyApplicationStatusWorkflowInput = {
  id: string
  status: ModuleCompanyApplicationStatusType
}

export const updateCompanyApplicationStatusWorkflow = createWorkflow(
  "update-company-application-status",
  (input: UpdateCompanyApplicationStatusWorkflowInput) => {
    validateCompanyActiveStep(input.id)

    const company = updateCompanyApplicationStatusStep(input)
    const isApproved = transform(
      input,
      (data) => data.status === ModuleCompanyApplicationStatus.APPROVED
    )
    const isRejected = transform(
      input,
      (data) => data.status === ModuleCompanyApplicationStatus.REJECTED
    )

    when(isApproved, (approved) => approved).then(() => {
      sendNotificationStep(
        buildCompanyApplicationApprovedNotificationStep(company)
      ).config({ name: "send-company-application-approved-notification" })
    })

    when(isRejected, (rejected) => rejected).then(() => {
      sendNotificationStep(
        buildCompanyApplicationRejectedNotificationStep(company)
      ).config({ name: "send-company-application-rejected-notification" })
    })

    return new WorkflowResponse(company)
  }
)
