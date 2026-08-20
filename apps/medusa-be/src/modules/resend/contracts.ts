export const resendEmailLocales = ["sk-SK", "cs-CZ", "hu-HU", "ro-RO"] as const

export type ResendEmailLocale = (typeof resendEmailLocales)[number]

export const resendEmailTemplates = {
  ACCOUNT_SETUP: "account-setup",
  COMPANY_APPLICATION_APPROVED: "company-application-approved",
  COMPANY_APPLICATION_REJECTED: "company-application-rejected",
  CLAIM_ACCESS_CODE: "claim-access-code",
  CLAIM_CONFIRMATION: "claim-confirmation",
  CUSTOMER_ACCOUNT_DEACTIVATION: "customer-account-deactivation",
  CUSTOMER_REGISTRATION_CONFIRMATION: "customer-registration-confirmation",
  FORGOT_PASSWORD: "user-forgotpwd",
  ORDER_PLACED: "order-placed",
  ORDER_PAYMENT_REMINDER: "order-payment-reminder",
  PRODUCT_REVIEW_REQUEST: "product-review-request",
} as const

export type ResendEmailTemplate =
  (typeof resendEmailTemplates)[keyof typeof resendEmailTemplates]

export const resendEmailTemplateKeys = Object.values(resendEmailTemplates)
