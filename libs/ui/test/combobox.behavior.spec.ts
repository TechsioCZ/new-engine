import { expect, test } from "@playwright/test"

const nonEmptyAttribute = /.+/

test("loading does not let keyboard selection reach unrendered options", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=molecules-combobox--loading&viewMode=story")

  const input = page.getByRole("combobox", { name: "Loading results" })
  await expect(page.getByRole("status")).toBeVisible()
  await expect(page.getByRole("option")).toHaveCount(0)

  await input.focus()
  await input.press("ArrowDown")
  await expect(input).not.toHaveAttribute(
    "aria-activedescendant",
    nonEmptyAttribute
  )

  await input.press("Enter")
  await expect(input).toHaveValue("")
})

test("available options remain keyboard selectable", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=molecules-combobox--playground&viewMode=story"
  )

  const input = page.getByRole("combobox", { name: "Select Country" })
  await input.focus()
  await input.press("ArrowDown")
  await expect(
    page.getByRole("option", { name: "Czech Republic" })
  ).toBeVisible()
  await input.press("ArrowDown")
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    nonEmptyAttribute
  )
  await input.press("Enter")
  await expect(input).not.toHaveValue("")
})

test("loading keeps the selected label without exposing hidden options", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-combobox--loading-with-selection&viewMode=story"
  )

  const input = page.getByRole("combobox", { name: "Loading with selection" })
  await expect(input).toHaveValue("Czech Republic")
  await expect(page.getByRole("option")).toHaveCount(0)

  await input.focus()
  await input.press("ArrowDown")
  await expect(input).not.toHaveAttribute(
    "aria-activedescendant",
    nonEmptyAttribute
  )
  await input.press("Enter")
  await expect(input).toHaveValue("Czech Republic")
})

test("error does not let keyboard selection reach unrendered options", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-combobox--error-retry&viewMode=story"
  )

  const input = page.getByRole("combobox", { name: "Search failed" })
  await expect(page.getByRole("alert")).toBeVisible()
  await expect(page.getByRole("option")).toHaveCount(0)

  await input.focus()
  await input.press("ArrowDown")
  await expect(input).not.toHaveAttribute(
    "aria-activedescendant",
    nonEmptyAttribute
  )
  await input.press("Enter")
  await expect(input).toHaveValue("")
})

test("retry remains available when results are in an error state", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-combobox--error-retry&viewMode=story"
  )

  await page.getByRole("button", { name: "Retry" }).click()
  await expect(page.getByText("Retried 1 time(s)")).toBeVisible()
})
