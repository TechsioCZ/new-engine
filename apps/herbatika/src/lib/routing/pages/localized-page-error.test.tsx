import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { NextIntlClientProvider } from "next-intl"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  LocalizedPageError,
  type LocalizedPageErrorSurface,
} from "./localized-page-error"
import {
  createStandalonePagesLocaleBootstrap,
  StandalonePagesError,
} from "./standalone-pages-error"

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

const ROMANIAN_COPY = {
  account: "Contul nu este disponibil momentan.",
  advice: "Secțiunea de sfaturi nu este disponibilă momentan.",
  authentication:
    "Autentificarea și înregistrarea nu sunt disponibile momentan.",
  cart: "Coșul de cumpărături nu este disponibil momentan.",
  catalog: "Catalogul nu este disponibil momentan.",
  checkout: "Finalizarea comenzii nu este disponibilă momentan.",
  content: "Conținutul nu este disponibil momentan.",
  order: "Comanda nu este disponibilă momentan.",
  review: "Evaluarea nu este disponibilă momentan.",
  search: "Căutarea nu este disponibilă momentan.",
  storefront: "Magazinul nu este disponibil momentan.",
} as const satisfies Record<LocalizedPageErrorSurface, string>

describe("localized Pages error shells", () => {
  it("renders every Romanian storefront-text surface without raw errors", () => {
    for (const [surface, expectedCopy] of Object.entries(ROMANIAN_COPY)) {
      const html = renderToStaticMarkup(
        <NextIntlClientProvider
          locale="ro-RO"
          messages={messagesForLocale("ro-RO")}
        >
          <LocalizedPageError
            status={503}
            surface={surface as LocalizedPageErrorSurface}
          />
        </NextIntlClientProvider>
      )

      expect(html, surface).toContain('data-status="503"')
      expect(html, surface).toContain('role="alert"')
      expect(html, surface).toContain(expectedCopy)
      expect(html, surface).not.toContain("Error:")
      expect(html, surface).not.toContain("page_errors.")
    }
  })

  it("keeps the established Slovak catalog error copy", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale="sk-SK"
        messages={messagesForLocale("sk-SK")}
      >
        <LocalizedPageError status={503} surface="catalog" />
      </NextIntlClientProvider>
    )

    expect(html).toContain("Katalóg momentálne nie je dostupný.")
  })

  it("renders market-complete standalone 404 and global error copy", () => {
    const romanian = messagesForLocale("ro-RO").navigation.page_errors
    const slovak = messagesForLocale("sk-SK").navigation.page_errors
    const notFoundHtml = renderToStaticMarkup(
      <StandalonePagesError kind="not_found" status={404} />
    )
    const unavailableHtml = renderToStaticMarkup(
      <StandalonePagesError kind="unavailable" status={500} />
    )

    expect(notFoundHtml).toContain(romanian.not_found)
    expect(notFoundHtml).toContain(slovak.not_found)
    expect(notFoundHtml).toContain('data-status="404"')
    expect(notFoundHtml).toContain("html:lang(ro-RO)")
    expect(notFoundHtml).not.toContain(":global(")
    expect(unavailableHtml).toContain(romanian.unavailable)
    expect(unavailableHtml).toContain(slovak.unavailable)
    expect(unavailableHtml).toContain('data-status="500"')
  })

  it("bootstraps a static 404 from the configured exact hostname", () => {
    const bootstrap = createStandalonePagesLocaleBootstrap({
      "test-engine-herbatika-ro-zane.web-revolution.cz": "ro-RO",
    })

    expect(bootstrap).toContain("window.location.hostname.toLowerCase()")
    expect(bootstrap).toContain(
      '"test-engine-herbatika-ro-zane.web-revolution.cz":"ro-RO"'
    )
    expect(bootstrap).toContain("document.documentElement.lang=locale")
  })
})
