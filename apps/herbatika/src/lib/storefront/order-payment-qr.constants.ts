export const ORDER_QR_PAYMENT_PROVIDER_ID = "pp_qr_manual_default"

export const ORDER_PAYMENT_QR_METADATA_KEY = "payment_qr_spayd"

export type StorefrontOrderPaymentQrStatus =
  | "ready"
  | "pending"
  | "not_applicable"
  | "unavailable"
