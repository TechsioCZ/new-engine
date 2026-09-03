import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { NextIntlClientProvider } from "next-intl"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@techsio/ui-kit/atoms/button", () => ({
  Button: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
}))
vi.mock("@techsio/ui-kit/atoms/link-button", () => ({
  LinkButton: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
}))
vi.mock("@techsio/ui-kit/atoms/status-text", () => ({
  StatusText: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
}))
vi.mock("@techsio/ui-kit/molecules/dialog", () => ({
  Dialog: ({
    actions,
    children,
    description,
    title,
  }: {
    actions: ReactNode
    children: ReactNode
    description: ReactNode
    title: ReactNode
  }) => (
    <section>
      <h2>{title}</h2>
      {description}
      {actions}
      {children}
    </section>
  ),
}))
vi.mock("@/components/storefront-link", () => ({
  StorefrontLink: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
}))
vi.mock("@/hooks/use-app-toast", () => ({
  useAppToast: () => ({ success: vi.fn() }),
}))
vi.mock("@/lib/storefront/auth", () => ({
  useConfirmAccountDeactivation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useRequestAccountDeactivation: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}))
vi.mock("@/lib/storefront/market-context-provider", () => ({
  useMarketContext: () => ({ code: "ro" }),
}))
vi.mock("@/lib/url/public-url", () => ({
  buildPath: () => "/",
}))

import { AccountDeactivationConfirmation } from "./account-deactivation-confirmation"
import { AccountDeactivationSection } from "./account-deactivation-section"

type TestLocale = "cs-CZ" | "hu-HU" | "ro-RO" | "sk-SK"

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

const renderLocalized = (locale: TestLocale, node: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={messagesForLocale(locale)}
    >
      {node}
    </NextIntlClientProvider>
  )

const componentSources = [
  "src/components/account/account-deactivation-section.tsx",
  "src/components/account/account-deactivation-confirmation.tsx",
  "src/pages/~sf/[market]/account/section/[section].tsx",
  "src/pages/~sf/[market]/account/deactivation.tsx",
].map((path) => readFileSync(resolve(process.cwd(), path), "utf8"))

const LOCALIZED_ACCOUNT_COPY =
  /Zrušenie účtu|Zrušení účtu|Fiók törlése|Ștergerea contului|Požiadať o zrušenie|Požádat o zrušení|Fióktörlés kérése|Solicită ștergerea/

const ACCOUNT_CASES = [
  {
    confirmationAction: "Potvrdiť zrušenie účtu",
    confirmationTitle: "Potvrdenie zrušenia účtu",
    dialogTitle: "Odoslať potvrdenie zrušenia účtu?",
    failed: "Potvrdzovací e-mail sa nepodarilo odoslať.",
    foreignCanaries: ["Zrušení účtu", "Fiók törlése", "Ștergerea contului"],
    invalidTokenCanary: "vypršala",
    locale: "sk-SK",
    requestAction: "Požiadať o zrušenie účtu",
    requestTitle: "Zrušenie účtu",
    sentStatusCanary: "30 minút",
    successCanary: "história objednávok",
  },
  {
    confirmationAction: "Potvrdit zrušení účtu",
    confirmationTitle: "Potvrzení zrušení účtu",
    dialogTitle: "Odeslat potvrzení zrušení účtu?",
    failed: "Potvrzovací e-mail se nepodařilo odeslat.",
    foreignCanaries: ["Zrušenie účtu", "Fiók törlése", "Ștergerea contului"],
    invalidTokenCanary: "vypršela",
    locale: "cs-CZ",
    requestAction: "Požádat o zrušení účtu",
    requestTitle: "Zrušení účtu",
    sentStatusCanary: "30 minut",
    successCanary: "historie objednávek",
  },
  {
    confirmationAction: "Fióktörlés megerősítése",
    confirmationTitle: "Fióktörlés megerősítése",
    dialogTitle: "Elküldi a fióktörlés megerősítését?",
    failed: "Nem sikerült elküldeni a megerősítő e-mailt.",
    foreignCanaries: ["Zrušenie účtu", "Zrušení účtu", "Ștergerea contului"],
    invalidTokenCanary: "lejárt",
    locale: "hu-HU",
    requestAction: "Fióktörlés kérése",
    requestTitle: "Fiók törlése",
    sentStatusCanary: "30 percig",
    successCanary: "rendelési előzmények",
  },
  {
    confirmationAction: "Confirmă ștergerea contului",
    confirmationTitle: "Confirmarea ștergerii contului",
    dialogTitle: "Trimiteți confirmarea pentru ștergerea contului?",
    failed: "E-mailul de confirmare nu a putut fi trimis.",
    foreignCanaries: ["Zrušenie účtu", "Zrušení účtu", "Fiók törlése"],
    invalidTokenCanary: "a expirat",
    locale: "ro-RO",
    requestAction: "Solicită ștergerea contului",
    requestTitle: "Ștergerea contului",
    sentStatusCanary: "30 de minute",
    successCanary: "istoricul comenzilor",
  },
] as const

describe("account deactivation localization", () => {
  it.each(
    ACCOUNT_CASES
  )("renders the exact $locale request, modal, and confirmation copy", ({
    confirmationAction,
    confirmationTitle,
    dialogTitle,
    foreignCanaries,
    locale,
    requestAction,
    requestTitle,
  }) => {
    const requestHtml = renderLocalized(locale, <AccountDeactivationSection />)
    const confirmationHtml = renderLocalized(
      locale,
      <AccountDeactivationConfirmation token="valid-token" />
    )
    const html = `${requestHtml}${confirmationHtml}`

    expect(requestHtml).toContain(requestTitle)
    expect(requestHtml).toContain(dialogTitle)
    expect(requestHtml).toContain(requestAction)
    expect(confirmationHtml).toContain(confirmationTitle)
    expect(confirmationHtml).toContain(confirmationAction)
    for (const foreignCanary of foreignCanaries) {
      expect(html).not.toContain(foreignCanary)
    }
  })

  it("keeps every reachable source wired to storefront text without market copy", () => {
    for (const source of componentSources) {
      expect(source).toContain('useTranslations("auth")')
      expect(source).not.toMatch(LOCALIZED_ACCOUNT_COPY)
    }
  })

  it.each(
    ACCOUNT_CASES
  )("publishes exact $locale status and error messages without foreign canaries", ({
    failed,
    foreignCanaries,
    invalidTokenCanary,
    locale,
    sentStatusCanary,
    successCanary,
  }) => {
    const deactivation = messagesForLocale(locale).auth.deactivation

    expect(deactivation.request.failed).toBe(failed)
    expect(deactivation.request.sent_status).toContain(sentStatusCanary)
    expect(deactivation.confirmation.invalid_token).toContain(
      invalidTokenCanary
    )
    expect(deactivation.confirmation.success).toContain(successCanary)
    for (const foreignCanary of foreignCanaries) {
      expect(JSON.stringify(deactivation)).not.toContain(foreignCanary)
    }
  })
})
