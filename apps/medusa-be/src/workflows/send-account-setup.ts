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
} from "@medusajs/framework/workflows-sdk"

import {
  ACCOUNT_SETUP_ORDER_FIELDS,
  ACCOUNT_SETUP_TOKEN_EXPIRES_IN,
  buildAccountSetupUrl,
  EMAIL_PASS_PROVIDER,
  ensureEmailPassAuthIdentity,
  getAccountSetupCustomerName,
  getAccountSetupOrderDisplayId,
  getCustomerForAccountSetup,
  isAccountSetupRequested,
} from "../utils/account-setup"
import type { AccountSetupResult } from "../utils/account-setup"
import { sendNotificationStep } from "./steps/send-notification"

interface WorkflowInput {
  order_id: string
}

type AccountSetupCustomerUpdate = Parameters<
  ICustomerModuleService["updateCustomers"]
>[1] & {
  has_account: boolean
}

const prepareAccountSetupStep = createStep(
  "prepare-account-setup",
  async (
    input: WorkflowInput,
    { container },
  ): Promise<StepResponse<AccountSetupResult>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )
    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH,
    )

    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ACCOUNT_SETUP_ORDER_FIELDS,
      filters: {
        id: input.order_id,
      },
      pagination: { take: 1 },
    })

    if (order === undefined) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Order was not found")
    }

    const graphOrder = order

    if (!isAccountSetupRequested(graphOrder.metadata)) {
      return new StepResponse<AccountSetupResult>({
        order_id: graphOrder.id,
        sent: false,
        skipped_reason: "not_requested",
      })
    }

    const orderEmail = graphOrder.email?.trim()
    const customerEmail = graphOrder.customer?.email?.trim()
    const email =
      orderEmail !== undefined && orderEmail.length > 0
        ? orderEmail
        : customerEmail

    if (email === undefined || email.length === 0) {
      logger.warn(
        `Order ${graphOrder.id} has no email; account setup email skipped.`,
      )
      return new StepResponse<AccountSetupResult>({
        order_id: graphOrder.id,
        sent: false,
        skipped_reason: "missing_email",
      })
    }

    const customer = await getCustomerForAccountSetup({
      customerModuleService,
      email,
      order: graphOrder,
    })

    if (customer.has_account === true) {
      return new StepResponse<AccountSetupResult>({
        customer_id: customer.id,
        email,
        order_id: graphOrder.id,
        sent: false,
        skipped_reason: "account_exists",
      })
    }

    const jwtSecret = process.env["JWT_SECRET"]

    if (jwtSecret === undefined || jwtSecret.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "JWT_SECRET env var is not set — cannot generate account setup token",
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
      },
    )
    const resetUrl = buildAccountSetupUrl(email, token)

    const authIdentityId = await ensureEmailPassAuthIdentity({
      authModuleService,
      email,
      query,
    })

    await authModuleService.updateAuthIdentities({
      app_metadata: {
        customer_id: customer.id,
      },
      id: authIdentityId,
    })

    return new StepResponse<AccountSetupResult>({
      customer_id: customer.id,
      customer_name: getAccountSetupCustomerName(graphOrder),
      email,
      order_display_id: getAccountSetupOrderDisplayId(graphOrder),
      order_id: graphOrder.id,
      reset_url: resetUrl,
      sent: true,
    })
  },
)

const markCustomerHasAccountStep = createStep(
  "mark-customer-has-account",
  async (
    input: { customer_id?: string | undefined; sent: boolean },
    { container },
  ) => {
    if (
      !input.sent ||
      input.customer_id === undefined ||
      input.customer_id.length === 0
    ) {
      return new StepResponse({ skipped: true })
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )
    const customerUpdate: AccountSetupCustomerUpdate = {
      has_account: true,
    }

    await customerModuleService.updateCustomers(
      input.customer_id,
      customerUpdate,
    )

    return new StepResponse({ skipped: false })
  },
)

export const sendAccountSetupWorkflow = createWorkflow(
  "send-account-setup",
  (input: WorkflowInput) => {
    const accountSetup = prepareAccountSetupStep(input)
    const notificationInput = transform({ accountSetup }, (data) => {
      const { email, reset_url: resetUrl, sent } = data.accountSetup
      const hasEmail = email !== undefined && email.length > 0
      const hasResetUrl = resetUrl !== undefined && resetUrl.length > 0

      if (!sent || !hasEmail || !hasResetUrl) {
        return []
      }

      return [
        {
          channel: "email",
          data: {
            customer_id: data.accountSetup.customer_id,
            customer_name: data.accountSetup.customer_name,
            order_display_id: data.accountSetup.order_display_id,
            reset_url: resetUrl,
          },
          resource_id: data.accountSetup.order_id,
          resource_type: "order",
          template: "account-setup",
          to: email,
          trigger_type: "order.account_setup_requested",
        },
      ]
    })
    const notification = sendNotificationStep(notificationInput)
    const markCustomerInput = transform(
      { accountSetup, notification },
      (data) => ({
        customer_id: data.accountSetup.customer_id,
        sent: data.accountSetup.sent,
      }),
    )

    markCustomerHasAccountStep(markCustomerInput)

    return new WorkflowResponse(accountSetup)
  },
)
