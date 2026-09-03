import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/herbatika-breadcrumb", () => ({
  HerbatikaBreadcrumb: ({ items }: { items: Array<{ label: ReactNode }> }) => (
    <nav>{items.map(({ label }) => label)}</nav>
  ),
}))

vi.mock("./turnstile-widget", () => ({
  isTurnstileRequired: false,
  TurnstileWidget: () => null,
}))

import { ClaimDetailsForm } from "./claim-details-form"
import { ClaimOrderItems } from "./claim-order-items"
import { ClaimSuccess } from "./claim-success"
import { ClaimsPage } from "./claims-page"

const LOCALES = ["sk-SK", "cs-CZ", "hu-HU", "ro-RO"] as const
type TestLocale = (typeof LOCALES)[number]

const messagesForLocale = (locale: TestLocale) =>
  JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        `../medusa-be/src/modules/storefront-text/messages/${locale}.json`
      ),
      "utf8"
    )
  )

const renderClaims = (locale: TestLocale) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={messagesForLocale(locale)}
    >
      <ClaimsPage />
      <ClaimDetailsForm
        busy={false}
        defectDescription=""
        email=""
        manualItem=""
        onBack={vi.fn()}
        onDefectDescriptionChange={vi.fn()}
        onEmailChange={vi.fn()}
        onManualItemChange={vi.fn()}
        onPurchaseDetailsChange={vi.fn()}
        onReasonChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onSelectedItemsChange={vi.fn()}
        onSubmit={vi.fn()}
        onTurnstileTokenChange={vi.fn()}
        order={null}
        purchaseDetails=""
        reason=""
        resolution="replacement"
        selectedItems={[]}
        turnstileReset={0}
        type="complaint"
      />
      <ClaimOrderItems
        items={[
          {
            id: "item-1",
            product_id: "product-1",
            quantity: 2,
            title: "Test product",
            variant_id: "variant-1",
          },
        ]}
        onChange={vi.fn()}
        selectedItems={[]}
      />
      <ClaimSuccess caseNumber="CASE-1" />
    </NextIntlClientProvider>
  )

const expectedCopy: Record<TestLocale, readonly string[]> = {
  "sk-SK": [
    "Reklamácie a vrátenie tovaru",
    "Poslať overovací kód",
    "Požadované riešenie",
    "Prípad CASE-1 bol úspešne odoslaný.",
  ],
  "cs-CZ": [
    "Reklamace a vrácení zboží",
    "Odeslat ověřovací kód",
    "Požadované řešení",
    "Případ CASE-1 byl úspěšně odeslán.",
  ],
  "hu-HU": [
    "Termékreklamáció és visszaküldés",
    "Ellenőrző kód küldése",
    "Kért megoldás",
    "A(z) CASE-1 számú ügyet sikeresen elküldtük.",
  ],
  "ro-RO": [
    "Reclamații și retururi de produse",
    "Trimite codul de verificare",
    "Soluția solicitată",
    "Cazul CASE-1 a fost trimis cu succes.",
  ],
}

const translatedComponentSources = [
  "claim-access-forms.tsx",
  "claim-details-form.tsx",
  "claim-details-stage.tsx",
  "claim-form.tsx",
  "claim-order-items.tsx",
  "claim-success.tsx",
  "claim-type-picker.tsx",
  "claims-page.tsx",
  "use-claim-request.ts",
].map((file) =>
  readFileSync(resolve(process.cwd(), `src/components/claims/${file}`), "utf8")
)

const SLOVAK_UI_COPY =
  /Reklamácie|Vrátiť tovar|Odoslať|Späť|Objednávka č\.|Vyberte produkty|Počet kusov|Požiadavku sa|Ako to funguje|Čo potrebujete|Popíšte, prosím/

describe("claims localization", () => {
  it.each(
    LOCALES
  )("renders the %s claims flow from storefront text", (locale) => {
    const html = renderClaims(locale)

    for (const copy of expectedCopy[locale]) {
      expect(html).toContain(copy)
    }
  })

  it("keeps every reachable claims component free of hard-coded Slovak UI", () => {
    for (const source of translatedComponentSources) {
      expect(source).toContain('useTranslations("claims")')
      expect(source).not.toMatch(SLOVAK_UI_COPY)
    }
  })

  it("publishes the same complete claims contract in every market catalog", () => {
    const claimsByLocale = LOCALES.map(
      (locale) => messagesForLocale(locale).claims as Record<string, string>
    )
    const canonicalKeys = Object.keys(claimsByLocale[0]).sort()

    expect(canonicalKeys).toHaveLength(47)
    for (const claims of claimsByLocale) {
      expect(Object.keys(claims).sort()).toEqual(canonicalKeys)
      expect(Object.values(claims).every((value) => value.trim())).toBe(true)
    }
  })
})
