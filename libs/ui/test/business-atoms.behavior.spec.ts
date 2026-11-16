import { expect, type Locator, type Page, test } from "@playwright/test"

const themes = [
  ["n1", "light"],
  ["business", "light"],
  ["akros", "light"],
] as const

const repairedStories = [
  "atoms-badge--variants",
  "atoms-icon--loading-motion",
  "atoms-skeleton--variants",
  "atoms-skeleton--reduced-motion",
  "atoms-statustext--all-statuses",
  "atoms-statustext--long-text",
  "atoms-statustext--form-validation-context",
  "atoms-statustext--description-lifecycle",
  "atoms-rating--ten-point-scale",
  "atoms-rating--changing-scale",
  "atoms-numericinput--read-only",
  "atoms-numericinput--invalid-state",
  "atoms-input--variants",
  "atoms-textarea--variants",
  "atoms-textarea--read-only",
  "atoms-textarea--auto-sizing",
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
  await expect(page.locator("html")).toHaveAttribute("data-theme", brand)
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
  test(`${brand}/${mode}: StatusText preserves glyph scaling and brand-local gaps`, async ({
    page,
  }) => {
    await openStory(page, "atoms-statustext--sizes", brand, mode)
    const sizes = await page
      .locator('#storybook-root [data-status="success"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const glyph = node.firstElementChild?.firstElementChild
          if (!glyph) {
            throw new Error("Missing StatusText glyph")
          }
          const style = getComputedStyle(node)
          const bounds = glyph.getBoundingClientRect()
          return {
            font: style.fontSize,
            gap: style.columnGap,
            glyph: [bounds.width, bounds.height],
          }
        })
      )
    expect(sizes).toEqual([
      { font: "12px", gap: "4px", glyph: [12, 12] },
      { font: "14px", gap: "6px", glyph: [14, 14] },
      {
        font: "16px",
        gap: brand === "business" ? "8px" : "16px",
        glyph: [16, 16],
      },
    ])
  })

  test(`${brand}/${mode}: Skeleton stops motion without dimming caller surfaces`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await openStory(page, "atoms-skeleton--sizes", brand, mode)
    const shapes = page.locator(
      '#storybook-root [class*="animate-skeleton-pulse-"]'
    )
    await expect(shapes).toHaveCount(12)
    await expect(shapes.first()).toHaveCSS("animation-name", "skeleton-pulse")
    await page.emulateMedia({ reducedMotion: "reduce" })
    for (const shape of await shapes.all()) {
      await expect(shape).toHaveCSS("animation-name", "none")
      await expect(shape).toHaveCSS("opacity", "1")
    }
    await shapes.first().evaluate((node) => {
      ;(node as HTMLElement).style.opacity = "0.4"
    })
    await expect(shapes.first()).toHaveCSS("opacity", "0.4")
    await expect(shapes.first()).toHaveCSS("animation-name", "none")
  })

  test(`${brand}/${mode}: Textarea preserves validation and caller placeholder paint`, async ({
    page,
  }) => {
    await openStory(page, "atoms-textarea--variants", brand, mode)
    const error = page.getByRole("textbox", {
      name: "Delivery instructions — error",
    })
    const normal = page.getByRole("textbox", {
      name: "Delivery instructions — default",
    })
    await normal.evaluate((node) => {
      ;(node as HTMLTextAreaElement).placeholder = "Reference prompt"
    })
    await normal.fill("")
    const color = (node: Element) =>
      getComputedStyle(node, "::placeholder").color
    const errorColor = await error.evaluate(color)
    const normalColor = await normal.evaluate(color)
    if (brand === "business") {
      expect(errorColor).toBe(normalColor)
    } else {
      expect(errorColor).not.toBe(normalColor)
    }
    await expect(error).toHaveAttribute("aria-invalid", "true")
    const messageId = await error.getAttribute("aria-errormessage")
    if (!messageId) {
      throw new Error("Missing Textarea error-message association")
    }
    await expect(error).toHaveAttribute("aria-describedby", messageId)
    await expect(page.getByRole("alert")).toHaveAttribute("id", messageId)
    await error.evaluate((node) => {
      ;(node as HTMLElement).style.setProperty(
        "--color-textarea-placeholder-danger",
        "rgb(17 35 53)"
      )
    })
    expect(await error.evaluate(color)).toBe("rgb(17, 35, 53)")
    await error.fill("Leave the parcel at reception.")
    await expect(error).toHaveValue("Leave the parcel at reception.")
    await expect(error).toBeFocused()
  })

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
  // Small follows the Figma small-field inset (10 px, exported in rem).
  expect(Number.parseFloat(insets[0] ?? "")).toBeCloseTo(10, 0)
  expect(insets.slice(1)).toEqual(["12px", "16px"])
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
