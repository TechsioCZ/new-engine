import { expect } from "@playwright/test"

/** @import { Page } from "@playwright/test" */

/** @param {Page} page @param {string} id @param {{brand?: string, mode?: string, args?: string, docs?: boolean, baseURL?: string}} [options] */
export async function openContractStory(page, id, options = {}) {
  const { brand = "base", mode = "light", args, docs = false } = options
  const url = new URL(
    "/iframe.html",
    options.baseURL ?? process.env.TEST_BASE_URL ?? "http://127.0.0.1:6006"
  )
  url.searchParams.set("id", id)
  url.searchParams.set("viewMode", docs ? "docs" : "story")
  url.searchParams.set("globals", `brand:${brand};mode:${mode}`)
  if (args) {
    url.searchParams.set("args", args)
  }
  await page.goto(url.toString())
  await page
    .locator(docs ? ".sbdocs-content" : "#storybook-root > *")
    .first()
    .waitFor()
  if (!docs) {
    await page.waitForFunction(
      () => window.__STORYBOOK_PREVIEW__?.currentRender?.phase === "finished"
    )
  }
}

/** @param {Page} page @param {{brand: string, mode: string, baseURL?: string}} options */
export async function checkStandaloneDocs(page, options) {
  await openContractStory(page, "guide-getting-started--docs", {
    ...options,
    docs: true,
  })
  const root = page.locator("html")
  await expect(root).toHaveClass(new RegExp(`\\b${options.mode}\\b`))
  if (options.brand === "base") {
    await expect(root).not.toHaveAttribute("data-theme")
  } else {
    await expect(root).toHaveAttribute("data-theme", options.brand)
  }
  await expect
    .poll(() => root.evaluate((node) => getComputedStyle(node).colorScheme))
    .toBe(options.mode)
  if (options.mode === "dark") {
    await expect
      .poll(() =>
        page
          .locator(".sbdocs-wrapper")
          .evaluate((node) => getComputedStyle(node).backgroundColor)
      )
      .not.toBe("rgb(255, 255, 255)")
  }
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    )
  ).toBe(true)
  // Updates must work without navigating or mounting any Canvas story.
  for (const [brand, mode, resolved] of [
    ["akros", "dark", "light"],
    ["base", "dark", "dark"],
    ["base", "light", "light"],
  ]) {
    await page.evaluate(
      (globals) =>
        window.__STORYBOOK_ADDONS_CHANNEL__.emit("updateGlobals", {
          globals,
        }),
      { brand, mode }
    )
    await expect(root).toHaveClass(new RegExp(`\\b${resolved}\\b`))
    if (brand === "base") {
      await expect(root).not.toHaveAttribute("data-theme")
    } else {
      await expect(root).toHaveAttribute("data-theme", brand)
    }
  }
}

/** @param {Page} page @param {{brand: string, mode: string, baseURL?: string}} options */
export async function checkTabsKeyboard(page, options) {
  await openContractStory(page, "molecules-tabs--playground", {
    ...options,
    args: "activationMode:manual;loopFocus:!false",
  })
  const tabs = page.getByRole("tab")
  await tabs.nth(0).focus()
  await tabs.nth(0).press("ArrowRight")
  await expect(tabs.nth(1)).toBeFocused()
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true")
  await expect(tabs.nth(1)).toHaveAttribute("tabindex", "0")
  await expect(tabs.nth(0)).toHaveAttribute("tabindex", "-1")
  await tabs.nth(1).press("Enter")
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true")
  await tabs.nth(1).press("End")
  await expect(tabs.nth(2)).toBeFocused()
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true")
  await tabs.nth(2).press(" ")
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true")
  await tabs.nth(2).press("ArrowRight")
  await expect(tabs.nth(2)).toBeFocused()
  await tabs.nth(2).press("Home")
  await expect(tabs.nth(0)).toBeFocused()
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true")

  await openContractStory(page, "molecules-tabs--playground", {
    ...options,
    args: "orientation:vertical;activationMode:automatic;loopFocus:!true",
  })
  await tabs.nth(0).focus()
  await tabs.nth(0).press("ArrowRight")
  await expect(tabs.nth(0)).toBeFocused()
  await tabs.nth(0).press("ArrowDown")
  await expect(tabs.nth(1)).toBeFocused()
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true")
  await tabs.nth(1).press("End")
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true")
  await tabs.nth(2).press("ArrowDown")
  await expect(tabs.nth(0)).toBeFocused()
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true")

  await openContractStory(page, "molecules-tabs--disabled-tabs", options)
  await tabs.nth(0).focus()
  await expect(tabs.nth(1)).toBeDisabled()
  await tabs.nth(0).press("ArrowRight")
  await expect(tabs.nth(2)).toBeFocused()
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true")

  await openContractStory(page, "molecules-tabs--playground", {
    ...options,
    args: "value:tab1",
  })
  await tabs.nth(1).click()
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true")
  await page.evaluate(() =>
    window.__STORYBOOK_ADDONS_CHANNEL__.emit("updateStoryArgs", {
      storyId: "molecules-tabs--playground",
      updatedArgs: { value: "tab3" },
    })
  )
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true")
  await openContractStory(page, "molecules-tabs--controlled", options)
  await tabs.nth(0).click()
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true")
  await expect(
    page.getByText("Current tab: tab1", { exact: true })
  ).toBeVisible()
}

/** @param {Page} page @param {{brand: string, mode: string, baseURL?: string}} options */
export async function checkRadioAndSliderKeyboard(page, options) {
  await openContractStory(page, "molecules-radiogroup--playground", options)
  const radios = page.getByRole("radio")
  await radios.nth(0).focus()
  await radios.nth(0).press("ArrowDown")
  await expect(radios.nth(1)).toBeChecked()
  await expect(radios.nth(1)).toBeFocused()
  await radios.nth(1).press("ArrowUp")
  await expect(radios.nth(0)).toBeChecked()
  await expect(radios.nth(0)).toBeFocused()
  await radios.nth(0).press("ArrowUp")
  await expect(radios.nth(2)).toBeChecked()

  await openContractStory(
    page,
    "molecules-slider--min-steps-between-thumbs",
    options
  )
  const thumbs = page.getByRole("slider")
  const lower = thumbs.nth(4)
  const upper = thumbs.nth(5)
  await lower.focus()
  await lower.press("End")
  await expect(lower).toHaveAttribute("aria-valuenow", "60")
  await expect(upper).toHaveAttribute("aria-valuenow", "80")
  await upper.focus()
  await upper.press("Home")
  await expect(upper).toHaveAttribute("aria-valuenow", "80")
  await lower.focus()
  await lower.press("ArrowLeft")
  await expect(lower).toHaveAttribute("aria-valuenow", "59")
  await upper.focus()
  await upper.press("ArrowLeft")
  await expect(upper).toHaveAttribute("aria-valuenow", "79")

  await openContractStory(page, "molecules-slider--controlled", options)
  await thumbs.nth(0).focus()
  await thumbs.nth(0).press("ArrowRight")
  await expect(thumbs.nth(0)).toHaveAttribute("aria-valuenow", "31")
  await expect(page.getByText("[31, 70]", { exact: true })).toBeVisible()
  await openContractStory(page, "molecules-slider--playground", options)
  const updateValues = (value) =>
    page.evaluate(
      (nextValue) =>
        window.__STORYBOOK_ADDONS_CHANNEL__.emit("updateStoryArgs", {
          storyId: "molecules-slider--playground",
          updatedArgs: { value: nextValue },
        }),
      value
    )
  await updateValues([30, 70])
  await expect(thumbs.nth(0)).toHaveAttribute("aria-valuenow", "30")
  await thumbs.nth(0).focus()
  await thumbs.nth(0).press("ArrowRight")
  await expect(thumbs.nth(0)).toHaveAttribute("aria-valuenow", "30")
  await updateValues([40, 90])
  await expect(thumbs.nth(0)).toHaveAttribute("aria-valuenow", "40")
  await expect(thumbs.nth(1)).toHaveAttribute("aria-valuenow", "90")
}
