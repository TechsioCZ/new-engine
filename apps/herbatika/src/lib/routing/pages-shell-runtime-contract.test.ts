import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), "src", relativePath), "utf8")

const RAW_ENGLISH_PAGE_ERROR =
  /(?:Account|Advice|Article|Authentication|Brand|Brands|Cart|Categories|Category|Checkout|Collection|Collections|Content|Order|Products|Review|Search|Storefront) unavailable\./

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

  it("hydrates the page query cache above the shell so SSR markup uses prefetched data", () => {
    const appSource = source("pages/_app.tsx")

    expect(appSource).toContain(
      "pageProps.dehydratedState ?? pageProps.page?.value?.dehydratedState"
    )
    expect(appSource).toContain(
      "<HydrationBoundary state={resolveShellDehydratedState(pageProps)}>"
    )
    // React Query only hydrates an already-created query from an effect, and
    // effects never run during SSR. The shell must therefore hydrate before it
    // renders AppShell, whose header creates the shared category query.
    expect(appSource.indexOf("<HydrationBoundary")).toBeLessThan(
      appSource.indexOf("<AppShell")
    )
  })

  it("keeps market metadata and storefront fonts on the Pages document", () => {
    const appSource = source("pages/_app.tsx")
    const documentSource = source("pages/_document.tsx")

    expect(appSource).toContain(
      "const brandTitle = marketContext.metadata.title"
    )
    expect(appSource).toContain("` : brandTitle")
    expect(appSource).toContain(
      "seo.description ?? marketContext.metadata.description"
    )
    expect(documentSource).toContain("storefrontFontVariables")
    expect(documentSource).toContain("verdana.className")
    expect(documentSource).toContain('context.req?.headers["x-sf-market"]')
    expect(documentSource).toContain("lang={this.props.htmlLang}")
  })

  it("publishes product alternates only through URLR equivalence projections", () => {
    const productSource = source("pages/~sf/[market]/products/[slug].tsx")

    expect(productSource).toContain("findActiveEntityRoute")
    expect(productSource).toContain("loadEntityAlternates")
    expect(productSource).toContain("readProductAlternateSourceFromMedusa")
    expect(productSource).toContain("sourceVersion")
    expect(productSource).toContain("page.value.alternates")
    expect(productSource).toContain('rel="alternate"')
  })

  it("localizes product and checkout error shells through storefront text", () => {
    const checkoutSource = source("pages/~sf/[market]/checkout/[step].tsx")
    const productSource = source("pages/~sf/[market]/products/[slug].tsx")

    expect(checkoutSource).toContain('useTranslations("checkout")')
    expect(checkoutSource).toContain('tCheckout("page_unavailable")')
    expect(checkoutSource).not.toContain("Checkout unavailable.")
    expect(productSource).toContain('useTranslations("catalog")')
    expect(productSource).toContain(
      'tCatalog("product_detail.errors.page_unavailable")'
    )
    expect(productSource).toContain(
      'tCatalog("product_detail.errors.page_status"'
    )
    expect(productSource).not.toContain("Product unavailable")
    expect(productSource).not.toContain("Status:")
  })

  it("routes every remaining Pages error shell through localized copy", () => {
    const localizedPages = [
      "pages/~sf/[market]/account/auth/[action]/[[...value]].tsx",
      "pages/~sf/[market]/account/index.tsx",
      "pages/~sf/[market]/account/order/[publicOrderId].tsx",
      "pages/~sf/[market]/advice/[slug].tsx",
      "pages/~sf/[market]/advice/index.tsx",
      "pages/~sf/[market]/brand/[slug].tsx",
      "pages/~sf/[market]/brands/index.tsx",
      "pages/~sf/[market]/cart.tsx",
      "pages/~sf/[market]/categories/index.tsx",
      "pages/~sf/[market]/category/[slug].tsx",
      "pages/~sf/[market]/checkout/confirmation/[publicOrderId].tsx",
      "pages/~sf/[market]/checkout/result.tsx",
      "pages/~sf/[market]/collection/[slug].tsx",
      "pages/~sf/[market]/collections/index.tsx",
      "pages/~sf/[market]/home.tsx",
      "pages/~sf/[market]/information/[slug].tsx",
      "pages/~sf/[market]/products/index.tsx",
      "pages/~sf/[market]/reviews/product/[token].tsx",
      "pages/~sf/[market]/search.tsx",
      "pages/~sf/[market]/static/[pageKey].tsx",
    ]

    for (const relativePath of localizedPages) {
      const pageSource = source(relativePath)
      expect(pageSource, relativePath).toContain("LocalizedPageError")
      expect(pageSource, relativePath).not.toMatch(RAW_ENGLISH_PAGE_ERROR)
    }

    const notFoundSource = source("pages/404.tsx")
    const globalErrorSource = source("pages/_error.tsx")
    expect(notFoundSource).toContain("StandalonePagesError")
    expect(notFoundSource).not.toContain("Page not found.")
    expect(globalErrorSource).toContain("StandalonePagesError")
    expect(globalErrorSource).not.toContain(
      "The storefront is temporarily unavailable."
    )
  })
})
