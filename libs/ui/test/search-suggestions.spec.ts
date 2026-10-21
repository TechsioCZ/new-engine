import { expect, type Page, test } from "@playwright/test"

// Embed mode disables Storybook autoplay: this suite owns all user input.
// Story play functions remain covered independently by visual.spec.ts.

async function openStory(page: Page, story: string) {
  await page.goto(`/iframe.html?id=${story}&viewMode=story&embed=true`)
  await expect(page.getByRole("combobox").first()).toBeAttached()
}

test("input and trigger control the scrollable listbox", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await openStory(page, "molecules-combobox--sizes")
  const input = page.getByRole("combobox").nth(2)
  const trigger = page
    .getByRole("button", { name: "Toggle suggestions" })
    .nth(2)
  await input.press("ArrowDown")
  const listbox = page.getByRole("listbox")
  await expect(listbox).toBeVisible()
  const listId = await listbox.getAttribute("id")
  expect(listId).toBeTruthy()
  await expect(input).toHaveAttribute("aria-controls", listId as string)
  await expect(trigger).toHaveAttribute("aria-controls", listId as string)
  await expect(trigger).toHaveAttribute("aria-haspopup", "listbox")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect
    .poll(() =>
      listbox.evaluate((node) => node.scrollHeight > node.clientHeight)
    )
    .toBe(true)

  const lastOption = page.getByRole("option", { name: "USA", exact: true })
  for (let index = 0; index < 8; index++) {
    await input.press("ArrowDown")
  }
  await expect(input).toBeFocused()
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    (await lastOption.getAttribute("id")) as string
  )
  await expect
    .poll(() => listbox.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(0)
  await expect
    .poll(() =>
      lastOption.evaluate((node) => {
        const list = node.closest('[role="listbox"]')
        if (!list) {
          return false
        }
        const optionRect = node.getBoundingClientRect()
        const listRect = list.getBoundingClientRect()
        return (
          optionRect.top >= listRect.top - 1 &&
          optionRect.bottom <= listRect.bottom + 1
        )
      })
    )
    .toBe(true)

  await input.fill("Czech")
  await expect(listbox.getByRole("option")).toHaveCount(1)
  await expect.poll(() => listbox.evaluate((node) => node.scrollTop)).toBe(0)
})

test("Playground waits for user input", async ({ page }) => {
  await openStory(page, "templates-searchsuggestions--playground")
  await expect(page.getByRole("combobox")).toHaveValue("")
  await expect(page.getByRole("listbox")).toBeHidden()
})

test("keyboard navigation skips disabled results and preserves the query", async ({
  page,
}) => {
  await openStory(page, "templates-searchsuggestions--grouped-results")
  const input = page.getByRole("combobox")
  await input.fill("running")
  const first = page.getByRole("option", { name: "Everyday trainers" })
  const category = page.getByRole("option", { name: "Footwear" })
  await expect(first).toBeVisible()
  await input.press("ArrowDown")
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    (await first.getAttribute("id")) as string
  )
  await input.press("ArrowDown")
  await expect(input).toHaveAttribute(
    "aria-activedescendant",
    (await category.getAttribute("id")) as string
  )
  const url = page.url()
  await input.press("Enter")
  await expect(page).toHaveURL(url)
  await expect(input).toHaveValue("running")
})

test("demo result clicks preserve Storybook while retaining real link destinations", async ({
  page,
}) => {
  await openStory(page, "templates-searchsuggestions--grouped-results")
  const url = page.url()
  const result = page.getByRole("option", { name: "Everyday trainers" })
  await expect(result).toHaveAttribute("href", "#product-trainer")
  await result.click()
  await expect(page).toHaveURL(url)
})

test("disabled results cannot navigate", async ({ page }) => {
  await openStory(page, "templates-searchsuggestions--grouped-results")
  const option = page.getByRole("option", { name: "Limited edition trainers" })
  await expect(option).toHaveAttribute("aria-disabled", "true")
  await expect(option).not.toHaveAttribute("href")
  const url = page.url()
  await option.dispatchEvent("click")
  await expect(page).toHaveURL(url)
})

test("modified clicks retain native browser behavior", async ({ page }) => {
  await openStory(page, "templates-searchsuggestions--grouped-results")
  const option = page.getByRole("option", { name: "Everyday trainers" })
  const prevented = await option.evaluate((node) => {
    const results: boolean[] = []
    const observeClick = (event: MouseEvent) => {
      results.push(event.defaultPrevented)
      // Observe the component handler, then suppress opening tabs in this test.
      event.preventDefault()
    }
    document.addEventListener("click", observeClick)
    try {
      for (const modifiers of [{ ctrlKey: true }, { metaKey: true }]) {
        node.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            ...modifiers,
          })
        )
      }
    } finally {
      document.removeEventListener("click", observeClick)
    }
    return results
  })
  expect(prevented).toEqual([false, false])
})

test("query can be cleared without selecting a value", async ({ page }) => {
  await openStory(page, "templates-searchsuggestions--playground")
  const input = page.getByRole("combobox")
  await input.fill("trainers")
  await page.getByRole("button", { name: /clear/i }).click()
  await expect(input).toHaveValue("")
  await expect(input).toBeFocused()
})

test("the all-results link is outside the listbox and keyboard reachable", async ({
  page,
}) => {
  await openStory(page, "templates-searchsuggestions--grouped-results")
  const input = page.getByRole("combobox")
  await input.click()
  const footer = page.getByRole("link", { name: "View all results" })
  await expect(page.getByRole("listbox").getByRole("link")).toHaveCount(0)
  await input.press("Tab")
  await expect(footer).toBeFocused()
})

test("loading hides stale results from keyboard navigation", async ({
  page,
}) => {
  await openStory(page, "templates-searchsuggestions--loading")
  const input = page.getByRole("combobox")
  await expect(page.getByRole("status")).toContainText("Searching catalog")
  await expect(page.getByRole("option")).toHaveCount(0)
  const url = page.url()
  await input.click()
  await input.press("ArrowDown")
  await input.press("Enter")
  await expect(page).toHaveURL(url)
  await expect(page.getByRole("option")).toHaveCount(0)
})

test("error remains visible until the user retries", async ({ page }) => {
  await openStory(page, "templates-searchsuggestions--error-with-retry")
  const alert = page.getByRole("alert")
  await expect(alert).toContainText("Search is temporarily unavailable")
  await page.waitForTimeout(700)
  await expect(alert).toBeVisible()
  await expect(page.getByRole("option")).toHaveCount(0)
  await expect(page.getByRole("listbox").getByRole("button")).toHaveCount(0)
  await page.getByRole("button", { name: "Try again" }).click()
  await expect(
    page.getByRole("option", { name: "Everyday trainers" })
  ).toBeVisible()
})

test("groups without labels have no dangling label reference", async ({
  page,
}) => {
  await openStory(page, "templates-searchsuggestions--without-group-labels")
  await expect(page.getByRole("group")).not.toHaveAttribute("aria-labelledby")
  await expect(page.getByRole("option", { name: "Footwear" })).toBeVisible()
})

test("dialog shows full first result and Escape closes one layer at a time", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=templates-searchsuggestions--in-dialog&viewMode=story&embed=true"
  )
  const trigger = page.getByRole("button", { name: "Open search" })
  await expect(trigger).toBeVisible()
  await page.waitForTimeout(700)
  await expect(page.getByRole("dialog")).toBeHidden()
  await trigger.click()
  const dialog = page.getByRole("dialog").filter({
    has: page.getByRole("heading", { name: "Search catalog" }),
  })
  const input = dialog.getByRole("combobox")
  await input.fill("trainers")
  const firstOption = page.getByRole("option", { name: "Everyday trainers" })
  await expect(firstOption).toBeVisible()
  await expect
    .poll(async () => {
      const optionBounds = await firstOption.boundingBox()
      const listBounds = await page.getByRole("listbox").boundingBox()
      return Boolean(
        optionBounds &&
          listBounds &&
          optionBounds.y >= listBounds.y &&
          optionBounds.y + optionBounds.height <=
            listBounds.y + listBounds.height + 1
      )
    })
    .toBe(true)
  // Zag registers the nested dismissal layer after its first animation frame.
  await expect(
    dialog.locator('[data-scope="combobox"][data-part="content"]')
  ).toHaveCSS("--layer-index", "1")
  await input.press("Escape")
  await expect(dialog).toBeVisible()
  await expect(page.getByRole("listbox")).toBeHidden()
  await input.press("Escape")
  await expect(dialog).toBeHidden()
})

test("flat Combobox selection still filters and selects values", async ({
  page,
}) => {
  await openStory(page, "molecules-combobox--playground")
  const input = page.getByRole("combobox")
  await page.getByRole("button", { name: "Toggle suggestions" }).click()
  await input.fill("Germany")
  await expect(page.getByRole("option")).toHaveCount(1)
  await page.getByRole("option", { name: "Germany" }).click()
  await expect(input).toHaveValue("Germany")
})

test("grouped Combobox selection filters empty groups", async ({ page }) => {
  await openStory(page, "molecules-combobox--grouped")
  const input = page.getByRole("combobox")
  await input.fill("Germany")
  await expect(page.getByRole("group", { name: "Europe" })).toBeVisible()
  await expect(page.getByRole("group", { name: "North America" })).toHaveCount(
    0
  )
  await page.getByRole("option", { name: "Germany" }).click()
  await expect(input).toHaveValue("Germany")
})

test("group labels and footer follow the option padding at every size", async ({
  page,
}) => {
  await openStory(page, "templates-searchsuggestions--sizes")
  const paddings: string[] = []
  for (const root of await page
    .locator('[data-scope="combobox"][data-part="root"]')
    .all()) {
    const input = root.getByRole("combobox")
    await input.fill("trainers")
    await expect(root.getByRole("option").first()).toBeVisible()
    const label = root
      .getByRole("group", { name: "Products" })
      .getByText("Products", { exact: true })
    const optionPadding = await root
      .getByRole("option")
      .first()
      .evaluate((node) => getComputedStyle(node).paddingLeft)
    expect(
      await label.evaluate((node) => getComputedStyle(node).paddingLeft)
    ).toBe(optionPadding)
    expect(
      await root
        .getByRole("link", { name: "View all results" })
        .evaluate(
          (node) => getComputedStyle(node.parentElement ?? node).paddingLeft
        )
    ).toBe(optionPadding)
    paddings.push(optionPadding)
    await input.press("Escape")
    await expect(root.getByRole("listbox")).toBeHidden()
  }
  expect(new Set(paddings).size).toBe(3)
})

test("rich results fit the viewport and load their image", async ({ page }) => {
  await openStory(page, "templates-searchsuggestions--grouped-results")
  await expect(page.getByRole("option").first()).toBeVisible()
  const image = page.getByRole("option").first().locator("img")
  await expect
    .poll(() =>
      image.evaluate(
        (node) =>
          node instanceof HTMLImageElement &&
          node.complete &&
          node.naturalWidth > 0
      )
    )
    .toBe(true)
  const bounds = await page.getByRole("listbox").boundingBox()
  expect(bounds).not.toBeNull()
  const viewport = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width)
  if (!bounds) {
    throw new Error("Listbox has no bounds")
  }
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width)
})

test("read-only catalog queries do not open or mutate", async ({ page }) => {
  await openStory(page, "templates-searchsuggestions--read-only")
  const input = page.getByRole("combobox", { name: "Search catalog" })
  await expect(input).toHaveValue("trainers")
  await input.click()
  await input.press("ArrowDown")
  await input.press("Backspace")
  await input.press("x")
  await expect(input).toHaveValue("trainers")
  await expect(input).toBeFocused()
  await expect(input).toHaveAttribute("aria-expanded", "false")
  await expect(page.getByRole("button", { name: /Clear|Toggle/ })).toHaveCount(
    0
  )
})

test("keyboard focus has a visible control ring", async ({ page }) => {
  await openStory(page, "templates-searchsuggestions--playground")
  const input = page.getByRole("combobox")
  await page.evaluate(() => {
    const before = document.createElement("button")
    before.id = "before-search-control"
    before.textContent = "Before search control"
    document.querySelector("#storybook-root")?.prepend(before)
    before.focus()
  })
  await page.keyboard.press("Tab")
  await expect(input).toBeFocused()
  await page
    .locator("#before-search-control")
    .evaluate((element) => element.remove())
  const control = page.locator('[data-scope="combobox"][data-part="control"]')
  await expect(control).toHaveAttribute("data-focus-visible", "")
  await expect(control).not.toHaveCSS("outline-style", "none")
})

test("selection FormData contains values rather than input labels", async ({
  page,
}) => {
  await openStory(page, "molecules-combobox--native-form-values")
  const submissions = await page
    .getByRole("form")
    .evaluateAll((forms) =>
      forms.map((form) =>
        new FormData(form as HTMLFormElement).getAll("country")
      )
    )
  expect(submissions).toEqual([["us"], ["us", "de"], ["us", "de"], []])
  const saved = page.getByRole("combobox", { name: "Saved countries" })
  await expect(saved).toHaveAccessibleDescription("Selected: USA, Germany")
  await saved.click()
  await saved.press("Backspace")
  await saved.press("ArrowDown")
  await expect(saved).toHaveAttribute("aria-expanded", "false")
  await expect(
    page
      .getByRole("form", { name: "Read-only selection" })
      .locator('input[type="hidden"]')
  ).toHaveCount(2)
})

test("Select typeahead matches visible labels rather than country codes", async ({
  page,
}) => {
  await openStory(page, "molecules-select--with-item-groups")
  const trigger = page.getByRole("combobox", { name: "Country" })
  await trigger.focus()
  await trigger.press("g")
  await expect(trigger).toContainText("Germany")
  await openStory(page, "molecules-select--with-item-groups")
  await page.getByRole("combobox").focus()
  await page.getByRole("combobox").press("d")
  await expect(page.getByRole("combobox")).toContainText("Select a country")
})

test("Select unregisters removed validation messages without losing help", async ({
  page,
}) => {
  await openStory(page, "molecules-select--accessible-descriptions")
  const trigger = page.getByRole("combobox", { name: "Country" })
  const errorId = await page.getByRole("alert").getAttribute("id")
  await expect(trigger).toHaveAttribute("aria-errormessage", errorId as string)
  await page.getByRole("button", { name: "Toggle validation" }).click()
  await expect(trigger).not.toHaveAttribute("aria-errormessage")
  await expect(trigger).toHaveAccessibleDescription(
    "Delivery settings. Choose a supported delivery country."
  )
})
