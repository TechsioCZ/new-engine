import { expect, type Page, test } from "@playwright/test"

async function startTour(page: Page) {
  await page.goto("/iframe.html?id=molecules-tour--playground&viewMode=story")
  await page.getByRole("button", { name: "Start tour" }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Make yourself at home" })
  ).toBeVisible()
}

test("navigates, completes and restores focus", async ({ page }) => {
  await startTour(page)
  const arrow = page.locator('[data-scope="tour"][data-part="arrow"]')
  await expect(arrow).toHaveCount(0)
  // Zag defers focus-trap activation until after the panel becomes visible.
  await expect(page.getByRole("button", { name: "Close tour" })).toBeFocused()
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab")
    await expect(page.getByRole("alertdialog")).toContainText(
      "Make yourself at home"
    )
    expect(
      await page
        .getByRole("alertdialog")
        .evaluate((element) => element.contains(document.activeElement))
    ).toBe(true)
  }
  await expect(page.getByRole("button", { name: "Back" })).toBeDisabled()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Create something new" })
  ).toBeVisible()
  await expect(page.getByText("2 of 3")).toBeVisible()
  await expect(arrow).toBeVisible()
  const arrowLayer = await arrow.evaluate((element) =>
    Number(getComputedStyle(element).zIndex)
  )
  const panelLayer = await page
    .getByRole("alertdialog")
    .evaluate((element) => Number(getComputedStyle(element).zIndex))
  expect(arrowLayer).toBeGreaterThan(panelLayer)
  await page.getByRole("button", { name: "Back" }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Make yourself at home" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await expect(
    page.getByRole("alertdialog", { name: "You are ready" })
  ).toBeVisible()
  await expect(arrow).toHaveCount(0)
  await page.getByRole("button", { name: "Finish" }).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await expect(page.getByLabel("Tour status")).toHaveText("completed")
  await expect(page.getByRole("button", { name: "Start tour" })).toBeFocused()
})

test("skip ends the tour", async ({ page }) => {
  await startTour(page)
  await page.getByRole("button", { name: "Skip tour" }).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await expect(page.getByLabel("Tour status")).toHaveText("skipped")
})

test("Escape restores focus and permits restart", async ({ page }) => {
  await startTour(page)
  await page.keyboard.press("Escape")
  await expect(page.getByLabel("Tour status")).toHaveText("dismissed")
  await expect(page.getByRole("button", { name: "Start tour" })).toBeFocused()
  await page.getByRole("button", { name: "Start tour" }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Make yourself at home" })
  ).toBeVisible()
})

test("resolves a target that appears after start", async ({ page }) => {
  await page.goto("/iframe.html?id=molecules-tour--late-target&viewMode=story")
  await page.getByRole("button", { name: "Start tour" }).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Start tour" })).toBeDisabled()
  await page.getByRole("button", { name: "Reveal target" }).click()
  await expect(
    page.getByRole("alertdialog", { name: "The target is ready" })
  ).toBeVisible()
})

test("a missing target ends without skipping or retaining UI", async ({
  page,
}) => {
  await page.goto("/iframe.html?id=molecules-tour--late-target&viewMode=story")
  await page.getByRole("button", { name: "Start tour" }).click()
  await expect(page.getByLabel("Tour status")).toHaveText("not-found")
  await expect(page.getByLabel("Effect cleanup count")).toHaveText("1")
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await expect(
    page.locator('[data-scope="tour"][data-part="backdrop"]')
  ).toHaveCount(0)
  await page.getByRole("button", { name: "Reveal target" }).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await page.getByRole("button", { name: "Start tour" }).click()
  await expect(page.getByRole("alertdialog")).toBeVisible()
})

test("interactive wait hides the overlay and cleans up on advance", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--interactive-wait&viewMode=story"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Start tour" })).toBeDisabled()
  await page.getByRole("button", { name: "Connect account" }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Account connected" })
  ).toBeVisible()
  await expect(page.getByLabel("Effect cleanup count")).toHaveText("1")
  await expect(page.getByText("2 of 2")).toBeVisible()
})

test("effect dismissal cleans up and permits restart", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--interactive-wait&viewMode=story"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.getByRole("button", { name: "Cancel waiting" }).click()
  await expect(page.getByLabel("Tour status")).toHaveText("dismissed")
  await expect(page.getByLabel("Effect cleanup count")).toHaveText("1")
  await page.getByRole("button", { name: "Start tour" }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Connect your account" })
  ).toBeVisible()
})

test("RTL arrow navigation works at both boundaries", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--playground&viewMode=story&args=dir:rtl"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.getByRole("button", { name: "Next", exact: true }).focus()
  await page.keyboard.press("ArrowLeft")
  await expect(
    page.getByRole("alertdialog", { name: "Create something new" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Next", exact: true }).focus()
  await page.keyboard.press("ArrowLeft")
  await expect(
    page.getByRole("alertdialog", { name: "You are ready" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Finish" }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(
    page.getByRole("alertdialog", { name: "Create something new" })
  ).toBeVisible()
})

// placement, LTR column, RTL column, row (start / center / end = 0 / 1 / 2)
const floatingPlacementCases = [
  ["top-start", 0, 2, 0],
  ["top", 1, 1, 0],
  ["top-end", 2, 0, 0],
  ["right-start", 2, 2, 0],
  ["right", 2, 2, 1],
  ["right-end", 2, 2, 2],
  ["bottom-start", 0, 2, 2],
  ["bottom", 1, 1, 2],
  ["bottom-end", 2, 0, 2],
  ["left-start", 0, 0, 0],
  ["left", 0, 0, 1],
  ["left-end", 0, 0, 2],
  ["center", 1, 1, 1],
] as const

test("floating placements use the viewport and respect RTL", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  for (const dir of ["ltr", "rtl"]) {
    await page.goto(
      `/iframe.html?id=molecules-tour--floating-placements&viewMode=story&args=dir:${dir}`
    )
    for (const [
      placement,
      ltrColumn,
      rtlColumn,
      row,
    ] of floatingPlacementCases) {
      await page.getByRole("button", { name: placement, exact: true }).click()
      const panel = page.getByRole("alertdialog", { name: placement })
      await expect(panel).toBeVisible()
      const rect = await panel.boundingBox()
      expect(rect).not.toBeNull()
      if (!rect) {
        throw new Error("Missing floating panel")
      }
      const columns = [
        16,
        (1200 - rect.width) / 2,
        1200 - 16 - rect.width,
      ] as const
      const rows = [
        16,
        (900 - rect.height) / 2,
        900 - 16 - rect.height,
      ] as const
      const column = dir === "rtl" ? rtlColumn : ltrColumn
      expect(rect.x, `${dir} ${placement} x`).toBeCloseTo(columns[column], 0)
      expect(rect.y, `${dir} ${placement} y`).toBeCloseTo(rows[row], 0)
      await page.getByRole("button", { name: "Close tour" }).click()
    }
  }
})

test("consumer cancellation, editor keys and imperative controls", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--custom-controls&viewMode=story"
  )
  await expect(
    page.getByRole("button", { name: "Disabled start" })
  ).toBeDisabled()
  await page.getByRole("button", { name: "Cancelled start" }).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await page.getByRole("button", { name: "Start tour" }).click()
  await expect(
    page.getByRole("button", { name: "Replace steps" })
  ).toBeDisabled()
  await expect(
    page.getByRole("button", { name: "Disabled next" })
  ).toBeDisabled()
  await page.getByRole("button", { name: "Cancelled next" }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Edit your name" })
  ).toBeVisible()
  await page.getByRole("textbox", { name: "Your name" }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(
    page.getByRole("alertdialog", { name: "Edit your name" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Update step" }).click()
  await page.getByRole("button", { name: "Jump to end" }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Updated title" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Replace steps" }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Replacement tour" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Close tour" }).click()
  await expect(page.getByRole("button", { name: "Start tour" })).toBeFocused()
})

test("escape, outside click and arrow navigation can be disabled", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--playground&viewMode=story&args=closeOnEscape:false;closeOnInteractOutside:false;keyboardNavigation:false"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.keyboard.press("Escape")
  await page.mouse.click(5, 5)
  await page.getByRole("button", { name: "Next", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(
    page.getByRole("alertdialog", { name: "Make yourself at home" })
  ).toBeVisible()
  await page.getByRole("button", { name: "Close tour" }).click()
  await expect(page.getByRole("alertdialog")).toHaveCount(0)
})

for (const scenario of [
  {
    story: "playground",
    action: "Next",
    step: "create",
    target: "Create project",
  },
  {
    story: "late-target",
    action: "Reveal target",
    step: "late",
    target: "New target",
  },
]) {
  test(`blocks ${scenario.story} target when its panel enters the DOM`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=molecules-tour--${scenario.story}&viewMode=story&args=preventInteraction:true`
    )
    await page.getByRole("button", { name: "Start tour" }).click()
    const blocked = await page
      .getByRole("button", { name: scenario.action, exact: true })
      .evaluate(
        (action: HTMLButtonElement, { step, target }) =>
          new Promise<boolean>((resolve, reject) => {
            const timeout = setTimeout(() => {
              observer.disconnect()
              reject(new Error("Targeted tour panel did not appear"))
            }, 3000)
            const observer = new MutationObserver(() => {
              if (
                !document.querySelector(
                  `[data-scope="tour"][data-part="content"][data-step="${step}"]`
                )
              ) {
                return
              }
              observer.disconnect()
              clearTimeout(timeout)
              const element = Array.from(
                document.querySelectorAll("button")
              ).find((button) => button.textContent?.trim() === target)
              resolve(element?.inert === true)
            })
            observer.observe(document.body, {
              childList: true,
              subtree: true,
              attributes: true,
            })
            action.click()
          }),
        scenario
      )
    expect(blocked).toBe(true)
  })
}

test("late targets become inert and are restored after dismissal", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--late-target&viewMode=story&args=preventInteraction:true"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.getByRole("button", { name: "Reveal target" }).click()
  await expect(page.getByRole("alertdialog")).toBeVisible()
  const target = page.locator("button").filter({ hasText: "New target" })
  await expect(target).toHaveJSProperty("inert", true)
  await page.getByRole("button", { name: "Close tour" }).click()
  await expect(target).toHaveJSProperty("inert", false)
  await expect(target).not.toHaveAttribute("data-tour-highlighted")
})

test("existing targets become inert and are restored after advancing", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--playground&viewMode=story&args=preventInteraction:true"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Create something new" })
  ).toBeVisible()
  const target = page.locator("button").filter({ hasText: "Create project" })
  await expect(target).toHaveJSProperty("inert", true)

  await page.getByRole("button", { name: "Next", exact: true }).click()

  await expect(
    page.getByRole("alertdialog", { name: "You are ready" })
  ).toBeVisible()
  await expect(target).not.toHaveAttribute("data-tour-highlighted")
  await expect(target).toHaveJSProperty("inert", false)
})

test("preserves application inert added to a late target during the tour", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--late-target&viewMode=story&args=preventInteraction:true"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.getByRole("button", { name: "Reveal target" }).click()
  await expect(page.getByRole("alertdialog")).toBeVisible()
  const target = page.locator("button").filter({ hasText: "New target" })
  await expect(target).toHaveJSProperty("inert", true)

  await target.evaluate((element: HTMLButtonElement) => {
    element.inert = true
  })
  await page.getByRole("button", { name: "Close tour" }).click()

  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await expect(target).not.toHaveAttribute("data-tour-highlighted")
  await expect(target).toHaveJSProperty("inert", true)
})

test("preserves application inert added to an existing target when advancing", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--playground&viewMode=story&args=preventInteraction:true"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Create something new" })
  ).toBeVisible()
  const target = page.locator("button").filter({ hasText: "Create project" })
  await expect(target).toHaveJSProperty("inert", true)

  await target.evaluate((element: HTMLButtonElement) => {
    element.inert = true
  })
  await page.getByRole("button", { name: "Next", exact: true }).click()

  await expect(
    page.getByRole("alertdialog", { name: "You are ready" })
  ).toBeVisible()
  await expect(target).not.toHaveAttribute("data-tour-highlighted")
  await expect(target).toHaveJSProperty("inert", true)
})

test("preserves application inert that predates the tour", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--playground&viewMode=story&args=preventInteraction:true"
  )
  const target = page.locator("button").filter({ hasText: "Create project" })
  await target.evaluate((element: HTMLButtonElement) => {
    element.inert = true
  })
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Create something new" })
  ).toBeVisible()
  await expect(target).toHaveJSProperty("inert", true)

  await page.getByRole("button", { name: "Next", exact: true }).click()

  await expect(
    page.getByRole("alertdialog", { name: "You are ready" })
  ).toBeVisible()
  await expect(target).not.toHaveAttribute("data-tour-highlighted")
  await expect(target).toHaveJSProperty("inert", true)
})

test("restores interaction when the application withdraws inert during the tour", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--playground&viewMode=story&args=preventInteraction:true"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Create something new" })
  ).toBeVisible()
  const target = page.locator("button").filter({ hasText: "Create project" })
  await expect(target).toHaveJSProperty("inert", true)

  await target.evaluate((element: HTMLButtonElement) => {
    element.inert = false
  })
  await page.getByRole("button", { name: "Next", exact: true }).click()

  await expect(
    page.getByRole("alertdialog", { name: "You are ready" })
  ).toBeVisible()
  await expect(target).not.toHaveAttribute("data-tour-highlighted")
  await expect(target).toHaveJSProperty("inert", false)
})

test("preserves application inert added immediately before dismissal", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--late-target&viewMode=story&args=preventInteraction:true"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.getByRole("button", { name: "Reveal target" }).click()
  await expect(page.getByRole("alertdialog")).toBeVisible()
  const target = page.locator("button").filter({ hasText: "New target" })
  await expect(target).toHaveJSProperty("inert", true)

  await page.getByRole("button", { name: "Close tour" }).evaluate(
    (close, element) => {
      if (!(element instanceof HTMLButtonElement)) {
        throw new Error("Missing target button")
      }
      close.addEventListener(
        "click",
        () => {
          element.inert = true
        },
        { capture: true, once: true }
      )
    },
    await target.elementHandle()
  )
  await page.getByRole("button", { name: "Close tour" }).click()

  await expect(page.getByRole("alertdialog")).toHaveCount(0)
  await expect(target).not.toHaveAttribute("data-tour-highlighted")
  await expect(target).toHaveJSProperty("inert", true)
})

test("wait cleanup also runs on unmount", async ({ page }) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--unmount-during-wait&viewMode=story"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await page.getByRole("button", { name: "Unmount tour" }).click()
  await expect(page.getByLabel("Effect cleanup count")).toHaveText("1")
})

test("mobile panels fit, scroll long content and retain reachable actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto("/iframe.html?id=molecules-tour--long-content&viewMode=story")
  await page.getByRole("button", { name: "Start tour" }).click()
  const panel = page.getByRole("alertdialog")
  await expect(panel).toBeVisible()
  const geometry = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      x: rect.x,
      right: rect.right,
      y: rect.y,
      bottom: rect.bottom,
      scrollable: element.scrollHeight > element.clientHeight,
    }
  })
  expect(geometry.x).toBeGreaterThanOrEqual(16)
  expect(geometry.right).toBeLessThanOrEqual(304)
  expect(geometry.y).toBeGreaterThanOrEqual(16)
  expect(geometry.bottom).toBeLessThanOrEqual(552)
  expect(geometry.scrollable).toBe(true)
  await page.screenshot({ path: "libs/ui/.scratch/tour-mobile-long.png" })
  await page.getByRole("button", { name: "Finish" }).click()
  await expect(panel).toHaveCount(0)
  await startTour(page)
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Create something new" })
  ).toBeVisible()
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 568 })
    await expect
      .poll(async () =>
        panel.evaluate((element) => {
          const rect = element.getBoundingClientRect()
          return rect.left >= 0 && rect.right <= window.innerWidth
        })
      )
      .toBe(true)
  }
})

test("scrolls to a target and keeps its spotlight aligned after scrolling", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-tour--scroll-target&viewMode=story"
  )
  await page.getByRole("button", { name: "Start tour" }).click()
  await expect(
    page.getByRole("alertdialog", { name: "Further down the page" })
  ).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0)
  const target = page.getByRole("button", { name: "Target below the fold" })
  const spotlight = page.locator('[data-scope="tour"][data-part="spotlight"]')
  for (const delta of [0, 100]) {
    await page.evaluate((amount) => window.scrollBy(0, amount), delta)
    await expect
      .poll(async () => {
        const targetRect = await target.boundingBox()
        const spotRect = await spotlight.boundingBox()
        return targetRect && spotRect
          ? Math.abs(spotRect.y - (targetRect.y - 10))
          : Number.POSITIVE_INFINITY
      })
      .toBeLessThan(1)
  }
  await target.click()
  await expect(page.getByRole("alertdialog")).toBeVisible()
})
