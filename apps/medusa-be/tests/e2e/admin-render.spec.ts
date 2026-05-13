import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parseEnv } from "node:util"
import { expect, type Page, test } from "@playwright/test"

const workspaceRoot = resolve(__dirname, "../../../..")
const rootEnvPath = resolve(workspaceRoot, ".env")
const rootEnv = existsSync(rootEnvPath)
  ? parseEnv(readFileSync(rootEnvPath, "utf8"))
  : {}

const readEnv = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name] ?? rootEnv[name]

    if (value) {
      return value
    }
  }
}

const adminEmail = readEnv("MEDUSA_ADMIN_E2E_EMAIL", "DC_SUPERADMIN_EMAIL")
const adminPassword = readEnv(
  "MEDUSA_ADMIN_E2E_PASSWORD",
  "DC_SUPERADMIN_PASSWORD"
)
const skipAuthenticatedAdmin = process.env.MEDUSA_ADMIN_E2E_SKIP_AUTH === "1"

const ADMIN_APP_URL_PATTERN = /\/app\/(?!login)/
const CONTINUE_WITH_EMAIL_NAME = /continue with email/i
const INVALID_CREDENTIALS_MESSAGE = /invalid email or password/i
const MEDUSA_STORE_NAME = /medusa store/i
const ORDERS_LINK_NAME = /^orders$/i
const PRODUCTS_LINK_NAME = /^products$/i
const WELCOME_HEADING_NAME = /welcome to medusa/i

const captureBrowserErrors = (page: Page) => {
  const errors: string[] = []

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console.error: ${message.text()}`)
    }
  })

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`)
  })

  return errors
}

const expectNoBrowserErrors = (errors: string[]) => {
  expect(errors, "admin rendered with browser console/runtime errors").toEqual(
    []
  )
}

const submitLoginForm = async (page: Page) => {
  await page.getByRole("button", { name: CONTINUE_WITH_EMAIL_NAME }).click()

  const authResult = await Promise.race([
    page
      .waitForURL(ADMIN_APP_URL_PATTERN, {
        timeout: 30_000,
        waitUntil: "domcontentloaded",
      })
      .then(() => "authenticated" as const),
    page
      .getByText(INVALID_CREDENTIALS_MESSAGE)
      .waitFor({ state: "visible", timeout: 30_000 })
      .then(() => "invalid_credentials" as const),
  ])

  if (authResult === "invalid_credentials") {
    throw new Error(
      `Medusa admin smoke login failed for ${adminEmail}: invalid email or password. Set MEDUSA_ADMIN_E2E_EMAIL and MEDUSA_ADMIN_E2E_PASSWORD for this deployed environment.`
    )
  }
}

test("renders the Medusa admin login without browser errors", async ({
  page,
}) => {
  const browserErrors = captureBrowserErrors(page)

  await page.goto("/app/login", { waitUntil: "domcontentloaded" })
  await page.waitForLoadState("networkidle")
  expectNoBrowserErrors(browserErrors)

  await expect(
    page.getByRole("heading", { name: WELCOME_HEADING_NAME })
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: CONTINUE_WITH_EMAIL_NAME })
  ).toBeVisible()

  const renderedBody = await page.locator("body").evaluate((body) => ({
    interactiveElements: body.querySelectorAll(
      'a, button, input, textarea, select, [role="button"]'
    ).length,
    textLength: body.innerText.trim().length,
  }))

  expect(renderedBody.textLength).toBeGreaterThan(20)
  expect(renderedBody.interactiveElements).toBeGreaterThan(2)
  expectNoBrowserErrors(browserErrors)
})

test("renders the authenticated Medusa admin shell without browser errors", async ({
  page,
}) => {
  test.skip(
    skipAuthenticatedAdmin || !(adminEmail && adminPassword),
    "Set MEDUSA_ADMIN_E2E_EMAIL/MEDUSA_ADMIN_E2E_PASSWORD or DC_SUPERADMIN_EMAIL/DC_SUPERADMIN_PASSWORD to smoke-test the authenticated admin shell."
  )

  const browserErrors = captureBrowserErrors(page)

  await page.goto("/app/login", { waitUntil: "domcontentloaded" })
  await page.waitForLoadState("networkidle")
  expectNoBrowserErrors(browserErrors)

  await page
    .locator('input[name="email"], input[type="email"]')
    .first()
    .fill(adminEmail)
  await page
    .locator('input[name="password"], input[type="password"]')
    .first()
    .fill(adminPassword)

  await submitLoginForm(page)
  await page.waitForLoadState("networkidle")
  expectNoBrowserErrors(browserErrors)

  await expect(
    page.getByRole("button", { name: MEDUSA_STORE_NAME })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: PRODUCTS_LINK_NAME })
  ).toBeVisible()
  await expect(page.getByRole("link", { name: ORDERS_LINK_NAME })).toBeVisible()
})
