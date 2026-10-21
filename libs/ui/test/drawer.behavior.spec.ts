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
    // biome-ignore lint/suspicious/noSkippedTests: Run shared behavior coverage once, not per visual device.
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

  test("edits the active profile, persists saves, discards cancelled drafts and restores focus", async ({
    page,
  }) => {
    await openStory(page, "molecules-drawer--multiple-triggers")

    const adaTrigger = page.getByRole("button", { name: "Edit Ada" })
    await adaTrigger.click()
    let dialog = page.getByRole("dialog", { name: "Edit profile" })
    await expect(
      dialog.getByRole("textbox", { name: "Full name" })
    ).toHaveValue("Ada Lovelace")
    await expect(
      dialog.getByRole("textbox", { name: "Email address" })
    ).toHaveValue("ada@example.com")
    const nameInput = dialog.getByRole("textbox", { name: "Full name" })
    await nameInput.fill("   ")
    await dialog.getByRole("button", { name: "Save changes" }).click()
    await expect(dialog).toBeVisible()
    await expect(nameInput).toHaveAttribute("pattern", String.raw`.*\S.*`)
    expect(
      await nameInput.evaluate(
        (input: HTMLInputElement) => input.validity.patternMismatch
      )
    ).toBe(true)
    await nameInput.fill("Ada Lovelace")
    await dialog
      .getByRole("textbox", { name: "Email address" })
      .fill("ada@northstar.example")
    await dialog.getByRole("button", { name: "Save changes" }).click()
    await expect(dialog).toHaveCount(0)
    await expect(adaTrigger).toBeFocused()
    await expect(page.getByRole("status")).toHaveText(
      "Profile saved for Ada Lovelace."
    )

    await adaTrigger.click()
    dialog = page.getByRole("dialog", { name: "Edit profile" })
    await expect(
      dialog.getByRole("textbox", { name: "Email address" })
    ).toHaveValue("ada@northstar.example")
    await dialog
      .getByRole("textbox", { name: "Full name" })
      .fill("Unsaved draft")
    await dialog.getByRole("button", { name: "Cancel" }).click()
    await expect(dialog).toHaveCount(0)
    await adaTrigger.click()
    await expect(
      dialog.getByRole("textbox", { name: "Full name" })
    ).toHaveValue("Ada Lovelace")
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)

    const graceTrigger = page.getByRole("button", { name: "Edit Grace" })
    await graceTrigger.click()
    dialog = page.getByRole("dialog", { name: "Edit profile" })
    await expect(
      dialog.getByRole("textbox", { name: "Email address" })
    ).toHaveValue("grace@example.com")
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
    await expect(graceTrigger).toBeFocused()
  })

  test("wraps narrow-screen footer actions without clipping button labels", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 740 })
    await openStory(page, "molecules-drawer--multiple-triggers")
    await page.getByRole("button", { name: "Edit Ada" }).click()
    const dialog = page.getByRole("dialog", { name: "Edit profile" })
    const save = dialog.getByRole("button", { name: "Save changes" })
    await expect(save).toBeVisible()
    await expect(save.locator("..")).toHaveCSS("flex-wrap", "wrap")
    expect(
      await save.evaluate(
        (button) => button.scrollHeight <= button.clientHeight
      )
    ).toBe(true)
    await dialog.getByRole("button", { name: "Cancel" }).click()
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
