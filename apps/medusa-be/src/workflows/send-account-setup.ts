import type {
  IAuthModuleService,
  ICustomerModuleService,
  Logger,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  generateJwtToken,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import {
  ACCOUNT_SETUP_ORDER_FIELDS,
  ACCOUNT_SETUP_TOKEN_EXPIRES_IN,
  type AccountSetupResult,
  assertAccountSetupOrder,
  buildAccountSetupUrl,
  EMAIL_PASS_PROVIDER,
  ensureEmailPassAuthIdentity,
  getAccountSetupCustomerName,
  getAccountSetupOrderDisplayId,
  getCustomerForAccountSetup,
  isAccountSetupRequested,
} from "../utils/account-setup"
import { didNotificationDeliverySucceed } from "../utils/notification-delivery-status"
import { resolveNotificationMarketContext } from "../utils/notification-market-context"
import { sendNotificationStep } from "./steps/send-notification"

type WorkflowInput = {
  order_id: string
}

type AccountSetupCustomerUpdate = Parameters<
  ICustomerModuleService["updateCustomers"]
>[1] & {
  has_account: boolean
}

type PreparedAccountSetupResult = Omit<AccountSetupResult, "sent"> & {
  delivery_required: boolean
}

export const prepareAccountSetupStep = createStep(
  "prepare-account-setup",
  async (input: WorkflowInput, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )
    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )

    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ACCOUNT_SETUP_ORDER_FIELDS,
      filters: {
        id: input.order_id,
      },
    })

    if (!order) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
    }

    const graphOrder: unknown = order
    assertAccountSetupOrder(graphOrder, "query.graph(order)")

    if (!isAccountSetupRequested(graphOrder.metadata)) {
      return new StepResponse<PreparedAccountSetupResult>({
        delivery_required: false,
        order_id: graphOrder.id,
        skipped_reason: "not_requested",
      })
    }

    const email = graphOrder.email?.trim() || graphOrder.customer?.email?.trim()

    if (!email) {
      logger.warn(
        `Order ${graphOrder.id} has no email; account setup email skipped.`
      )
      return new StepResponse<PreparedAccountSetupResult>({
        delivery_required: false,
        order_id: graphOrder.id,
        skipped_reason: "missing_email",
      })
    }

    const customer = await getCustomerForAccountSetup({
      customerModuleService,
      email,
      order: graphOrder,
    })

    if (customer.has_account) {
      return new StepResponse<PreparedAccountSetupResult>({
        customer_id: customer.id,
        delivery_required: false,
        email,
        order_id: graphOrder.id,
        skipped_reason: "account_exists",
      })
    }

    const jwtSecret = process.env.JWT_SECRET

    if (!jwtSecret) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "JWT_SECRET env var is not set — cannot generate account setup token"
      )
    }

    const token = generateJwtToken(
      {
        actor_type: "customer",
        entity_id: email,
        provider: EMAIL_PASS_PROVIDER,
      },
      {
        expiresIn: ACCOUNT_SETUP_TOKEN_EXPIRES_IN,
        secret: jwtSecret,
      }
    )
    const marketContext = await resolveNotificationMarketContext(container, {
      countryCode:
        graphOrder.shipping_address?.country_code ??
        graphOrder.billing_address?.country_code,
      salesChannelId: graphOrder.sales_channel_id,
    })
    const resetUrl = buildAccountSetupUrl(
      email,
      token,
      marketContext.storefront_base_url
    )

    const authIdentityId = await ensureEmailPassAuthIdentity({
      authModuleService,
      email,
      query,
    })

    await authModuleService.updateAuthIdentities({
      id: authIdentityId,
      app_metadata: {
        customer_id: customer.id,
      },
    })

    return new StepResponse<PreparedAccountSetupResult>({
      ...marketContext,
      customer_id: customer.id,
      customer_name: getAccountSetupCustomerName(graphOrder),
      delivery_required: true,
      email,
      order_display_id: getAccountSetupOrderDisplayId(graphOrder),
      order_id: graphOrder.id,
      reset_url: resetUrl,
    })
  }
)

export const markCustomerHasAccountStep = createStep(
  "mark-customer-has-account",
  async (
    input: { customer_id?: string; delivered: boolean },
    { container }
  ) => {
    if (!(input.delivered && input.customer_id)) {
      return new StepResponse({ skipped: true })
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )
    const customerUpdate: AccountSetupCustomerUpdate = {
      has_account: true,
    }

    await customerModuleService.updateCustomers(
      input.customer_id,
      customerUpdate
    )

    return new StepResponse({ skipped: false })
  }
)

export const sendAccountSetupWorkflow = createWorkflow(
  "send-account-setup",
  (input: WorkflowInput) => {
    const accountSetup = prepareAccountSetupStep(input)
    const notificationInput = transform({ accountSetup }, (data) => {
      if (
        !(
          data.accountSetup.delivery_required &&
          data.accountSetup.email &&
          data.accountSetup.reset_url
        )
      ) {
        return []
      }

      return [
        {
          to: data.accountSetup.email,
          channel: "email",
          template: "account-setup",
          data: {
            country_code: data.accountSetup.country_code,
            customer_id: data.accountSetup.customer_id,
            customer_name: data.accountSetup.customer_name,
            locale: data.accountSetup.locale,
            market_code: data.accountSetup.market_code,
            order_display_id: data.accountSetup.order_display_id,
            reset_url: data.accountSetup.reset_url,
            sales_channel_id: data.accountSetup.sales_channel_id,
            storefront_base_url: data.accountSetup.storefront_base_url,
            storefront_domain: data.accountSetup.storefront_domain,
          },
          resource_id: data.accountSetup.order_id,
          resource_type: "order",
          trigger_type: "order.account_setup_requested",
        },
      ]
    })
    const notification = when(
      accountSetup,
      (preparedResult) =>
        preparedResult.delivery_required &&
        Boolean(preparedResult.email && preparedResult.reset_url)
    ).then(() => sendNotificationStep(notificationInput))
    const markCustomerInput = transform(
      { accountSetup, notification },
      (data) => ({
        customer_id: data.accountSetup.customer_id,
        delivered: didNotificationDeliverySucceed(data.notification),
      })
    )

    markCustomerHasAccountStep(markCustomerInput)

    const workflowResult = transform({ accountSetup, notification }, (data) => {
      const { delivery_required: _deliveryRequired, ...accountSetupResult } =
        data.accountSetup

      return {
        ...accountSetupResult,
        sent: didNotificationDeliverySucceed(data.notification),
      }
    })

    return new WorkflowResponse(workflowResult)
  }
)
