import { expect, type Locator, test } from "@playwright/test"
import { checkStateCheckpoints } from "./visual-state-toast-checkpoints.mjs"

// Match the failed business-mobile capture, including its shorter viewport.
test.use({ viewport: { width: 393, height: 659 } })

const toastSelector = '[data-scope="toast"][data-part="root"]'

async function pointerClick(button: Locator) {
  await expect(button).toBeInViewport({ ratio: 1, timeout: 5000 })
  await button.click({ timeout: 5000 })
}

for (const story of ["batch-operations", "remove-vs-dismiss"]) {
  test(`${story} keeps every stacked-toast control pointer-reachable`, async ({
    page,
  }) => {
    const id = `molecules-toast--${story}`
    await page.goto(
      `/iframe.html?id=${id}&viewMode=story&globals=brand:business`
    )
    const captured: string[] = []
    expect(
      await checkStateCheckpoints(page, id, async (suffix, beforeCapture) => {
        // Includes exact toast anatomy, full viewport visibility and 5s trial
        // clicks on all controls before either toast has been removed.
        await beforeCapture?.()
        captured.push(suffix)
      })
    ).toBe(true)
    expect(captured).toHaveLength(1)
    await expect(page.locator(toastSelector)).toHaveCount(0)
  })
}

test("batch pause preserves all three real timers, resume expires them, and remove clears them", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=molecules-toast--batch-operations&viewMode=story&globals=brand:business"
  )
  const controls = page.locator("#storybook-root")
  const button = (name: string) =>
    controls.getByRole("button", { name, exact: true })
  const toasts = page.locator(toastSelector)
  const paused = page.locator(`${toastSelector}[data-paused]`)

  await pointerClick(button("Create 3 Toasts"))
  await expect(toasts).toHaveCount(3)
  await pointerClick(button("Pause All"))
  await expect(paused).toHaveCount(3)
  for (const name of ["Pause All", "Resume All", "Remove All"]) {
    await expect(button(name)).toBeInViewport({ ratio: 1, timeout: 5000 })
    await button(name).click({ trial: true, timeout: 5000 })
  }

  // Deliberately outlast the authored 5s duration with real timers: a broken
  // pause must not pass merely because the next action happened immediately.
  await page.mouse.move(0, 0)
  await page.waitForTimeout(5100)
  await expect(toasts).toHaveCount(3)
  await expect(paused).toHaveCount(3)
  await pointerClick(button("Resume All"))
  await expect(paused).toHaveCount(0)
  await expect(toasts).toHaveCount(0, { timeout: 7000 })

  await pointerClick(button("Create 3 Toasts"))
  await pointerClick(button("Pause All"))
  await expect(paused).toHaveCount(3)
  await pointerClick(button("Remove All"))
  await expect(toasts).toHaveCount(0)
  await expect(button("Pause All")).toHaveCount(0)
  await expect(button("Resume All")).toHaveCount(0)
  await expect(button("Remove All")).toHaveCount(0)
})
