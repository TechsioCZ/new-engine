export const resendEmailTemplates = {
  FORGOT_PASSWORD: "user-forgotpwd",
  ORDER_PLACED: "order-placed",
  ORDER_PAYMENT_REMINDER: "order-payment-reminder",
} as const

export type ResendEmailTemplate =
  (typeof resendEmailTemplates)[keyof typeof resendEmailTemplates]
