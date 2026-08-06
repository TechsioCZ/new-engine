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

type NotificationResult = {
  external_id?: unknown
}

function isNotificationResult(value: unknown): value is NotificationResult {
  return typeof value === "object" && value !== null
}

function getNotificationSent(notification: unknown) {
  const notificationResult = Array.isArray(notification)
    ? notification[0]
    : notification

  return (
    isNotificationResult(notificationResult) &&
    typeof notificationResult.external_id === "string" &&
    notificationResult.external_id.length > 0
  )
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
      transform({ notification, prepared }, (data) => ({
        customer_id: data.prepared.customer_id,
        email: data.prepared.email,
        sent: data.prepared.sent && getNotificationSent(data.notification),
      }))
    )
  }
)
