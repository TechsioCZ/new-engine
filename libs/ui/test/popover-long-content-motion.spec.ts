import { expect, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

const playError = /TestingLibraryElementError|AssertionError|Error: expect/

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) {
    return
  }
  const geometry = await page.evaluate(() => {
    const panel = document.querySelector(
      '[data-scope="popover"][data-part="content"]'
    )
    const positioner = panel?.closest('[data-part="positioner"]')
    const viewport = panel?.querySelector<HTMLElement>(
      ".popover-scroll-viewport"
    )
    const last = viewport
      ? Array.from(viewport.querySelectorAll("p")).at(-1)
      : null
    const style = positioner ? getComputedStyle(positioner) : null
    return {
      panel: panel?.getBoundingClientRect().toJSON(),
      viewport: viewport?.getBoundingClientRect().toJSON(),
      last: last?.getBoundingClientRect().toJSON(),
      clientHeight: viewport?.clientHeight,
      scrollHeight: viewport?.scrollHeight,
      scrollTop: viewport?.scrollTop,
      positioner: style
        ? Object.fromEntries(
            [
              "--x",
              "--y",
              "--available-width",
              "--available-height",
              "width",
              "height",
            ].map((name) => [name, style.getPropertyValue(name)])
          )
        : null,
      focusedPart: document.activeElement?.getAttribute("data-part"),
      motion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    }
  })
  await info.attach("popover-scroll-geometry", {
    body: JSON.stringify(geometry, null, 2),
    contentType: "application/json",
  })
})

for (const [brand, mode] of [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
]) {
  for (const motion of ["reduce", "no-preference"] as const) {
    test(`${brand} ${mode} long Popover retains scroll reachability with ${motion} motion`, async ({
      page,
    }) => {
      const errors: string[] = []
      page.on("console", (message) => {
        if (message.type() === "error" && playError.test(message.text())) {
          errors.push(message.text())
        }
      })
      await page.emulateMedia({ reducedMotion: motion })
      await openContractStory(page, "molecules-popover--long-content", {
        brand,
        mode,
      })
      expect(errors).toEqual([])
      const trigger = page.getByRole("button", {
        name: "Review attachment",
        exact: true,
      })
      await trigger.click()
      const panel = page.getByRole("dialog", { name: "Attachment details" })
      const close = panel.getByRole("button", {
        name: "Dismiss attachment details",
      })
      await expect(close).toBeFocused()
      const viewport = panel.locator(".popover-scroll-viewport")
      const last = panel.getByText(
        "Attachment 15: review availability and regional delivery information.",
        { exact: true }
      )
      await viewport.evaluate((element) =>
        element.scrollTo({ top: element.scrollHeight, behavior: "instant" })
      )
      await expect
        .poll(async () => {
          const [content, end] = await Promise.all([
            viewport.boundingBox(),
            last.boundingBox(),
          ])
          if (!(content && end)) {
            throw new Error("Missing long Popover scroll geometry")
          }
          return Math.max(
            content.y - end.y,
            end.y + end.height - content.y - content.height
          )
        })
        .toBeLessThanOrEqual(1)
      await expect(close).toBeVisible()
      await page.keyboard.press("Escape")
      await expect(panel).toHaveCount(0)
      await expect(trigger).toBeFocused()
      expect(errors).toEqual([])
    })
  }
}
