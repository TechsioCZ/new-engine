import { vi } from "vitest"

import type { PaykitInjectedDependencies } from "../core/base"
import type { PaykitPaymentClient } from "../types"

type MockPaykitClientOverrides = Omit<
  Partial<PaykitPaymentClient>,
  "payments" | "refunds" | "customers"
> & {
  payments?: Partial<PaykitPaymentClient["payments"]>
  refunds?: Partial<NonNullable<PaykitPaymentClient["refunds"]>>
  customers?: Partial<NonNullable<PaykitPaymentClient["customers"]>>
}

type PaykitPayments = PaykitPaymentClient["payments"]
type CancelPayment = NonNullable<PaykitPayments["cancel"]>
type CapturePayment = NonNullable<PaykitPayments["capture"]>
type UpdatePayment = NonNullable<PaykitPayments["update"]>

export const createMockContainer = (): PaykitInjectedDependencies => ({
  resolve: vi.fn<() => unknown>(),
})

export const createMockPaykitClient = (
  overrides: MockPaykitClientOverrides = {},
): PaykitPaymentClient => ({
  customers: {
    create: vi
      .fn<NonNullable<PaykitPaymentClient["customers"]>["create"]>()
      .mockResolvedValue({
        email: "customer@example.com",
        id: "customer-1",
        name: "Customer",
        phone: "",
      }),
    delete: vi
      .fn<NonNullable<PaykitPaymentClient["customers"]>["delete"]>()
      .mockResolvedValue(null),
    retrieve: vi
      .fn<NonNullable<PaykitPaymentClient["customers"]>["retrieve"]>()
      .mockResolvedValue({
        email: "customer@example.com",
        id: "customer-1",
        name: "Customer",
        phone: "",
      }),
    update: vi
      .fn<NonNullable<PaykitPaymentClient["customers"]>["update"]>()
      .mockResolvedValue({
        email: "updated@example.com",
        id: "customer-1",
        name: "Updated",
        phone: "",
      }),
    ...overrides.customers,
  },
  payments: {
    cancel: vi.fn<CancelPayment>().mockResolvedValue({
      id: "provider-payment-1",
      status: "canceled",
    }),
    capture: vi.fn<CapturePayment>().mockResolvedValue({
      id: "provider-payment-1",
      status: "succeeded",
    }),
    create: vi
      .fn<NonNullable<PaykitPaymentClient["payments"]>["create"]>()
      .mockResolvedValue({
        id: "provider-payment-1",
        payment_url: "https://payments.example/1",
        status: "requires_action",
      }),
    retrieve: vi
      .fn<NonNullable<PaykitPaymentClient["payments"]>["retrieve"]>()
      .mockResolvedValue({
        id: "provider-payment-1",
        status: "requires_capture",
      }),
    update: vi.fn<UpdatePayment>().mockResolvedValue({
      id: "provider-payment-1",
      status: "requires_action",
    }),
    ...overrides.payments,
  },
  refunds: {
    create: vi
      .fn<NonNullable<PaykitPaymentClient["refunds"]>["create"]>()
      .mockResolvedValue({
        amount: 250,
        id: "refund-1",
      }),
    ...overrides.refunds,
  },
  ...(overrides.handleWebhook
    ? { handleWebhook: overrides.handleWebhook }
    : {}),
  ...(overrides.stripeCheckoutSessions
    ? { stripeCheckoutSessions: overrides.stripeCheckoutSessions }
    : {}),
})
