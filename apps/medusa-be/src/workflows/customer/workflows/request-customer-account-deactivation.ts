import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { sendNotificationStep } from "../../steps/send-notification"
import { prepareCustomerAccountDeactivationRequestStep } from "../steps/prepare-customer-account-deactivation-request"

type RequestCustomerAccountDeactivationWorkflowInput = {
  customer_id: string
}

export const requestCustomerAccountDeactivationWorkflow = createWorkflow(
  "request-customer-account-deactivation",
  (input: RequestCustomerAccountDeactivationWorkflowInput) => {
    const prepared = prepareCustomerAccountDeactivationRequestStep(input)

    const notificationInput = transform({ prepared }, (data) => [
      {
        to: data.prepared.email,
        channel: "email",
        template: "customer-account-deactivation",
        data: {
          confirmation_url: data.prepared.confirmation_url,
          customer_id: data.prepared.customer_id,
          customer_name: data.prepared.customer_name,
        },
        resource_id: data.prepared.customer_id,
        resource_type: "customer",
        trigger_type: "customer.account_deactivation_requested",
      },
    ])

    const notification = sendNotificationStep(notificationInput)

    return new WorkflowResponse(
      transform({ notification, prepared }, ({ prepared: result }) => ({
        customer_id: result.customer_id,
        email: result.email,
        sent: result.sent,
      }))
    )
  }
)
