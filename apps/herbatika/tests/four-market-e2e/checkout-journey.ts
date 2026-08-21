import { expect, type Page } from "@playwright/test"
import { gotoMarketPage } from "./journey-helpers"
import type { MarketFixture } from "./market-fixtures"

const selectShippingAndPayment = async (page: Page) => {
  const radioGroups = page.getByRole("radiogroup")
  await expect.poll(() => radioGroups.count()).toBeGreaterThanOrEqual(2)
  const shippingRadios = radioGroups.first().getByRole("radio")
  const paymentRadios = radioGroups.nth(1).getByRole("radio")

  for (let index = 0; index < (await shippingRadios.count()); index += 1) {
    const option = shippingRadios.nth(index)
    if (await option.isDisabled()) {
      continue
    }
    await option.check()
    const payment = await waitForEnabledPayment(page, paymentRadios)
    if (payment) {
      await payment.check()
      return
    }
  }

  throw new Error(
    "No shipping/payment combination reached the checkout boundary"
  )
}

const waitForEnabledPayment = async (
  page: Page,
  paymentRadios: ReturnType<Page["getByRole"]>
) => {
  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    for (let index = 0; index < (await paymentRadios.count()); index += 1) {
      const payment = paymentRadios.nth(index)
      if (!(await payment.isDisabled())) {
        return payment
      }
    }
    await page.waitForTimeout(200)
  }
  return null
}

const fillCheckoutAddress = async (page: Page, fixture: MarketFixture) => {
  await page.locator("#checkout-shipping-first-name").fill("E2E")
  await page.locator("#checkout-shipping-last-name").fill("Customer")
  await page.locator("#checkout-shipping-email").fill("e2e@example.invalid")
  await page
    .locator("#checkout-shipping-phone")
    .fill(fixture.checkoutAddress.phone)
  await page.locator("#checkout-shipping-address-1").fill("Test street 1")
  await page
    .locator("#checkout-shipping-city")
    .fill(fixture.checkoutAddress.city)
  await page
    .locator("#checkout-shipping-postal-code")
    .fill(fixture.checkoutAddress.postalCode)

  const sameAddress = page.locator("#checkout-use-same-address")
  if (!(await sameAddress.isChecked())) {
    await sameAddress.check()
  }
}

export const reachPreOrderBoundary = async (
  page: Page,
  fixture: MarketFixture
) => {
  await gotoMarketPage(page, fixture.checkoutShippingPath)
  await selectShippingAndPayment(page)
  await expect
    .poll(() =>
      page.locator(`a[href="${fixture.checkoutContactPath}"]`).count()
    )
    .toBeGreaterThan(0)
  await gotoMarketPage(page, fixture.checkoutContactPath)
  await fillCheckoutAddress(page, fixture)

  await page.locator('button[form="checkout-address-form"]').click()
  await expect(page).toHaveURL(
    (url) => url.pathname === fixture.checkoutReviewPath
  )
  await expect(
    page.getByRole("button", {
      exact: true,
      name: fixture.completeOrderLabel,
    })
  ).toBeVisible()
}
