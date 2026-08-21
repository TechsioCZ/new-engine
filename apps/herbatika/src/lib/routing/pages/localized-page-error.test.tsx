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

const LOCALIZED_ERROR_SURFACES = [
  "account",
  "advice",
  "authentication",
  "cart",
  "catalog",
  "checkout",
  "content",
  "order",
  "review",
  "search",
  "storefront",
] as const satisfies readonly LocalizedPageErrorSurface[]

const ERROR_CASES = [
  {
    catalog: "Katalóg momentálne nie je dostupný.",
    foreignCatalogCanaries: [
      "Katalog momentálně není dostupný.",
      "A katalógus jelenleg nem érhető el.",
      "Catalogul nu este disponibil momentan.",
    ],
    locale: "sk-SK",
  },
  {
    catalog: "Katalog momentálně není dostupný.",
    foreignCatalogCanaries: [
      "Katalóg momentálne nie je dostupný.",
      "A katalógus jelenleg nem érhető el.",
      "Catalogul nu este disponibil momentan.",
    ],
    locale: "cs-CZ",
  },
  {
    catalog: "A katalógus jelenleg nem érhető el.",
    foreignCatalogCanaries: [
      "Katalóg momentálne nie je dostupný.",
      "Katalog momentálně není dostupný.",
      "Catalogul nu este disponibil momentan.",
    ],
    locale: "hu-HU",
  },
  {
    catalog: "Catalogul nu este disponibil momentan.",
    foreignCatalogCanaries: [
      "Katalóg momentálne nie je dostupný.",
      "Katalog momentálně není dostupný.",
      "A katalógus jelenleg nem érhető el.",
    ],
    locale: "ro-RO",
  },
] as const

describe("localized Pages error shells", () => {
  it.each(
    ERROR_CASES
  )("renders every $locale storefront-text surface without raw or foreign errors", ({
    catalog,
    foreignCatalogCanaries,
    locale,
  }) => {
    const pageErrors = messagesForLocale(locale).navigation.page_errors
    let renderedSurfaces = ""

    expect(pageErrors.catalog).toBe(catalog)
    for (const surface of LOCALIZED_ERROR_SURFACES) {
      const html = renderToStaticMarkup(
        <NextIntlClientProvider
          locale={locale}
          messages={messagesForLocale(locale)}
        >
          <LocalizedPageError status={503} surface={surface} />
        </NextIntlClientProvider>
      )

      expect(html, surface).toContain('data-status="503"')
      expect(html, surface).toContain('role="alert"')
      expect(html, surface).toContain(pageErrors[surface])
      expect(html, surface).not.toContain("Error:")
      expect(html, surface).not.toContain("page_errors.")
      renderedSurfaces += html
    }
    for (const foreignCanary of foreignCatalogCanaries) {
      expect(renderedSurfaces).not.toContain(foreignCanary)
    }
  })

  it("renders market-complete standalone 404 and global error copy", () => {
    const notFoundHtml = renderToStaticMarkup(
      <StandalonePagesError kind="not_found" status={404} />
    )
    const unavailableHtml = renderToStaticMarkup(
      <StandalonePagesError kind="unavailable" status={500} />
    )

    expect(notFoundHtml).toContain('data-status="404"')
    expect(notFoundHtml).not.toContain(":global(")
    expect(unavailableHtml).toContain('data-status="500"')
    for (const locale of ["sk-SK", "cs-CZ", "hu-HU", "ro-RO"] as const) {
      const pageErrors = messagesForLocale(locale).navigation.page_errors

      expect(notFoundHtml).toContain(pageErrors.not_found)
      if (locale === "sk-SK") {
        expect(notFoundHtml).toContain('[data-error-locale="sk-SK"]')
      } else {
        expect(notFoundHtml).toContain(`html:lang(${locale})`)
      }
      expect(unavailableHtml).toContain(pageErrors.unavailable)
    }
  })

  it("bootstraps a static 404 from every configured exact market hostname", () => {
    const bootstrap = createStandalonePagesLocaleBootstrap({
      "test-engine-herbatika-cz-zane.web-revolution.cz": "cs-CZ",
      "test-engine-herbatika-hu-zane.web-revolution.cz": "hu-HU",
      "test-engine-herbatika-ro-zane.web-revolution.cz": "ro-RO",
      "test-engine-herbatika-sk-zane.web-revolution.cz": "sk-SK",
      "test-engine-herbatika-zane.web-revolution.cz": "sk-SK",
    })

    expect(bootstrap).toContain("window.location.hostname.toLowerCase()")
    for (const [hostname, locale] of Object.entries({
      "test-engine-herbatika-cz-zane.web-revolution.cz": "cs-CZ",
      "test-engine-herbatika-hu-zane.web-revolution.cz": "hu-HU",
      "test-engine-herbatika-ro-zane.web-revolution.cz": "ro-RO",
      "test-engine-herbatika-sk-zane.web-revolution.cz": "sk-SK",
      "test-engine-herbatika-zane.web-revolution.cz": "sk-SK",
    })) {
      expect(bootstrap).toContain(`"${hostname}":"${locale}"`)
    }
    expect(bootstrap).toContain("document.documentElement.lang=locale")
  })
})
