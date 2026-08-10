import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { parseEnv } from "node:util"

import { expect as playwrightExpect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const workspaceRoot = path.resolve(process.cwd(), "../..")
const rootEnvPath = path.resolve(workspaceRoot, ".env")
const rootEnv = existsSync(rootEnvPath)
  ? parseEnv(readFileSync(rootEnvPath, "utf-8"))
  : {}

const readEnv = (...names: string[]): string | undefined => {
  for (const name of names) {
    const value = process.env[name] ?? rootEnv[name]

    if (value !== undefined && value !== "") {
      return value
    }
  }

  return undefined
}

const assertDefined = (value: string | undefined, message: string): string => {
  if (value === undefined) {
    throw new Error(message)
  }

  return value
}

const adminEmail = readEnv("MEDUSA_ADMIN_E2E_EMAIL", "DC_SUPERADMIN_EMAIL")
const adminPassword = readEnv(
  "MEDUSA_ADMIN_E2E_PASSWORD",
  "DC_SUPERADMIN_PASSWORD",
)
const skipAuthenticatedAdmin = process.env["MEDUSA_ADMIN_E2E_SKIP_AUTH"] === "1"

const ADMIN_APP_URL_PATTERN = /\/app\/(?!login)/u
const CONTINUE_WITH_EMAIL_NAME = /continue with email/iu
const INVALID_CREDENTIALS_MESSAGE = /invalid email or password/iu
const MEDUSA_STORE_NAME = /medusa store/iu
const ORDERS_LINK_NAME = /^orders$/iu
const PRODUCTS_LINK_NAME = /^products$/iu
const WELCOME_HEADING_NAME = /welcome to medusa/iu

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
  playwrightExpect(
    errors,
    "admin rendered with browser console/runtime errors",
  ).toEqual([])
}

const submitLoginForm = async (page: Page) => {
  await page.getByRole("button", { name: CONTINUE_WITH_EMAIL_NAME }).click()

  const waitForAuthenticated = async (): Promise<"authenticated"> => {
    await page.waitForURL(ADMIN_APP_URL_PATTERN, {
      timeout: 30_000,
      waitUntil: "domcontentloaded",
    })
    return "authenticated"
  }
  const waitForInvalidCredentials =
    async (): Promise<"invalid_credentials"> => {
      await page
        .getByText(INVALID_CREDENTIALS_MESSAGE)
        .waitFor({ state: "visible", timeout: 30_000 })
      return "invalid_credentials"
    }
  const authResult = await Promise.race([
    waitForAuthenticated(),
    waitForInvalidCredentials(),
  ])

  if (authResult === "invalid_credentials") {
    throw new Error(
      `Medusa admin smoke login failed for ${adminEmail}: invalid email or password. Set MEDUSA_ADMIN_E2E_EMAIL and MEDUSA_ADMIN_E2E_PASSWORD for this deployed environment.`,
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

  await playwrightExpect(
    page.getByRole("heading", { name: WELCOME_HEADING_NAME }),
  ).toBeVisible()
  await playwrightExpect(
    page.getByRole("button", { name: CONTINUE_WITH_EMAIL_NAME }),
  ).toBeVisible()

  const interactiveElements = await page
    .locator('a, button, input, textarea, select, [role="button"]')
    .count()
  const bodyText = await page.locator("body").textContent()

  playwrightExpect(bodyText?.trim().length ?? 0).toBeGreaterThan(20)
  playwrightExpect(interactiveElements).toBeGreaterThan(2)
  expectNoBrowserErrors(browserErrors)
})

test("renders the authenticated Medusa admin shell without browser errors", async ({
  page,
}, testInfo) => {
  testInfo.skip(
    skipAuthenticatedAdmin ||
      adminEmail === undefined ||
      adminPassword === undefined,
    "Set MEDUSA_ADMIN_E2E_EMAIL/MEDUSA_ADMIN_E2E_PASSWORD or DC_SUPERADMIN_EMAIL/DC_SUPERADMIN_PASSWORD to smoke-test the authenticated admin shell.",
  )

  const browserErrors = captureBrowserErrors(page)

  await page.goto("/app/login", { waitUntil: "domcontentloaded" })
  await page.waitForLoadState("networkidle")
  expectNoBrowserErrors(browserErrors)

  await page
    .locator('input[name="email"], input[type="email"]')
    .first()
    .fill(
      assertDefined(
        adminEmail,
        "adminEmail is required to submit the login form",
      ),
    )
  await page
    .locator('input[name="password"], input[type="password"]')
    .first()
    .fill(
      assertDefined(
        adminPassword,
        "adminPassword is required to submit the login form",
      ),
    )

  await submitLoginForm(page)
  await page.waitForLoadState("networkidle")
  expectNoBrowserErrors(browserErrors)

  await playwrightExpect(
    page.getByRole("button", { name: MEDUSA_STORE_NAME }),
  ).toBeVisible()
  await playwrightExpect(
    page.getByRole("link", { name: PRODUCTS_LINK_NAME }),
  ).toBeVisible()
  await playwrightExpect(
    page.getByRole("link", { name: ORDERS_LINK_NAME }),
  ).toBeVisible()
})
