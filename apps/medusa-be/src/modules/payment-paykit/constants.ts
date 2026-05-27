export const PAYKIT_PAYMENT_PROVIDER_IDENTIFIER = "paykit"
export const PAYKIT_GOPAY_PROVIDER_ID = "gopay"
export const PAYKIT_STRIPE_PROVIDER_ID = "stripe"
export const PAYKIT_COMGATE_PROVIDER_ID = "comgate"

// Medusa's payment webhook handler prepends `pp_` to this event provider,
// so `paykit_gopay` resolves to the registered provider `pp_paykit_gopay`.
export const PAYKIT_GOPAY_WEBHOOK_PROVIDER_ID = "paykit_gopay"
export const PAYKIT_GOPAY_WEBHOOK_PATH = "/hooks/payment/paykit_gopay"
