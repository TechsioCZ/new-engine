import type { ResendEmailLocale, ResendEmailTemplate } from "./contracts"
import { resendEmailLocales, resendEmailTemplates } from "./contracts"

export {
  type ResendEmailLocale,
  type ResendEmailTemplate,
  resendEmailLocales,
  resendEmailTemplates,
} from "./contracts"

const defineTemplate = <
  const RequiredVariables extends readonly string[],
  const OptionalVariables extends readonly string[],
>(definition: {
  label: string
  optionalVariables?: OptionalVariables
  requiredVariables: RequiredVariables
  subject?: string
  subjects?: ResendTemplateSubjects
}) => ({
  ...definition,
  optionalVariables:
    definition.optionalVariables ?? ([] as unknown as OptionalVariables),
})

type ResendTemplateSubjects = Record<ResendEmailLocale, string>

export const resendTemplateDefinitions = {
  [resendEmailTemplates.ACCOUNT_SETUP]: defineTemplate({
    label: "Account setup",
    optionalVariables: [
      "country_code",
      "customer_id",
      "customer_name",
      "market_code",
      "order_display_id",
      "sales_channel_id",
      "storefront_base_url",
      "storefront_domain",
    ],
    requiredVariables: ["locale", "reset_url"],
    subjects: {
      "sk-SK": "Dokončenie registrácie",
      "cs-CZ": "Dokončení registrace",
      "hu-HU": "A regisztráció befejezése",
      "ro-RO": "Finalizarea înregistrării",
    },
  }),
  [resendEmailTemplates.COMPANY_APPLICATION_APPROVED]: defineTemplate({
    label: "Company application approved",
    optionalVariables: [
      "company_id",
      "country_code",
      "market_code",
      "sales_channel_id",
      "store_name",
      "storefront_base_url",
      "storefront_domain",
    ],
    requiredVariables: ["company_name", "locale"],
    subjects: {
      "sk-SK": "VO účet bol schválený",
      "cs-CZ": "VO účet byl schválen",
      "hu-HU": "A nagykereskedelmi fiókot jóváhagytuk",
      "ro-RO": "Contul en-gros a fost aprobat",
    },
  }),
  [resendEmailTemplates.COMPANY_APPLICATION_REJECTED]: defineTemplate({
    label: "Company application rejected",
    optionalVariables: [
      "company_id",
      "country_code",
      "market_code",
      "sales_channel_id",
      "store_name",
      "storefront_base_url",
      "storefront_domain",
    ],
    requiredVariables: ["company_name", "locale"],
    subjects: {
      "sk-SK": "VO účet nebol schválený",
      "cs-CZ": "VO účet nebyl schválen",
      "hu-HU": "A nagykereskedelmi fiókot nem hagytuk jóvá",
      "ro-RO": "Contul en-gros nu a fost aprobat",
    },
  }),
  [resendEmailTemplates.CUSTOMER_ACCOUNT_DEACTIVATION]: defineTemplate({
    label: "Customer account deactivation",
    optionalVariables: [
      "country_code",
      "customer_id",
      "customer_name",
      "market_code",
      "sales_channel_id",
      "storefront_base_url",
      "storefront_domain",
    ],
    requiredVariables: ["confirmation_url", "locale"],
    subjects: {
      "sk-SK": "Potvrdenie zrušenia účtu",
      "cs-CZ": "Potvrzení zrušení účtu",
      "hu-HU": "A fiók megszüntetésének megerősítése",
      "ro-RO": "Confirmarea dezactivării contului",
    },
  }),
  [resendEmailTemplates.CUSTOMER_REGISTRATION_CONFIRMATION]: defineTemplate({
    label: "Customer registration confirmation",
    optionalVariables: [
      "country_code",
      "customer_id",
      "customer_name",
      "market_code",
      "sales_channel_id",
      "store_name",
      "storefront_base_url",
      "storefront_domain",
    ],
    requiredVariables: ["locale"],
    subjects: {
      "sk-SK": "Potvrdenie registrácie",
      "cs-CZ": "Potvrzení registrace",
      "hu-HU": "Regisztráció megerősítése",
      "ro-RO": "Confirmarea înregistrării",
    },
  }),
  [resendEmailTemplates.CLAIM_ACCESS_CODE]: defineTemplate({
    label: "Claim order access code",
    optionalVariables: [
      "country_code",
      "market_code",
      "order_display_id",
      "sales_channel_id",
      "store_name",
      "storefront_base_url",
      "storefront_domain",
    ],
    requiredVariables: ["expires_in_minutes", "locale", "verification_code"],
    subjects: {
      "sk-SK": "Overenie objednávky",
      "cs-CZ": "Ověření objednávky",
      "hu-HU": "Rendelés ellenőrzése",
      "ro-RO": "Verificarea comenzii",
    },
  }),
  [resendEmailTemplates.CLAIM_CONFIRMATION]: defineTemplate({
    label: "Claim confirmation",
    optionalVariables: [
      "country_code",
      "market_code",
      "order_display_id",
      "requested_resolution",
      "sales_channel_id",
      "store_name",
      "storefront_base_url",
      "storefront_domain",
    ],
    requiredVariables: ["case_number", "case_type", "items", "locale"],
    subjects: {
      "sk-SK": "Potvrdenie prijatia požiadavky",
      "cs-CZ": "Potvrzení přijetí požadavku",
      "hu-HU": "A kérelem beérkezésének visszaigazolása",
      "ro-RO": "Confirmarea primirii solicitării",
    },
  }),
  [resendEmailTemplates.FORGOT_PASSWORD]: defineTemplate({
    label: "Forgot password",
    optionalVariables: [
      "country_code",
      "market_code",
      "sales_channel_id",
      "store_name",
      "storefront_base_url",
      "storefront_domain",
    ],
    requiredVariables: ["locale", "reset_url"],
    subjects: {
      "sk-SK": "Obnovenie hesla",
      "cs-CZ": "Obnovení hesla",
      "hu-HU": "Jelszó visszaállítása",
      "ro-RO": "Resetarea parolei",
    },
  }),
  [resendEmailTemplates.ORDER_PLACED]: defineTemplate({
    label: "Order placed",
    optionalVariables: [
      "country_code",
      "customer_name",
      "market_code",
      "sales_channel_id",
      "store_name",
      "storefront_base_url",
      "storefront_domain",
      "total",
    ],
    requiredVariables: ["locale", "order_display_id"],
    subjects: {
      "sk-SK": "Potvrdenie objednávky",
      "cs-CZ": "Potvrzení objednávky",
      "hu-HU": "Rendelés visszaigazolása",
      "ro-RO": "Confirmarea comenzii",
    },
  }),
  [resendEmailTemplates.ORDER_PAYMENT_REMINDER]: defineTemplate({
    label: "Payment reminder",
    optionalVariables: [
      "country_code",
      "market_code",
      "sales_channel_id",
      "store_name",
      "storefront_base_url",
      "storefront_domain",
      "total",
    ],
    requiredVariables: ["locale", "order_display_id", "payment_url"],
    subjects: {
      "sk-SK": "Prosím, zaplaťte svoju objednávku",
      "cs-CZ": "Prosím, zaplaťte svou objednávku",
      "hu-HU": "Kérjük, fizesse ki rendelését",
      "ro-RO": "Vă rugăm să achitați comanda",
    },
  }),
  [resendEmailTemplates.PRODUCT_REVIEW_REQUEST]: defineTemplate({
    label: "Product review request",
    optionalVariables: [
      "country_code",
      "market_code",
      "order_display_id",
      "order_id",
      "sales_channel_id",
      "store_name",
      "storefront_base_url",
      "storefront_domain",
    ],
    requiredVariables: ["items", "locale", "message", "products"],
    subjects: {
      "sk-SK": "Napíšte recenziu produktu",
      "cs-CZ": "Napište recenzi produktu",
      "hu-HU": "Írjon véleményt a termékről",
      "ro-RO": "Scrieți o recenzie pentru produs",
    },
  }),
} as const

export type ResendTemplateDefinition =
  (typeof resendTemplateDefinitions)[ResendEmailTemplate]

export const resendTemplateContracts = Object.entries(
  resendTemplateDefinitions
).map(([key, definition]) => ({
  key: key as ResendEmailTemplate,
  label: definition.label,
}))

export function getResendTemplateDefinition(template: string) {
  return resendTemplateDefinitions[template as ResendEmailTemplate]
}

export function getResendTemplateSubject(
  template: string,
  locale?: string | null
) {
  const definition = getResendTemplateDefinition(template)

  if (!definition) {
    return
  }

  const normalizedLocale = locale?.trim().toLowerCase()

  if (normalizedLocale && definition.subjects) {
    const matchedLocale = resendEmailLocales.find(
      (supportedLocale) => supportedLocale.toLowerCase() === normalizedLocale
    )

    return matchedLocale ? definition.subjects[matchedLocale] : undefined
  }

  return definition.subject
}
