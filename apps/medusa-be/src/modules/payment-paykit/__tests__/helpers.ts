import { vi } from "vitest"
import type { PaykitInjectedDependencies } from "../base"
import type { PaykitPaymentClient } from "../types"

type MockPaykitClientOverrides = Omit<
  Partial<PaykitPaymentClient>,
  "payments" | "refunds"
> & {
  payments?: Partial<PaykitPaymentClient["payments"]>
  refunds?: Partial<NonNullable<PaykitPaymentClient["refunds"]>>
  customers?: Partial<NonNullable<PaykitPaymentClient["customers"]>>
}

export const createMockContainer = (): PaykitInjectedDependencies => ({
  resolve: vi.fn(),
})

export const createMockPaykitClient = (
  overrides: MockPaykitClientOverrides = {}
): PaykitPaymentClient => ({
  payments: {
    create: vi.fn().mockResolvedValue({
      id: "provider-payment-1",
      status: "requires_action",
      payment_url: "https://payments.example/1",
    }),
    retrieve: vi.fn().mockResolvedValue({
      id: "provider-payment-1",
      status: "requires_capture",
    }),
    update: vi.fn().mockResolvedValue({
      id: "provider-payment-1",
      status: "requires_action",
    }),
    capture: vi.fn().mockResolvedValue({
      id: "provider-payment-1",
      status: "succeeded",
    }),
    cancel: vi.fn().mockResolvedValue({
      id: "provider-payment-1",
      status: "canceled",
    }),
    ...overrides.payments,
  },
  refunds: {
    create: vi.fn().mockResolvedValue({
      id: "refund-1",
      payment_id: "provider-payment-1",
      amount: 250,
    }),
    ...overrides.refunds,
  },
  customers: {
    create: vi.fn().mockResolvedValue({
      id: "customer-1",
      email: "customer@example.com",
      name: "Customer",
      phone: "",
    }),
    update: vi.fn().mockResolvedValue({
      id: "customer-1",
      email: "updated@example.com",
      name: "Updated",
      phone: "",
    }),
    retrieve: vi.fn().mockResolvedValue({
      id: "customer-1",
      email: "customer@example.com",
      name: "Customer",
      phone: "",
    }),
    delete: vi.fn().mockResolvedValue(null),
    ...overrides.customers,
  },
  handleWebhook: overrides.handleWebhook,
})
