import { expect, type Page, test } from "@playwright/test"

type ProbeResult = {
  firstBox: { left: number; top: number; right: number; bottom: number }
  removedAfterOpen: boolean
}

const positionerSelector = '[data-scope="tooltip"][data-part="positioner"]'

// Records the positioner box at insertion, before Zag has measured it. That is
// the box the browser paints in the first frame, under the resting pointer.
function installProbe(page: Page) {
  return page.evaluate((selector) => {
    const result: Partial<ProbeResult> = { removedAfterOpen: false }
    Reflect.set(window, "__tooltipProbe", result)
    new MutationObserver(() => {
      const positioner = document.querySelector(selector)
      if (!result.firstBox && positioner) {
        const { left, top, right, bottom } = positioner.getBoundingClientRect()
        result.firstBox = { left, top, right, bottom }
      } else if (result.firstBox && !positioner) {
        result.removedAfterOpen = true
      }
    }).observe(document.body, { childList: true, subtree: true })
  }, positionerSelector)
}

const readProbe = (page: Page) =>
  page.evaluate(() => Reflect.get(window, "__tooltipProbe") as ProbeResult)

// Two animation frames: the browser has painted the placed hint and run its
// hover update for the pointer, which is when a stray pointer leave lands.
const nextPaintedFrames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )

test("keyboard-opened tooltip stays open with the pointer at the page corner", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=atoms-tooltip--keyboard-description&viewMode=story"
  )
  // The story's play function drives the same trigger; let it finish first.
  await page.waitForFunction(
    () =>
      Reflect.get(window, "__STORYBOOK_PREVIEW__")?.currentRender?.phase ===
      "finished"
  )
  const trigger = page.getByRole("button", { name: "Keyboard trigger 1" })
  const tooltip = page.getByRole("tooltip")
  await expect(tooltip).toHaveCount(0)

  // Unplaced popups paint at the top-left corner; rest the pointer exactly there.
  await page.mouse.move(0, 0)
  // The play leaves focus on the trigger; step out so Tab focuses it again.
  await page.keyboard.press("Shift+Tab")
  await expect(trigger).not.toBeFocused()
  await installProbe(page)
  await page.keyboard.press("Tab")
  await expect(trigger).toBeFocused()
  await expect(tooltip).toBeVisible()

  // Placed: Zag has written measured --x/--y inline on the positioner.
  const positioner = page.locator(positionerSelector)
  await expect
    .poll(() =>
      positioner.evaluate((element) =>
        (element as HTMLElement).style.getPropertyValue("--x")
      )
    )
    .not.toBe("")
  await nextPaintedFrames(page)

  const probe = await readProbe(page)
  const { firstBox } = probe
  // The first painted box must not sit under the pointer at (0, 0).
  expect(
    firstBox.left <= 0 &&
      firstBox.right > 0 &&
      firstBox.top <= 0 &&
      firstBox.bottom > 0,
    `first painted positioner box ${JSON.stringify(firstBox)} covers the pointer`
  ).toBe(false)
  expect(probe.removedAfterOpen).toBe(false)
  await expect(tooltip).toBeVisible()
  await expect(trigger).toBeFocused()
})
