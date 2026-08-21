import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { NextIntlClientProvider } from "next-intl"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"

const MARKET_EXPECTATIONS = [
  {
    copy: "Overenie proti spamu sa nepodarilo načítať. Skúste to prosím znova.",
    locale: "sk-SK",
  },
  {
    copy: "Ověření proti spamu se nepodařilo načíst. Zkuste to prosím znovu.",
    locale: "cs-CZ",
  },
  {
    copy: "A spam elleni ellenőrzés nem tölthető be. Próbáld újra.",
    locale: "hu-HU",
  },
  {
    copy: "Verificarea anti-spam nu a putut fi încărcată. Încearcă din nou.",
    locale: "ro-RO",
  },
] as const

const messagesForLocale = (locale: string) =>
  JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        `../medusa-be/src/modules/storefront-text/messages/${locale}.json`
      ),
      "utf8"
    )
  )

describe("TurnstileWidget localization", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it.each(
    MARKET_EXPECTATIONS
  )("uses the $locale catalog copy when Turnstile is enabled without a site key", async ({
    copy,
    locale,
  }) => {
    vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_ENABLED", "1")
    vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY", "")
    vi.resetModules()
    const { TurnstileWidget } = await import("./turnstile-widget")

    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale={locale}
        messages={messagesForLocale(locale)}
      >
        <TurnstileWidget onTokenChange={vi.fn()} />
      </NextIntlClientProvider>
    )

    expect(html).toContain(copy)
    expect(html).not.toContain("Overenie proti robotom nie je nakonfigurované.")
  })
})
