export const resendEmailLocales = ["sk-SK", "cs-CZ", "hu-HU", "ro-RO"] as const

export type ResendEmailLocale = (typeof resendEmailLocales)[number]

export const resendEmailMarkets = ["sk", "cz", "hu", "ro"] as const

export type ResendEmailMarket = (typeof resendEmailMarkets)[number]

export const resendEmailMarketBindings = {
  cz: {
    locale: "cs-CZ",
    senderDomain: "herbatica.cz",
    storefrontDomain: "herbatica.cz",
  },
  hu: {
    locale: "hu-HU",
    senderDomain: "herbatica.hu",
    storefrontDomain: "herbatica.hu",
  },
  ro: {
    locale: "ro-RO",
    senderDomain: "herbatica.ro",
    storefrontDomain: "herbatica.ro",
  },
  sk: {
    locale: "sk-SK",
    senderDomain: "herbatica.sk",
    storefrontDomain: "herbatica.sk",
  },
} as const satisfies Record<
  ResendEmailMarket,
  Readonly<{
    locale: ResendEmailLocale
    senderDomain: string
    storefrontDomain: string
  }>
>

const MAILBOX_PATTERN = /^(?:[^<>\r\n]*<)?[^<>\s@]+@([^<>\s@]+)>?$/u

export function getResendMailboxDomain(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return
  }

  return MAILBOX_PATTERN.exec(value.trim())?.[1]?.toLowerCase()
}

export function resolveResendEmailMarket(
  locale: unknown,
  storefrontDomain: unknown
): ResendEmailMarket | undefined {
  if (typeof locale !== "string" || typeof storefrontDomain !== "string") {
    return
  }

  return resendEmailMarkets.find((market) => {
    const binding = resendEmailMarketBindings[market]
    return (
      locale === binding.locale && storefrontDomain === binding.storefrontDomain
    )
  })
}

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
