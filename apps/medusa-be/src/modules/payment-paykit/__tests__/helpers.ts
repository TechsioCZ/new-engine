import { vi } from "vitest"
import type { PaykitPaymentClient } from "../types"

type MockPaykitClientOverrides = Omit<
  Partial<PaykitPaymentClient>,
  "payments" | "refunds"
> & {
  payments?: Partial<PaykitPaymentClient["payments"]>
  refunds?: Partial<NonNullable<PaykitPaymentClient["refunds"]>>
}

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
  handleWebhook: overrides.handleWebhook,
})
