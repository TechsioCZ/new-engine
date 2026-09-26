import { expect, test } from "@playwright/test"

test("filters keywords before changing the current view", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=molecules-command--playground&viewMode=story"
  )
  const input = page.getByRole("combobox", { name: "Actions" })
  await expect(input).toBeVisible()
  await expect(page.getByRole("option")).toHaveCount(3)

  await input.fill("invoice")
  await expect(page.getByRole("option")).toHaveText(["Orders"])
  await expect(page.getByTestId("command-result")).toHaveText("Overview")
  await input.press("Enter")
  await expect(page.getByTestId("command-result")).toHaveText("Orders")
})

test("matches labels without case or accent sensitivity and preserves the query", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=molecules-command--localized&viewMode=story")
  const input = page.getByRole("combobox", { name: "Actions" })
  await input.fill("prehled")
  await expect(page.getByRole("option")).toHaveText(["Přehled"])
  await input.press("Enter")
  await expect(page.getByTestId("command-result")).toHaveText("Přehled")
  await expect(input).toHaveValue("prehled")
})

test("pointer and repeated Enter activation keep the selected view", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-command--playground&viewMode=story"
  )
  const input = page.getByRole("combobox", { name: "Actions" })
  await input.fill("invoice")
  await page.getByRole("option", { name: "Orders" }).click()
  await expect(page.getByTestId("command-result")).toHaveText("Orders")
  await input.press("Enter")
  await expect(page.getByTestId("command-result")).toHaveText("Orders")
  await input.press("Enter")
  await expect(page.getByTestId("command-result")).toHaveText("Orders")
})

test("visible groups and empty announcement follow the filtered collection", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=molecules-command--grouped&viewMode=story")
  const input = page.getByRole("combobox", { name: "Actions" })
  await expect(page.getByRole("group", { name: "Navigation" })).toBeVisible()
  await expect(page.getByRole("group", { name: "Account" })).toBeVisible()
  await input.fill("preferences")
  await expect(page.getByRole("group", { name: "Navigation" })).toHaveCount(0)
  await expect(page.getByRole("group", { name: "Account" })).toBeVisible()
  await expect(page.getByRole("option")).toHaveText(["Settings"])
  await input.fill("no-such-action")
  await expect(page.getByRole("option")).toHaveCount(0)
  await expect(page.getByRole("group")).toHaveCount(0)
  await expect(
    page.getByRole("status").filter({ hasText: "No matching actions" })
  ).toHaveText("No matching actions")
  await expect(input).not.toHaveAttribute("aria-activedescendant")
  await input.press("Enter")
  await expect(page.getByTestId("command-result")).toHaveText("Overview")
})

test("navigation skips disabled options without activating an action", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-command--disabled-items&viewMode=story"
  )
  const input = page.getByRole("combobox", { name: "Actions" })
  await input.focus()
  await input.press("Home")
  await expect(page.getByRole("option", { name: "Overview" })).toHaveAttribute(
    "data-highlighted",
    ""
  )
  await input.press("ArrowDown")
  await expect(page.getByRole("option", { name: "Settings" })).toHaveAttribute(
    "data-highlighted",
    ""
  )
  await expect(page.getByTestId("command-result")).toHaveText("Overview")
  await input.fill("invoice")
  await expect(page.getByRole("option", { name: "Orders" })).toHaveAttribute(
    "aria-disabled",
    "true"
  )
  await expect(input).not.toHaveAttribute("aria-activedescendant")
  await input.press("Enter")
  await expect(page.getByTestId("command-result")).toHaveText("Overview")
})

test("a highlighted action becoming disabled cannot activate", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-command--changing-items&viewMode=story"
  )
  const input = page.getByRole("combobox", { name: "Actions" })
  await input.fill("invoice")
  await input.press("ArrowDown")
  await expect(page.getByRole("option", { name: "Orders" })).toHaveAttribute(
    "data-highlighted",
    ""
  )
  await page.getByRole("button", { name: "Disable Orders" }).click()
  await expect(page.getByRole("option", { name: "Orders" })).toHaveAttribute(
    "aria-disabled",
    "true"
  )
  await input.focus()
  await input.press("Enter")
  await expect(page.getByTestId("command-result")).toHaveText("Overview")
  await expect(input).not.toHaveAttribute("aria-activedescendant")
})

test("removing and restoring an action updates the filtered results", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-command--changing-items&viewMode=story"
  )
  const input = page.getByRole("combobox", { name: "Actions" })
  await input.fill("invoice")
  await expect(page.getByRole("option", { name: "Orders" })).toHaveAttribute(
    "data-highlighted",
    ""
  )
  await page.getByRole("button", { name: "Remove Orders" }).click()
  await expect(page.getByRole("option")).toHaveCount(0)
  await expect(input).not.toHaveAttribute("aria-activedescendant")
  await input.focus()
  await input.press("Enter")
  await expect(page.getByTestId("command-result")).toHaveText("Overview")
  await page.getByRole("button", { name: "Reset actions" }).click()
  await expect(page.getByRole("option")).toHaveText(["Orders"])
  await input.press("Enter")
  await expect(page.getByTestId("command-result")).toHaveText("Orders")
})

test("inline Tab traverses the page without trapping focus", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-command--inline-focus&viewMode=story"
  )
  await page.getByRole("button", { name: "Before command" }).focus()
  await page.keyboard.press("Tab")
  await expect(page.getByRole("combobox", { name: "Actions" })).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(
    page.getByRole("button", { name: "After command" })
  ).toBeFocused()
  await page.keyboard.press("Shift+Tab")
  await expect(page.getByRole("combobox", { name: "Actions" })).toBeFocused()
})

test("composing Enter and modified input editing do not activate an action", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-command--playground&viewMode=story"
  )
  const input = page.getByRole("combobox", { name: "Actions" })
  await input.fill("invoice")
  await expect(page.getByRole("option", { name: "Orders" })).toHaveAttribute(
    "data-highlighted",
    ""
  )
  await input.dispatchEvent("keydown", {
    key: "Enter",
    code: "Enter",
    isComposing: true,
  })
  await expect(page.getByTestId("command-result")).toHaveText("Overview")
  await input.press("Control+A")
  await input.press("Backspace")
  await expect(input).toHaveValue("")
  await expect(page.getByRole("option")).toHaveCount(3)
  await expect(page.getByTestId("command-result")).toHaveText("Overview")
})

test("a controlled query updates both input and keyboard collection", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-command--controlled-query&viewMode=story"
  )
  const input = page.getByRole("combobox", { name: "Actions" })
  await expect(input).toHaveValue("invoice")
  await expect(page.getByRole("option")).toHaveText(["Orders"])
  await page.getByRole("button", { name: "Search preferences" }).click()
  await expect(input).toHaveValue("preferences")
  await expect(page.getByRole("option")).toHaveText(["Settings"])
  await input.fill("home")
  await expect(page.getByTestId("command-query")).toHaveText("home")
  await expect(page.getByRole("option")).toHaveText(["Overview"])
})

test("Dialog composition focuses search, traps Tab, closes on Escape and restores focus", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=molecules-command--in-dialog&viewMode=story")
  const trigger = page.getByRole("button", { name: "Open command palette" })
  await trigger.click()
  const dialog = page.getByRole("dialog", { name: "Command palette" })
  const input = dialog.getByRole("combobox", { name: "Actions" })
  await expect(dialog).toBeVisible()
  await expect(input).toBeFocused()
  await input.fill("invoice")
  await input.press("Enter")
  await input.press("Enter")
  await expect(dialog.getByTestId("command-result")).toHaveText("Orders")
  await input.press("Tab")
  await expect(
    dialog.getByRole("button", { name: "Close dialog" })
  ).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(input).toBeFocused()
  await input.press("Escape")
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
})
