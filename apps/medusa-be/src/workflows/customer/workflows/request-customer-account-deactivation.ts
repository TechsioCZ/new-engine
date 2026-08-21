import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { didNotificationDeliverySucceed } from "../../../utils/notification-delivery-status"
import { sendNotificationStep } from "../../steps/send-notification"
import { prepareCustomerAccountDeactivationRequestStep } from "../steps/prepare-customer-account-deactivation-request"

type RequestCustomerAccountDeactivationWorkflowInput = {
  customer_id: string
  sales_channel_id: string
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
          country_code: data.prepared.country_code,
          confirmation_url: data.prepared.confirmation_url,
          customer_id: data.prepared.customer_id,
          customer_name: data.prepared.customer_name,
          locale: data.prepared.locale,
          market_code: data.prepared.market_code,
          sales_channel_id: data.prepared.sales_channel_id,
          storefront_base_url: data.prepared.storefront_base_url,
          storefront_domain: data.prepared.storefront_domain,
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
        sent: didNotificationDeliverySucceed(data.notification),
      }))
    )
  }
)
