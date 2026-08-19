import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  buildCustomerAccountDeactivationUrl,
  createCustomerAccountDeactivationToken,
} from "../../../utils/customer-account-deactivation"
import { resolveCustomerNotificationMarketContext } from "../../../utils/customer-notification-market-context"
import { hasArrayData } from "../../../utils/guards"
import type { NotificationMarketContext } from "../../../utils/notification-market-context"
import { normalizeCustomerName } from "../normalizers"

type PrepareCustomerAccountDeactivationRequestInput = {
  customer_id: string
}

type CustomerRecord = {
  deleted_at?: Date | string | null
  email?: string | null
  first_name?: string | null
  id: string
  last_name?: string | null
}

export type PrepareCustomerAccountDeactivationRequestOutput =
  NotificationMarketContext & {
    confirmation_url: string
    customer_id: string
    customer_name?: string
    email: string
  }

export const prepareCustomerAccountDeactivationRequestStep = createStep(
  "prepare-customer-account-deactivation-request",
  async (
    input: PrepareCustomerAccountDeactivationRequestInput,
    { container }
  ): Promise<StepResponse<PrepareCustomerAccountDeactivationRequestOutput>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const customerResult: unknown = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "last_name", "deleted_at"],
      filters: { id: input.customer_id },
    })

    if (!hasArrayData<CustomerRecord>(customerResult)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Unexpected response shape while loading customer account."
      )
    }

    const [customer] = customerResult.data

    if (!customer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Customer account was not found."
      )
    }

    if (customer.deleted_at) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Customer account is already deactivated."
      )
    }

    const email = customer.email?.trim()

    if (!email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Customer account has no email address."
      )
    }

    const marketContext = await resolveCustomerNotificationMarketContext(
      container,
      { customerId: customer.id, email }
    )
    const salesChannelId = marketContext.sales_channel_id

    if (!salesChannelId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Account deactivation market requires a Sales Channel binding."
      )
    }

    const token = createCustomerAccountDeactivationToken({
      customer_id: customer.id,
      email,
      sales_channel_id: salesChannelId,
    })

    return new StepResponse({
      ...marketContext,
      confirmation_url: buildCustomerAccountDeactivationUrl(
        token,
        marketContext.storefront_base_url,
        marketContext.market_code
      ),
      customer_id: customer.id,
      customer_name: normalizeCustomerName(customer),
      email,
    })
  }
)
