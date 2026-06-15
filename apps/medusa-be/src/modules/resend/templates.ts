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
