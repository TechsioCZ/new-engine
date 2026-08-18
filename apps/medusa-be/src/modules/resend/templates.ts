const defineTemplate = <
  const RequiredVariables extends readonly string[],
  const OptionalVariables extends readonly string[],
>(definition: {
  id: string
  label: string
  optionalVariables?: OptionalVariables
  requiredVariables: RequiredVariables
  subject: string
}) => ({
  ...definition,
  optionalVariables:
    definition.optionalVariables ?? ([] as unknown as OptionalVariables),
})

export const resendEmailTemplates = {
  ACCOUNT_SETUP: "account-setup",
  COMPANY_APPLICATION_APPROVED: "company-application-approved",
  COMPANY_APPLICATION_REJECTED: "company-application-rejected",
  CUSTOMER_ACCOUNT_DEACTIVATION: "customer-account-deactivation",
  CUSTOMER_REGISTRATION_CONFIRMATION: "customer-registration-confirmation",
  CLAIM_ACCESS_CODE: "claim-access-code",
  CLAIM_CONFIRMATION: "claim-confirmation",
  FORGOT_PASSWORD: "user-forgotpwd",
  ORDER_PLACED: "order-placed",
  ORDER_PAYMENT_REMINDER: "order-payment-reminder",
  PRODUCT_REVIEW_REQUEST: "product-review-request",
} as const

export const resendTemplateDefinitions = {
  [resendEmailTemplates.ACCOUNT_SETUP]: defineTemplate({
    id: "account-setup",
    label: "Account setup",
    optionalVariables: ["customer_id", "customer_name", "order_display_id"],
    requiredVariables: ["reset_url"],
    subject: "Dokončenie registrácie",
  }),
  [resendEmailTemplates.COMPANY_APPLICATION_APPROVED]: defineTemplate({
    id: "company-application-approved",
    label: "Company application approved",
    optionalVariables: ["company_id"],
    requiredVariables: ["company_name"],
    subject: "VO účet bol schválený",
  }),
  [resendEmailTemplates.COMPANY_APPLICATION_REJECTED]: defineTemplate({
    id: "company-application-rejected",
    label: "Company application rejected",
    optionalVariables: ["company_id"],
    requiredVariables: ["company_name"],
    subject: "VO účet nebol schválený",
  }),
  [resendEmailTemplates.CUSTOMER_ACCOUNT_DEACTIVATION]: defineTemplate({
    id: "customer-account-deactivation",
    label: "Customer account deactivation",
    optionalVariables: ["customer_id", "customer_name"],
    requiredVariables: ["confirmation_url"],
    subject: "Potvrdenie zrušenia účtu",
  }),
  [resendEmailTemplates.CUSTOMER_REGISTRATION_CONFIRMATION]: defineTemplate({
    id: "customer-registration-confirmation",
    label: "Customer registration confirmation",
    optionalVariables: ["customer_id", "customer_name"],
    requiredVariables: [],
    subject: "Potvrdenie registrácie",
  }),
  [resendEmailTemplates.CLAIM_ACCESS_CODE]: defineTemplate({
    id: "claim-access-code",
    label: "Claim order access code",
    optionalVariables: ["order_display_id"],
    requiredVariables: ["verification_code", "expires_in_minutes"],
    subject: "Overenie objednávky",
  }),
  [resendEmailTemplates.CLAIM_CONFIRMATION]: defineTemplate({
    id: "claim-confirmation",
    label: "Claim confirmation",
    optionalVariables: ["order_display_id", "requested_resolution"],
    requiredVariables: ["case_number", "case_type", "items"],
    subject: "Potvrdenie prijatia požiadavky",
  }),
  [resendEmailTemplates.FORGOT_PASSWORD]: defineTemplate({
    id: "user-forgotpwd",
    label: "Forgot password",
    optionalVariables: ["store_name"],
    requiredVariables: ["reset_url"],
    subject: "Obnovení hesla",
  }),
  [resendEmailTemplates.ORDER_PLACED]: defineTemplate({
    id: "order-placed",
    label: "Order placed",
    optionalVariables: ["customer_name", "store_name", "total"],
    requiredVariables: ["order_display_id"],
    subject: "Potvrzení objednávky",
  }),
  [resendEmailTemplates.ORDER_PAYMENT_REMINDER]: defineTemplate({
    id: "order-payment-reminder",
    label: "Payment reminder",
    optionalVariables: ["store_name", "total"],
    requiredVariables: ["order_display_id", "payment_url"],
    subject: "Zaplaťte prosím svou objednávku",
  }),
  [resendEmailTemplates.PRODUCT_REVIEW_REQUEST]: defineTemplate({
    id: "product-review-request",
    label: "Product review request",
    optionalVariables: ["order_display_id", "order_id", "store_name"],
    requiredVariables: ["items", "message", "products"],
    subject: "Napiš recenzi produktu",
  }),
} as const

export type ResendEmailTemplate =
  (typeof resendEmailTemplates)[keyof typeof resendEmailTemplates]

export type ResendTemplateDefinition =
  (typeof resendTemplateDefinitions)[ResendEmailTemplate]

export function getResendTemplateDefinition(template: string) {
  return resendTemplateDefinitions[template as ResendEmailTemplate]
}

export function getResendTemplateSubject(template: string) {
  return getResendTemplateDefinition(template)?.subject
}
