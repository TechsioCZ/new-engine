import { expect, type Locator, type Page, test } from "@playwright/test"

const themes = [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
] as const

const repairedStories = [
  "atoms-badge--variants",
  "atoms-icon--loading-motion",
  "atoms-skeleton--variants",
  "atoms-rating--ten-point-scale",
  "atoms-rating--changing-scale",
  "atoms-numericinput--read-only",
  "templates-comprehensive-form--all-form-inputs",
]

async function openStory(page: Page, id: string, brand: string, mode: string) {
  await page.goto(`/iframe.html?id=${id}&globals=brand:${brand};mode:${mode}`)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } }
            }
          ).__STORYBOOK_PREVIEW__?.currentRender?.phase
      )
    )
    .toBe("finished")
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${mode}\\b`))
  if (brand !== "base") {
    await expect(page.locator("html")).toHaveAttribute("data-theme", brand)
  }
}

async function expectTransparent(input: Locator) {
  await expect
    .poll(() =>
      input.evaluate((node) => {
        const swatch = node.ownerDocument.createElement("canvas")
        swatch.width = 1
        swatch.height = 1
        const context = swatch.getContext("2d")
        if (!context) {
          throw new Error("Missing color-check context")
        }
        context.fillStyle = getComputedStyle(node).backgroundColor
        context.fillRect(0, 0, 1, 1)
        return context.getImageData(0, 0, 1, 1).data[3]
      })
    )
    .toBe(0)
}

for (const [brand, mode] of themes) {
  test(`${brand}/${mode}: NumericInput uses one focus paint owner`, async ({
    page,
  }) => {
    await openStory(page, "atoms-numericinput--sizes", brand, mode)
    const control = page
      .locator('[data-scope="number-input"][data-part="control"]')
      .first()
    const input = control.getByRole("spinbutton")
    await input.hover()
    await expectTransparent(input)
    for (const child of [
      input,
      control.getByRole("button").first(),
      control.getByRole("button").last(),
    ]) {
      await child.focus()
      await expect(child).toBeFocused()
      await expect(control).toHaveCSS("outline-style", "solid")
      await expect(control).not.toHaveCSS("box-shadow", "none")
      const shadow = await child.evaluate(
        (node) => getComputedStyle(node).boxShadow
      )
      expect(shadow === "none" || shadow.startsWith("rgba(0, 0, 0, 0)")).toBe(
        true
      )
    }
    await input.focus()
    await expectTransparent(input)
  })

  for (const story of repairedStories) {
    test(`${brand}/${mode}: ${story} completes its assertions`, async ({
      page,
    }) => {
      await openStory(page, story, brand, mode)
    })
  }
}

test("Business numeric value insets match the sibling Input scale", async ({
  page,
}) => {
  await openStory(page, "atoms-input--sizes", "business", "light")
  const insets = await page
    .locator("#storybook-root input")
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).paddingInlineStart)
    )
  await openStory(page, "atoms-numericinput--sizes", "business", "light")
  const numericInsets = await page
    .getByRole("spinbutton")
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).paddingInlineStart)
    )
  expect(insets).toEqual(["12px", "12px", "16px"])
  expect(numericInsets).toEqual(insets)
})

test("Business action sizes preserve the existing field rhythm", async ({
  page,
}) => {
  await openStory(page, "atoms-input--sizes", "business", "light")
  const inputHeights = await page
    .locator("#storybook-root input")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().height)
    )
  expect(inputHeights).toHaveLength(3)
  expect(inputHeights[1]).toBe(46)
  expect(inputHeights[2]).toBe(60)
  for (const [story, selector] of [
    ["atoms-button--sizes", "button"],
    ["atoms-linkbutton--sizes", "a"],
  ] as const) {
    await openStory(page, story, "business", "light")
    const heights = await page
      .locator(`#storybook-root ${selector}`)
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().height)
      )
    expect(heights).toHaveLength(3)
    for (const [index, height] of heights.entries()) {
      const inputHeight = inputHeights[index]
      if (inputHeight === undefined) {
        throw new Error("Missing matching field size")
      }
      expect(Math.abs(height - inputHeight)).toBeLessThanOrEqual(1)
    }
  }
})

test("At 320px, ten-point scrolling preserves focus and rating context", async ({
  page,
}) => {
  const viewport = page.viewportSize()
  if (!viewport) {
    throw new Error("Missing configured viewport")
  }
  await page.setViewportSize({ width: 320, height: viewport.height })
  await openStory(page, "atoms-rating--ten-point-scale", "business", "light")
  const region = page.getByRole("region", { name: "Ten-point rating scale" })
  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  expect(width.scroll).toBeLessThanOrEqual(width.client)
  const last = page.getByRole("radio").last()
  await last.focus()
  await page.keyboard.press("End")
  await expect(last).toBeFocused()
  await expect(last).toHaveAttribute("aria-checked", "true")
  await expect(last).toBeInViewport()
  await expect(
    region.getByText("Rate your delivery", { exact: true })
  ).toBeInViewport({ ratio: 1 })
  await expect(region.getByText("10 / 10", { exact: true })).toBeInViewport({
    ratio: 1,
  })
  const geometry = await region.evaluate((node) => ({
    client: node.clientWidth,
    scroll: node.scrollWidth,
    left: node.scrollLeft,
  }))
  if (geometry.scroll > geometry.client) {
    expect(geometry.left).toBeGreaterThan(0)
  }
  expect(await page.evaluate(() => window.scrollX)).toBe(0)
})

test("The complete loading ring respects both motion preferences", async ({
  page,
}) => {
  for (const motion of ["reduce", "no-preference"] as const) {
    await page.emulateMedia({ reducedMotion: motion })
    await openStory(page, "atoms-icon--loading-motion", "business", "light")
    const icon = page.getByRole("img", { name: "Loading order details" })
    await expect(icon).toHaveCSS(
      "animation-name",
      motion === "reduce" ? "none" : "spin"
    )
  }
})
