import assert from "node:assert/strict"
import { test } from "node:test"
import { chromium } from "@playwright/test"
import { loadReleaseFixture } from "./config.mjs"

const fixture = await loadReleaseFixture()

test("wire.browser-document-navigation", async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const market of fixture.markets) {
      const context = await browser.newContext({ ignoreHTTPSErrors: true })
      const page = await context.newPage()
      const requests = []
      page.on("request", (request) => {
        requests.push({
          headers: request.headers(),
          resourceType: request.resourceType(),
          url: request.url(),
        })
      })

      await page.goto(new URL(market.home, market.browserOrigin).href, {
        waitUntil: "domcontentloaded",
      })
      const absoluteProductUrl = new URL(
        market.currentProduct,
        market.browserOrigin
      ).href
      const productLink = page
        .locator(
          `a[href="${market.currentProduct}"], a[href="${absoluteProductUrl}"]`
        )
        .first()
      assert.equal(await productLink.count(), 1)
      requests.length = 0

      const [navigationResponse] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url() === absoluteProductUrl &&
            response.request().resourceType() === "document"
        ),
        page.waitForURL(absoluteProductUrl),
        productLink.click(),
      ])
      await page.waitForLoadState("domcontentloaded")

      const documentRequests = requests.filter(
        ({ resourceType }) => resourceType === "document"
      )
      assert.equal(navigationResponse.status(), 200)
      assert.equal(documentRequests.length, 1)
      assert.equal(
        new URL(documentRequests[0].url).pathname,
        market.currentProduct
      )
      assert.equal(documentRequests[0].headers.rsc, undefined)
      assert.equal(
        documentRequests[0].headers["next-router-prefetch"],
        undefined
      )
      assert.equal(
        requests.some(({ url }) => url.includes("/_next/data/")),
        false
      )
      assert.equal(
        await page.locator("html").getAttribute("lang"),
        market.locale
      )
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute("href"),
        `https://${market.host}${market.currentProduct}`
      )
      assert.equal(
        await page.locator('meta[property="og:url"]').getAttribute("content"),
        `https://${market.host}${market.currentProduct}`
      )
      assert.equal(
        await page.evaluate(() =>
          performance
            .getEntriesByType("navigation")
            .some((entry) => entry.type === "navigate")
        ),
        true
      )
      await context.close()
    }
  } finally {
    await browser.close()
  }
})
