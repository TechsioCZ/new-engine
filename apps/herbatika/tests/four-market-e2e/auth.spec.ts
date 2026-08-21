import { expect, type Page, test } from "@playwright/test"
import { gotoMarketPage } from "./journey-helpers"
import { fixtureForProject } from "./market-fixtures"

const E2E_CUSTOMER = {
  addresses: [],
  email: "e2e.customer@example.invalid",
  first_name: "E2E",
  id: "cus_four_market_e2e",
  last_name: "Customer",
}

const mockSession = (page: Page) =>
  page.route("**/api/storefront-auth/session", (route) => {
    const hasFixtureSession = Boolean(
      route
        .request()
        .headers()
        .cookie?.includes("herbatika_auth_session_token=four-market-e2e-token")
    )

    return route.fulfill({
      body: JSON.stringify(
        hasFixtureSession
          ? { authenticated: true, user: E2E_CUSTOMER }
          : { authenticated: false }
      ),
      contentType: "application/json",
      status: 200,
    })
  })

const mockAccountReads = async (page: Page) => {
  await page.route("**/api/storefront-medusa/store/orders**", (route) =>
    route.fulfill({
      body: JSON.stringify({ count: 0, limit: 1, offset: 0, orders: [] }),
      contentType: "application/json",
      status: 200,
    })
  )
}

test("anonymous account redirect and invalid login stay market-local", async ({
  page,
}, testInfo) => {
  const fixture = fixtureForProject(testInfo.project.name)
  await mockSession(page)
  await page.route("**/api/storefront-auth/login", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ message: "E2E invalid credentials" }),
      contentType: "application/json",
      status: 401,
    })
  })

  await gotoMarketPage(page, fixture.accountPath)
  await expect(page).toHaveURL((url) => url.pathname === fixture.loginPath)
  await page.locator("#login-email").fill("missing@example.invalid")
  await page.locator("#login-password").fill("wrong-password")
  await page
    .getByRole("button", { exact: true, name: fixture.signInLabel })
    .click()

  await expect(
    page.getByText(fixture.invalidCredentialsLabel, { exact: true })
  ).toBeVisible()
  await expect(page).toHaveURL((url) => url.pathname === fixture.loginPath)
})

test("successful login restores the customer account surface", async ({
  page,
}, testInfo) => {
  const fixture = fixtureForProject(testInfo.project.name)
  let loginPayload: unknown
  await mockSession(page)
  await mockAccountReads(page)
  await page.route("**/api/storefront-auth/login", async (route) => {
    loginPayload = route.request().postDataJSON()
    await route.fulfill({
      body: JSON.stringify({ authenticated: true, user: E2E_CUSTOMER }),
      contentType: "application/json",
      headers: {
        "set-cookie":
          "herbatika_auth_session_token=four-market-e2e-token; Path=/; SameSite=Lax",
      },
      status: 200,
    })
  })

  await gotoMarketPage(page, fixture.loginPath)
  await page.locator("#login-email").fill("e2e.customer@example.invalid")
  await page.locator("#login-password").fill("safe-fixture-password")
  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/storefront-auth/login"
    ),
    page
      .getByRole("button", { exact: true, name: fixture.signInLabel })
      .click(),
  ])
  expect(loginResponse.ok(), "login response must succeed").toBe(true)
  await expect
    .poll(() => loginPayload)
    .toEqual({
      email: "e2e.customer@example.invalid",
      password: "safe-fixture-password",
    })

  await gotoMarketPage(page, fixture.accountPath)
  await expect(
    page.getByRole("heading", { name: "E2E Customer" })
  ).toBeVisible()
  await expect(
    page.getByText(E2E_CUSTOMER.email, { exact: true })
  ).toBeVisible()
})
