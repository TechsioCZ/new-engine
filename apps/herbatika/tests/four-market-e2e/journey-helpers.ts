import { expect, type Page } from "@playwright/test"
import type { MarketFixture } from "./market-fixtures"

const NON_WORDS = /[^\p{L}\p{N}]+/gu
const HTTPS_URL = /^https:\/\//u
const CART_LINE_ITEM_PATH =
  /\/store\/carts\/[^/]+\/line-items(?:\/[^/?]+)?(?:\?|$)/u

export const expectMarketDocument = async (
  page: Page,
  fixture: MarketFixture
) => {
  await expect(page.locator("html")).toHaveAttribute("lang", fixture.locale)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    HTTPS_URL
  )
}

export const gotoMarketPage = async (page: Page, path: string) => {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" })
  expect(
    response,
    `navigation to ${path} must return a response`
  ).not.toBeNull()
  expect(response?.status(), `navigation to ${path} must return HTTP 200`).toBe(
    200
  )
}

export const findCatalogProduct = async (
  page: Page,
  fixture: MarketFixture
) => {
  await gotoMarketPage(page, fixture.productRoot)
  await expectMarketDocument(page, fixture)

  const productLinks = page.locator(
    `main a[href^="${fixture.productRoot}/"]:visible`
  )
  await expect
    .poll(() => productLinks.count(), { message: "catalog needs a product" })
    .toBeGreaterThan(0)

  const candidates = await productLinks.evaluateAll((links) =>
    links.map((link) => ({
      href: link.getAttribute("href") ?? "",
      title: link.textContent?.replace(/\s+/gu, " ").trim() ?? "",
    }))
  )
  const titledCandidates = candidates.filter(
    ({ href, title }) => href && title.length >= 3
  )
  expect(
    titledCandidates.length,
    "catalog needs a titled product link"
  ).toBeGreaterThan(0)
  const uniqueCandidates = [
    ...new Map(
      titledCandidates.map((candidate) => [candidate.href, candidate])
    ).values(),
  ].slice(0, 8)

  for (const candidate of uniqueCandidates) {
    await gotoMarketPage(page, candidate.href)
    const addButton = page
      .getByRole("button", { exact: true, name: fixture.addToCartLabel })
      .filter({ visible: true })
      .first()
    const quantityInput = page.getByRole("spinbutton").first()
    if (
      (await addButton.count()) > 0 &&
      (await quantityInput.count()) > 0 &&
      (await addButton.isEnabled()) &&
      Number(await quantityInput.getAttribute("max")) >= 2
    ) {
      return candidate
    }
  }

  throw new Error("Catalog needs a purchasable product with inventory >= 2")
}

export const verifySearchJourney = async (
  page: Page,
  fixture: MarketFixture,
  product: { href: string; title: string }
) => {
  await gotoMarketPage(page, "/")
  const query =
    product.title
      .split(NON_WORDS)
      .find((part) => part.length >= 3)
      ?.slice(0, 40) ?? product.title.slice(0, 40)
  const input = page
    .getByRole("combobox", { name: fixture.searchInputLabel })
    .filter({ visible: true })
    .first()

  await input.fill(query)
  await input.press("Enter")
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === fixture.searchPath && url.searchParams.get("q") === query
  )
  await expect
    .poll(
      () => page.locator(`main a[href^="${fixture.productRoot}/"]`).count(),
      { message: "search needs at least one product result" }
    )
    .toBeGreaterThan(0)
}

export const addProductAndOpenCart = async (
  page: Page,
  fixture: MarketFixture,
  productHref: string
) => {
  await gotoMarketPage(page, productHref)
  await expectMarketDocument(page, fixture)
  await expect(page.locator("main")).toContainText(fixture.currencyPattern)

  const addButton = page
    .getByRole("button", { exact: true, name: fixture.addToCartLabel })
    .filter({ visible: true })
    .first()
  await expect(addButton).toBeEnabled()
  const [addResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        CART_LINE_ITEM_PATH.test(response.url())
    ),
    addButton.click(),
  ])
  expect(addResponse.ok(), "add-to-cart response must succeed").toBe(true)
  await gotoMarketPage(page, fixture.cartPath)
  await expect(page.getByRole("spinbutton").first()).toBeVisible()
}

export const updateAndRemoveCartLine = async (page: Page) => {
  const quantityInput = page.getByRole("spinbutton").first()
  const line = quantityInput.locator("xpath=ancestor::article[1]")
  expect(
    Number(await quantityInput.getAttribute("max"))
  ).toBeGreaterThanOrEqual(2)

  const [updateResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        CART_LINE_ITEM_PATH.test(response.url())
    ),
    (async () => {
      await quantityInput.fill("2")
      await quantityInput.press("Tab")
    })(),
  ])
  expect(updateResponse.ok(), "cart quantity response must succeed").toBe(true)
  await expect(quantityInput).toHaveValue("2")

  const removeButton = line.locator("button[aria-label]").last()
  await expect(removeButton).toBeVisible()
  const [removeResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        CART_LINE_ITEM_PATH.test(response.url())
    ),
    removeButton.click(),
  ])
  expect(removeResponse.ok(), "remove-from-cart response must succeed").toBe(
    true
  )
  await expect(page.getByRole("spinbutton")).toHaveCount(0)
}
