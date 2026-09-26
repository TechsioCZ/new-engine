import { expect, test } from "@playwright/test"

const storyUrl =
  "/iframe.html?id=molecules-command-with-hotkey--playground&viewMode=story"

test("palette shortcut keeps focus inside the Storybook preview", async ({
  page,
}) => {
  await page.goto("/?path=/story/molecules-command-with-hotkey--playground")
  const preview = page.frameLocator("#storybook-preview-iframe")
  await preview
    .getByRole("button", { name: "Save document", exact: true })
    .click()
  await expect(preview.getByTestId("palette-registrations")).toHaveText("2")
  await expect(preview.getByTestId("palette-save-count")).toHaveText("1")
  await expect(preview.getByTestId("palette-current-view")).toHaveText(
    "Document"
  )
  await page.keyboard.press("Control+k")
  const input = preview.getByRole("combobox", { name: "Actions" })
  await expect(input).toBeFocused()
  await page.keyboard.type("documentation")
  await expect(input).toHaveValue("documentation")
  await page.keyboard.press("Enter")
  await expect(preview.getByTestId("palette-result")).toHaveText("Help opened")
  await expect(preview.getByTestId("palette-current-view")).toHaveText("Help")
  await expect(
    preview.getByRole("button", { name: "Open command palette", exact: true })
  ).toBeFocused()
})

test("button, shortcut and palette invoke the same application action", async ({
  page,
}) => {
  await page.goto(storyUrl)
  const count = page.getByTestId("palette-save-count")
  await expect(page.getByTestId("palette-registrations")).toHaveText("2")
  await expect(page.getByTestId("palette-current-view")).toHaveText("Overview")
  await page.evaluate(() => {
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.ctrlKey && ["k", "s"].includes(event.key.toLowerCase())) {
          const key = event.key.toUpperCase()
          queueMicrotask(() => {
            document.documentElement.dataset[`hotkey${key}DefaultPrevented`] =
              String(event.defaultPrevented)
          })
        }
      },
      { capture: true }
    )
  })
  await page.keyboard.press("Control+k")
  await expect(page.locator("html")).toHaveAttribute(
    "data-hotkey-k-default-prevented",
    "true"
  )
  await expect(page.getByRole("combobox", { name: "Actions" })).toBeFocused()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Save document", exact: true }).click()
  await expect(count).toHaveText("1")
  await expect(page.getByTestId("palette-current-view")).toHaveText("Document")
  await page.keyboard.press("Control+s")
  await expect(count).toHaveText("2")
  await expect(page.getByTestId("palette-current-view")).toHaveText("Document")
  await expect(page.locator("html")).toHaveAttribute(
    "data-hotkey-s-default-prevented",
    "true"
  )
  await page.keyboard.press("Control+k")
  const input = page.getByRole("combobox", { name: "Actions" })
  await expect(input).toBeFocused()
  await input.fill("persist")
  await expect(page.getByRole("option")).toHaveText(["Save documentCtrl S"])
  await input.press("Enter")
  await expect(count).toHaveText("3")
  await expect(page.getByTestId("palette-current-view")).toHaveText("Document")
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await expect(
    page.getByRole("button", { name: "Open command palette", exact: true })
  ).toBeFocused()
})

test("help remains searchable without its own shortcut", async ({ page }) => {
  await page.goto(storyUrl)
  await expect(page.getByTestId("palette-registrations")).toHaveText("2")
  await page
    .getByRole("button", { name: "Open command palette", exact: true })
    .click()
  await expect(page.getByRole("option")).toHaveCount(2)
  const input = page.getByRole("combobox", { name: "Actions" })
  await input.fill("documentation")
  await page.getByRole("option", { name: "Help", exact: true }).click()
  await expect(page.getByTestId("palette-result")).toHaveText("Help opened")
  await expect(page.getByTestId("palette-current-view")).toHaveText("Help")
  await expect(page.getByRole("dialog")).not.toBeVisible()
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("palette-save-count")).toHaveText("1")
  await expect(page.getByTestId("palette-current-view")).toHaveText("Document")
})

test("application availability applies to buttons, shortcuts and palette items", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-command-with-hotkey--availability&viewMode=story"
  )
  await page.getByRole("button", { name: "Disable saving" }).click()
  await expect(
    page.getByRole("button", { name: "Save document", exact: true })
  ).toBeDisabled()
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("palette-save-count")).toHaveText("0")
  await page.keyboard.press("Control+k")
  const input = page.getByRole("combobox", { name: "Actions" })
  await input.fill("persist")
  await expect(page.getByRole("option")).toHaveAttribute(
    "aria-disabled",
    "true"
  )
  await input.press("Enter")
  await expect(page.getByTestId("palette-save-count")).toHaveText("0")
  await input.press("Escape")
  await page.getByRole("button", { name: "Enable saving" }).click()
  await page.keyboard.press("Control+s")
  await expect(page.getByTestId("palette-save-count")).toHaveText("1")
  await expect(page.getByTestId("palette-current-view")).toHaveText("Document")
})

test("holding the palette shortcut does not toggle it or duplicate registrations", async ({
  page,
}) => {
  await page.goto(storyUrl)
  await expect(page.getByTestId("palette-registrations")).toHaveText("2")
  await page.keyboard.down("Control")
  await page.keyboard.down("k")
  await expect(
    page.getByRole("dialog", { name: "Command palette" })
  ).toBeVisible()
  await page.keyboard.down("k")
  await expect(page.getByRole("combobox", { name: "Actions" })).toBeFocused()
  await page.keyboard.up("k")
  await page.keyboard.up("Control")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).not.toBeVisible()
})
