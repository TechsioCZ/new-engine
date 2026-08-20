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

const messagesForLocale = (locale: "ro-RO" | "sk-SK") =>
  JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        `../medusa-be/src/modules/storefront-text/messages/${locale}.json`
      ),
      "utf8"
    )
  )

const renderRomanian = (node: ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale="ro-RO"
      messages={messagesForLocale("ro-RO")}
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

const slovakCopy =
  /Zrušenie účtu|Požiadať o zrušenie|Ponechať účet|Odoslať potvrdzovací|Potvrdenie zrušenia|Potvrdiť zrušenie|Účet bol zrušený/

describe("account deactivation localization", () => {
  it("renders the Romanian request, modal, and confirmation copy", () => {
    const requestHtml = renderRomanian(<AccountDeactivationSection />)
    const confirmationHtml = renderRomanian(
      <AccountDeactivationConfirmation token="valid-token" />
    )
    const html = `${requestHtml}${confirmationHtml}`

    expect(requestHtml).toContain("Ștergerea contului")
    expect(requestHtml).toContain(
      "Trimiteți confirmarea pentru ștergerea contului?"
    )
    expect(requestHtml).toContain("Solicită ștergerea contului")
    expect(confirmationHtml).toContain("Confirmarea ștergerii contului")
    expect(confirmationHtml).toContain("Confirmă ștergerea contului")
    expect(html).not.toMatch(slovakCopy)
  })

  it("keeps every reachable source wired to storefront text without Slovak copy", () => {
    for (const source of componentSources) {
      expect(source).toContain('useTranslations("auth")')
      expect(source).not.toMatch(slovakCopy)
    }
  })

  it("publishes distinct Romanian status and error messages", () => {
    const romanian = messagesForLocale("ro-RO").auth.deactivation
    const slovak = messagesForLocale("sk-SK").auth.deactivation

    expect(romanian.request.failed).toBe(
      "E-mailul de confirmare nu a putut fi trimis."
    )
    expect(romanian.request.sent_status).toContain("30 de minute")
    expect(romanian.confirmation.invalid_token).toContain("a expirat")
    expect(romanian.confirmation.success).toContain("istoricul comenzilor")
    expect(romanian).not.toEqual(slovak)
    expect(JSON.stringify(romanian)).not.toMatch(slovakCopy)
  })
})
