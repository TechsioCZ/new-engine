import { expect, type Page, test } from "@playwright/test"

async function openStory(page: Page, name: string) {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(
    `/iframe.html?id=molecules-verticalnavigation--${name}&viewMode=story`
  )
}

test("keeps parent navigation separate from disclosure and supports keyboard toggling", async ({
  page,
}) => {
  await openStory(page, "playground")
  const navigation = page.getByRole("navigation", {
    name: "Product categories",
  })
  const toggle = navigation.getByRole("button", { name: "Toggle Fasteners" })
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await navigation.getByRole("link", { name: "Fasteners", exact: true }).click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByTestId("current-page")).toHaveText(
    "Current page: Fasteners"
  )
  await toggle.focus()
  await page.keyboard.press("Space")
  await expect(toggle).toHaveAttribute("aria-expanded", "false")
  await expect(navigation.getByRole("link", { name: "Bolts" })).toBeHidden()
  await page.keyboard.press("Tab")
  await expect(navigation.getByRole("link", { name: "Contact" })).toBeFocused()
  await toggle.focus()
  await page.keyboard.press("Enter")
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await expect(navigation.getByRole("link", { name: "Bolts" })).toBeVisible()
  const controlledId = await toggle.getAttribute("aria-controls")
  await expect(page.locator(`[id="${controlledId}"]`)).toHaveAttribute(
    "data-part",
    "branch-content"
  )
  await expect(navigation.getByRole("tree")).toHaveCount(0)
  await expect(navigation.getByRole("menu")).toHaveCount(0)
})

for (const mode of ["light", "dark"]) {
  test(`shares split-row hover and current background with independent focus in ${mode} mode`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=molecules-verticalnavigation--playground&viewMode=story&globals=mode:${mode}`
    )
    const link = page.getByRole("link", { name: "Fasteners", exact: true })
    const toggle = page.getByRole("button", { name: "Toggle Fasteners" })
    const row = page.locator('[data-part="row"]').filter({ has: link })
    const indicator = toggle.locator('[data-part="branch-indicator"]')
    await expect(link).toBeVisible()
    await expect(page.locator("html")).toHaveClass(new RegExp(mode))
    const idleBackground = await row.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    )
    const idleIndicator = await indicator.evaluate(
      (element) => getComputedStyle(element).color
    )

    await link.hover()
    const hoverBackground = await row.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    )
    expect(hoverBackground).not.toBe(idleBackground)
    await expect(link).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
    await expect(toggle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
    await toggle.hover()
    await expect(row).toHaveCSS("background-color", hoverBackground)
    await expect(toggle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
    expect(
      await indicator.evaluate((element) => getComputedStyle(element).color)
    ).not.toBe(idleIndicator)

    await link.click()
    await expect(link).toHaveAttribute("aria-current", "page")
    await expect(link).toHaveCSS("text-decoration-line", "none")
    await expect(toggle).toHaveAttribute("aria-expanded", "true")
    const currentBackground = await row.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    )
    expect(currentBackground).not.toBe(hoverBackground)
    await toggle.hover()
    await expect(row).toHaveCSS("background-color", currentBackground)
    await expect(link).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
    await page.mouse.move(600, 600)
    await expect(row).toHaveCSS("background-color", currentBackground)

    await page.keyboard.press("Tab")
    await expect(toggle).toBeFocused()
    await expect(toggle).toHaveCSS("outline-style", "solid")
    await expect(row).toHaveCSS("outline-style", "none")
    await page.keyboard.press("Shift+Tab")
    await expect(link).toBeFocused()
    await expect(link).toHaveCSS("outline-style", "solid")
    await page.keyboard.press("Tab")
    await page.keyboard.press("Space")
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await expect(link).toHaveAttribute("aria-current", "page")
  })
}

test("nested row hover stays local and does not change subgroup backgrounds", async ({
  page,
}) => {
  await openStory(page, "akros-catalog")
  const link = page.getByRole("link", {
    name: "Šrouby se šestihrannou hlavou",
    exact: true,
  })
  const row = page.locator('[data-part="row"]').filter({ has: link })
  const parent = page
    .locator('[data-part="row"]')
    .filter({ has: page.getByRole("link", { name: "Šrouby", exact: true }) })
  const group = page.locator('[data-tone="accent"][data-variant="primary"]')
  await expect(link).toBeVisible()
  const parentBackground = await parent.evaluate(
    (element) => getComputedStyle(element).backgroundColor
  )
  const groupBackground = await group.evaluate(
    (element) => getComputedStyle(element).backgroundColor
  )
  await link.hover()
  await expect(row).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
  await expect(parent).toHaveCSS("background-color", parentBackground)
  await expect(group).toHaveCSS("background-color", groupBackground)
  const hoverBackground = await row.evaluate(
    (element) => getComputedStyle(element).backgroundColor
  )
  await row.getByRole("button").hover()
  await expect(row).toHaveCSS("background-color", hoverBackground)
})

test("respects rejected controlled proposals and external route-driven expansion", async ({
  page,
}) => {
  await openStory(page, "controlled")
  const toggle = page.getByRole("button", { name: "Toggle controlled branch" })
  await toggle.click()
  await expect(page.getByTestId("open-change-count")).toHaveText("1")
  await expect(toggle).toHaveAttribute("aria-expanded", "false")
  await expect(
    page.getByRole("link", { name: "Controlled destination" })
  ).toBeHidden()
  await page.getByRole("button", { name: "Reveal current page" }).click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await toggle.click()
  await expect(page.getByTestId("open-change-count")).toHaveText("2")
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
  await page.getByRole("button", { name: "Reject changes" }).click()
  await toggle.click()
  await expect(toggle).toHaveAttribute("aria-expanded", "false")
  await expect(page.getByTestId("controlled-open-state")).toHaveText("Closed")
})

test("skips disabled links and prevents disabled disclosure", async ({
  page,
}) => {
  await openStory(page, "states")
  const unavailable = page.getByRole("link", {
    name: "Unavailable destination",
  })
  await expect(unavailable).toHaveAttribute("aria-disabled", "true")
  await expect(unavailable).toHaveAttribute("tabindex", "-1")
  await unavailable.dispatchEvent("click")
  expect(new URL(page.url()).hash).toBe("")
  await expect(
    page.getByRole("button", { name: "Unavailable category" })
  ).toBeDisabled()
  await page.getByRole("link", { name: "Overview" }).focus()
  await page.keyboard.press("Tab")
  await expect(
    page.getByRole("button", { name: "Collapsed category" })
  ).toBeFocused()
})

test("States honors appearance controls on the root and nested content", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-verticalnavigation--states&viewMode=story&args=size:sm;dir:rtl;tone:accent;indent:!false;showGuide:!false"
  )
  const navigation = page.getByRole("navigation", { name: "Navigation states" })
  await expect(navigation).toHaveAttribute("dir", "rtl")
  const compactFont = await navigation.evaluate(
    (element) => getComputedStyle(element).fontSize
  )
  const compactIndicator = await navigation
    .locator('[data-part="branch-indicator"]')
    .first()
    .evaluate((element) => getComputedStyle(element).fontSize)
  const content = navigation.locator('[data-part="branch-content"]').first()
  await page.getByRole("button", { name: "Collapsed category" }).click()
  await expect(content).toHaveAttribute("data-tone", "accent")
  await expect(content).not.toHaveAttribute("data-indented")
  await expect(content).not.toHaveAttribute("data-guide")
  await openStory(page, "states")
  const regularFont = await navigation.evaluate(
    (element) => getComputedStyle(element).fontSize
  )
  const regularIndicator = await navigation
    .locator('[data-part="branch-indicator"]')
    .first()
    .evaluate((element) => getComputedStyle(element).fontSize)
  expect(Number.parseFloat(regularFont)).toBeGreaterThan(
    Number.parseFloat(compactFont)
  )
  expect(Number.parseFloat(regularIndicator)).toBeGreaterThan(
    Number.parseFloat(compactIndicator)
  )
})

test("Sizes shares compact typography, flat groups and catalog width", async ({
  page,
}) => {
  await openStory(page, "sizes")
  for (const [size, fontSize, rowHeight] of [
    ["sm", 14.08, 32],
    ["md", 16, 36],
  ] as const) {
    const navigation = page.getByRole("navigation", {
      name: `Product categories - ${size}`,
    })
    await expect(navigation).toBeVisible()
    expect((await navigation.boundingBox())?.width).toBeCloseTo(280)
    const link = navigation.getByRole("link", { name: "All products" })
    expect(
      await link.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize)
      )
    ).toBeCloseTo(fontSize)
    expect((await link.boundingBox())?.height).toBeCloseTo(rowHeight)
    await expect(
      navigation.getByRole("heading", { name: "Catalog" })
    ).toHaveCSS("font-size", "12px")
    await expect(navigation.locator('[data-part="branch-content"]')).toHaveCSS(
      "border-radius",
      "0px"
    )
    await expect(navigation.locator("[data-guide]")).toHaveCount(0)
  }
})

for (const width of [1280, 375]) {
  test(`preserves seven levels and independent state without overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 })
    await openStory(page, "seven-levels")
    const navigation = page.getByRole("navigation", {
      name: "Seven-level product catalog",
    })
    await expect(navigation.locator("ul ul ul ul ul ul ul")).toHaveCount(1)
    await expect(navigation.locator("[data-indented]")).toHaveCount(6)
    const leaf = navigation.getByRole("link", { name: "A2 stainless steel" })
    await expect(leaf).toBeVisible()
    await expect(leaf).toHaveAttribute("aria-current", "page")
    expect(
      await navigation.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1
      )
    ).toBe(true)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true)
    const nested = navigation.getByRole("button", {
      name: "Toggle Hexagonal head",
    })
    await nested.click()
    await expect(leaf).toBeHidden()
    const outer = navigation.getByRole("button", {
      name: "Toggle Stainless steel fasteners",
    })
    await outer.click()
    await outer.click()
    await expect(nested).toHaveAttribute("aria-expanded", "false")
    await nested.click()
    await expect(leaf).toBeVisible()
    await navigation.getByRole("link", { name: "A4 stainless steel" }).click()
    await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1)
    await expect(page.getByTestId("current-page")).toHaveText(
      "Current page: A4 stainless steel"
    )
  })
}

test("applies subgroup tones independently of current-page state and uses logical RTL indent", async ({
  page,
}) => {
  await openStory(page, "rtl")
  const navigation = page.getByRole("navigation", {
    name: "Product categories",
  })
  await expect(navigation).toHaveAttribute("dir", "rtl")
  const content = navigation.locator('[data-part="branch-content"]')
  await expect(content).toHaveAttribute("data-tone", "subtle")
  expect(
    await content.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).marginRight)
    )
  ).toBeGreaterThan(0)
  await navigation.getByRole("link", { name: "Nuts" }).click()
  await expect(content).toHaveAttribute("data-tone", "subtle")
  await expect(navigation.getByRole("link", { name: "Nuts" })).toHaveAttribute(
    "aria-current",
    "page"
  )
})

test("composes with Drawer and restores its trigger focus", async ({
  page,
}) => {
  await openStory(page, "within-drawer")
  const trigger = page.getByRole("button", { name: "Browse categories" })
  await trigger.click()
  const dialog = page.getByRole("dialog", { name: "Product catalog" })
  await expect(dialog.getByRole("link", { name: "Bolts" })).toBeVisible()
  await dialog.getByRole("button", { name: "Toggle Fasteners" }).click()
  await expect(dialog.getByRole("link", { name: "Bolts" })).toBeHidden()
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test("composes with Sidebar on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await openStory(page, "within-sidebar")
  await page.getByRole("button", { name: "Browse categories" }).click()
  await expect(
    page.getByRole("navigation", { name: "Product categories" })
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "Bolts" })).toBeVisible()
  await page.getByRole("button", { name: "Close categories" }).click()
  await expect(
    page.getByRole("navigation", { name: "Product categories" })
  ).toBeHidden()
})

test("Akros catalog keeps a 280px catalog readable and separates navigation from disclosure", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 812 })
  await openStory(page, "akros-catalog")
  const navigation = page.getByRole("navigation", { name: "Katalog Akros" })
  await expect(navigation).toBeVisible()
  const bounds = await navigation.boundingBox()
  expect(bounds?.width).toBeCloseTo(280)
  const clippedItems = await navigation
    .locator("a, button")
    .evaluateAll(
      (elements) =>
        elements.filter(
          (element) =>
            element.getBoundingClientRect().height > 0 &&
            element.scrollWidth > element.clientWidth + 1
        ).length
    )
  expect(clippedItems).toBe(0)

  const selected = navigation.getByRole("link", { name: "A 4", exact: true })
  await selected.click()
  await expect(selected).toHaveAttribute("aria-current", "page")
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1)
  const primaryGroup = navigation.locator(
    '[data-tone="accent"][data-variant="primary"]'
  )
  const secondaryGroup = navigation.locator(
    '[data-tone="accent"][data-variant="secondary"]'
  )
  await expect(primaryGroup).toBeVisible()
  await expect(secondaryGroup).toBeVisible()
  const primaryBackground = await primaryGroup.evaluate(
    (element) => getComputedStyle(element).backgroundColor
  )
  const secondaryBackground = await secondaryGroup.evaluate(
    (element) => getComputedStyle(element).backgroundColor
  )
  expect(primaryBackground).not.toBe(secondaryBackground)
  const currentBackground = await selected.evaluate(
    (element) => getComputedStyle(element).backgroundColor
  )
  const otherGroupLink = navigation.getByRole("link", {
    name: "Bimetalové",
    exact: true,
  })
  await otherGroupLink.click()
  await expect(otherGroupLink).toHaveAttribute("aria-current", "page")
  expect(
    await otherGroupLink.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    )
  ).toBe(currentBackground)
  expect(
    await primaryGroup.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    )
  ).toBe(primaryBackground)
  expect(
    await secondaryGroup.evaluate(
      (element) => getComputedStyle(element).backgroundColor
    )
  ).toBe(secondaryBackground)

  const toggle = navigation.getByRole("button", {
    name: "Toggle DIN 933",
    exact: true,
  })
  await toggle.focus()
  await page.keyboard.press("Space")
  await expect(selected).toBeHidden()
  await page.keyboard.press("Enter")
  await expect(selected).toBeVisible()
  await navigation.getByRole("link", { name: "DIN 933", exact: true }).click()
  await expect(toggle).toHaveAttribute("aria-expanded", "true")
})
