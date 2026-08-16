import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { ICustomerModuleService, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { sendCustomerRegistrationConfirmationWorkflow } from "../workflows/send-customer-registration-confirmation"

type CustomerCreatedEvent = {
  id: string
}

export default async function customerRegistrationConfirmationHandler({
  event: { data },
  container,
}: SubscriberArgs<CustomerCreatedEvent>) {
  const customerModuleService = container.resolve<ICustomerModuleService>(
    Modules.CUSTOMER
  )
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const customer = await customerModuleService.retrieveCustomer(data.id, {
    select: ["email", "first_name", "last_name"],
  })

  if (!customer.email) {
    logger.warn(
      `Customer ${data.id} has no email; registration confirmation skipped.`
    )
    return
  }

  const customerName = [customer.first_name, customer.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")

  await sendCustomerRegistrationConfirmationWorkflow(container).run({
    input: {
      customer_id: data.id,
      customer_name: customerName || undefined,
      email: customer.email,
    },
  })
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
