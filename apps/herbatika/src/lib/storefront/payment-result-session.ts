export const PAYMENT_RESULT_COOKIE_NAME =
  "__Host-herbatika-payment-result" as const
export const PAYMENT_RESULT_COOKIE_MAX_AGE_SECONDS = 15 * 60

export type PaymentResultProjection = Readonly<{
  cartId: string
  paymentSessionId: string
  providerId: string
  publicOrderId?: string
  status: "authorized" | "cancelled" | "completed" | "pending"
}>
