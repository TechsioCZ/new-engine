import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { isUnknownArray } from "../../../utils/guards"
import { sendNotificationStep } from "../../steps/send-notification"
import { prepareCustomerAccountDeactivationRequestStep } from "../steps/prepare-customer-account-deactivation-request"

interface RequestCustomerAccountDeactivationWorkflowInput {
  customer_id: string
}

interface NotificationResult {
  external_id?: unknown
}

const isNotificationResult = (value: unknown): value is NotificationResult =>
  typeof value === "object" && value !== null

const getNotificationSent = (notification: unknown): boolean => {
  const notificationResult: unknown = isUnknownArray(notification)
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
        channel: "email",
        data: {
          confirmation_url: data.prepared.confirmation_url,
          customer_id: data.prepared.customer_id,
          customer_name: data.prepared.customer_name,
        },
        resource_id: data.prepared.customer_id,
        resource_type: "customer",
        template: "customer-account-deactivation",
        to: data.prepared.email,
        trigger_type: "customer.account_deactivation_requested",
      },
    ])

    const notification = sendNotificationStep(notificationInput)

    return new WorkflowResponse(
      transform({ notification, prepared }, (data) => ({
        customer_id: data.prepared.customer_id,
        email: data.prepared.email,
        sent: data.prepared.sent && getNotificationSent(data.notification),
      })),
    )
  },
)
