import { describe, expect, it } from "vitest"
import { getResendTemplateSubject, resendEmailTemplates } from "../templates"

const expectedSubjects = {
  [resendEmailTemplates.ACCOUNT_SETUP]: {
    "sk-SK": "Dokončenie registrácie",
    "cs-CZ": "Dokončení registrace",
    "hu-HU": "A regisztráció befejezése",
    "ro-RO": "Finalizarea înregistrării",
  },
  [resendEmailTemplates.CUSTOMER_ACCOUNT_DEACTIVATION]: {
    "sk-SK": "Potvrdenie zrušenia účtu",
    "cs-CZ": "Potvrzení zrušení účtu",
    "hu-HU": "A fiók megszüntetésének megerősítése",
    "ro-RO": "Confirmarea dezactivării contului",
  },
  [resendEmailTemplates.CUSTOMER_REGISTRATION_CONFIRMATION]: {
    "sk-SK": "Potvrdenie registrácie",
    "cs-CZ": "Potvrzení registrace",
    "hu-HU": "Regisztráció megerősítése",
    "ro-RO": "Confirmarea înregistrării",
  },
  [resendEmailTemplates.CLAIM_ACCESS_CODE]: {
    "sk-SK": "Overenie objednávky",
    "cs-CZ": "Ověření objednávky",
    "hu-HU": "Rendelés ellenőrzése",
    "ro-RO": "Verificarea comenzii",
  },
  [resendEmailTemplates.CLAIM_CONFIRMATION]: {
    "sk-SK": "Potvrdenie prijatia požiadavky",
    "cs-CZ": "Potvrzení přijetí požadavku",
    "hu-HU": "A kérelem beérkezésének visszaigazolása",
    "ro-RO": "Confirmarea primirii solicitării",
  },
  [resendEmailTemplates.FORGOT_PASSWORD]: {
    "sk-SK": "Obnovenie hesla",
    "cs-CZ": "Obnovení hesla",
    "hu-HU": "Jelszó visszaállítása",
    "ro-RO": "Resetarea parolei",
  },
  [resendEmailTemplates.ORDER_PLACED]: {
    "sk-SK": "Potvrdenie objednávky",
    "cs-CZ": "Potvrzení objednávky",
    "hu-HU": "Rendelés visszaigazolása",
    "ro-RO": "Confirmarea comenzii",
  },
  [resendEmailTemplates.ORDER_PAYMENT_REMINDER]: {
    "sk-SK": "Prosím, zaplaťte svoju objednávku",
    "cs-CZ": "Prosím, zaplaťte svou objednávku",
    "hu-HU": "Kérjük, fizesse ki rendelését",
    "ro-RO": "Vă rugăm să achitați comanda",
  },
  [resendEmailTemplates.PRODUCT_REVIEW_REQUEST]: {
    "sk-SK": "Napíšte recenziu produktu",
    "cs-CZ": "Napište recenzi produktu",
    "hu-HU": "Írjon véleményt a termékről",
    "ro-RO": "Scrieți o recenzie pentru produs",
  },
} as const

const subjectCases = Object.entries(expectedSubjects).flatMap(
  ([template, subjects]) =>
    Object.entries(subjects).map(
      ([locale, subject]) => [template, locale, subject] as const
    )
)

describe("Resend template subjects", () => {
  it.each(
    subjectCases
  )("maps %s and %s to its localized subject", (template, locale, subject) => {
    expect(getResendTemplateSubject(template, locale)).toBe(subject)
  })

  it("requires an explicit supported locale", () => {
    expect(
      getResendTemplateSubject(resendEmailTemplates.ORDER_PLACED)
    ).toBeUndefined()
  })

  it("normalizes locale casing and rejects unsupported locales", () => {
    expect(
      getResendTemplateSubject(resendEmailTemplates.FORGOT_PASSWORD, "cs-cz")
    ).toBe(expectedSubjects[resendEmailTemplates.FORGOT_PASSWORD]["cs-CZ"])
    expect(
      getResendTemplateSubject(resendEmailTemplates.FORGOT_PASSWORD, "en-US")
    ).toBeUndefined()
  })
})
