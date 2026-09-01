import { expect, type Page, test } from "@playwright/test"

async function openStory(page: Page, storyId: string) {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`, {
    waitUntil: "domcontentloaded",
  })
  await page.locator("#storybook-root").waitFor()
}

test.describe("Drawer behavior", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "Drawer interactions are covered once on desktop"
    )
    await page.emulateMedia({ reducedMotion: "reduce" })
  })

  test("opens, closes with Escape, and restores trigger focus", async ({
    page,
  }) => {
    await openStory(page, "molecules-drawer--playground")

    const trigger = page.getByRole("button", { name: "Open drawer" })
    await trigger.click()
    await expect(
      page.getByRole("dialog", { name: "Playground drawer" })
    ).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(
      page.getByRole("dialog", { name: "Playground drawer" })
    ).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })

  test("reports controlled state changes", async ({ page }) => {
    await openStory(page, "molecules-drawer--controlled")

    await expect(page.getByText("Drawer state: closed")).toBeVisible()
    await page.getByRole("button", { name: "Open controlled drawer" }).click()

    const dialog = page.getByRole("dialog", { name: "Controlled drawer" })
    await expect(dialog).toBeVisible()
    await expect(page.getByText("Drawer state: open")).toBeVisible()

    await dialog.getByRole("button", { name: "Close" }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByText("Drawer state: closed")).toBeVisible()
  })

  test("exposes the value of the active trigger", async ({ page }) => {
    await openStory(page, "molecules-drawer--multiple-triggers")

    await page.getByRole("button", { name: "Edit Ada" }).click()
    let dialog = page.getByRole("dialog", { name: "Edit profile" })
    await expect(dialog.getByText("ada@example.com")).toBeVisible()
    await dialog.getByRole("button", { name: "Close" }).click()

    await page.getByRole("button", { name: "Edit Grace" }).click()
    dialog = page.getByRole("dialog", { name: "Edit profile" })
    await expect(dialog.getByText("grace@example.com")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
  })

  test("keeps background controls interactive when non-modal", async ({
    page,
  }) => {
    await openStory(page, "molecules-drawer--non-modal")

    await page.getByRole("button", { name: "Open activity panel" }).click()
    const dialog = page.getByRole("dialog", { name: "Recent activity" })
    await expect(dialog).toBeVisible()

    await page.getByRole("button", { name: "Refresh results" }).click()
    await expect(page.getByText("Refreshes: 1")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
  })
})
