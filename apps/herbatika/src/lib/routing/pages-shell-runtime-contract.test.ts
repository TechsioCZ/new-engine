import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), "src", relativePath), "utf8")

describe("Pages Router storefront runtime contract", () => {
  it("binds intl, region, and the Pages query adapter from trusted shell props", () => {
    const appSource = source("pages/_app.tsx")
    const providersSource = source("app/providers.tsx")

    expect(appSource).toContain("locale={pageProps.marketContext.locale}")
    expect(appSource).toContain("timeZone={pageProps.marketContext.timeZone}")
    expect(appSource).toContain("initialRegion={pageProps.initialRegion}")
    expect(appSource).toContain('router="pages"')
    expect(providersSource).toContain("nuqs/adapters/next/pages")
    expect(providersSource).toContain('router === "pages"')
  })

  it("keeps market metadata and storefront fonts on the Pages document", () => {
    const appSource = source("pages/_app.tsx")
    const documentSource = source("pages/_document.tsx")

    expect(appSource).toContain("seo.title ?? marketContext.metadata.title")
    expect(appSource).toContain(
      "seo.description ?? marketContext.metadata.description"
    )
    expect(documentSource).toContain("storefrontFontVariables")
    expect(documentSource).toContain("verdana.className")
  })
})
