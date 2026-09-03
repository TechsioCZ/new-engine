import { beforeEach, describe, expect, it, vi } from "vitest"

const workflowState = vi.hoisted(() => {
  const notification = { current: {} as unknown }
  const prepared = {
    country_code: "sk",
    confirmation_url: "https://herbatica.sk/ucet/zrusenie-uctu?token=test",
    customer_id: "cus_1",
    customer_name: "Customer",
    email: "customer@example.test",
    locale: "sk-SK",
    market_code: "sk",
    sales_channel_id: "sc_sk",
    storefront_base_url: "https://herbatica.sk",
    storefront_domain: "herbatica.sk",
  }

  return {
    notification,
    prepareCustomerAccountDeactivationRequestStep: vi.fn(() => prepared),
    sendNotificationStep: vi.fn(() => notification.current),
  }
})

vi.mock("@medusajs/framework/workflows-sdk", () => ({
  createWorkflow: vi.fn((_name, composer) => () => ({
    run: vi.fn(async ({ input }) => {
      const response = composer(input)

      return { result: response.result }
    }),
  })),
  transform: vi.fn((input, transformer) => transformer(input)),
  WorkflowResponse: class WorkflowResponse<TPayload> {
    result: TPayload

    constructor(result: TPayload) {
      this.result = result
    }
  },
}))

vi.mock("../../../../../src/workflows/steps/send-notification", () => ({
  sendNotificationStep: workflowState.sendNotificationStep,
}))

vi.mock(
  "../../../../../src/workflows/customer/steps/prepare-customer-account-deactivation-request",
  () => ({
    prepareCustomerAccountDeactivationRequestStep:
      workflowState.prepareCustomerAccountDeactivationRequestStep,
  })
)

describe("requestCustomerAccountDeactivationWorkflow", () => {
  beforeEach(() => {
    workflowState.notification.current = undefined
    workflowState.prepareCustomerAccountDeactivationRequestStep.mockClear()
    workflowState.sendNotificationStep.mockClear()
  })

  it("reports local-provider success without requiring an external id", async () => {
    const { requestCustomerAccountDeactivationWorkflow } = await import(
      "../../../../../src/workflows/customer/workflows/request-customer-account-deactivation"
    )
    workflowState.notification.current = [
      { id: "notification_1", status: "success" },
    ]

    const { result } = await requestCustomerAccountDeactivationWorkflow({}).run(
      { input: { customer_id: "cus_1", sales_channel_id: "sc_sk" } }
    )

    expect(
      workflowState.prepareCustomerAccountDeactivationRequestStep
    ).toHaveBeenCalledWith({
      customer_id: "cus_1",
      sales_channel_id: "sc_sk",
    })
    expect(result).toEqual({
      customer_id: "cus_1",
      email: "customer@example.test",
      sent: true,
    })
    expect(workflowState.sendNotificationStep).toHaveBeenCalledWith([
      {
        channel: "email",
        data: {
          confirmation_url:
            "https://herbatica.sk/ucet/zrusenie-uctu?token=test",
          country_code: "sk",
          customer_id: "cus_1",
          customer_name: "Customer",
          locale: "sk-SK",
          market_code: "sk",
          sales_channel_id: "sc_sk",
          storefront_base_url: "https://herbatica.sk",
          storefront_domain: "herbatica.sk",
        },
        resource_id: "cus_1",
        resource_type: "customer",
        template: "customer-account-deactivation",
        to: "customer@example.test",
        trigger_type: "customer.account_deactivation_requested",
      },
    ])
  })

  it("reports provider failure even when an external id exists", async () => {
    const { requestCustomerAccountDeactivationWorkflow } = await import(
      "../../../../../src/workflows/customer/workflows/request-customer-account-deactivation"
    )
    workflowState.notification.current = [
      { external_id: "external_1", id: "notification_1", status: "failure" },
    ]

    const { result } = await requestCustomerAccountDeactivationWorkflow({}).run(
      { input: { customer_id: "cus_1", sales_channel_id: "sc_sk" } }
    )

    expect(result).toEqual({
      customer_id: "cus_1",
      email: "customer@example.test",
      sent: false,
    })
  })
})
