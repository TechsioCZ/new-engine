import { expect, type Locator, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

async function expectFullFocusPaint(link: Locator) {
  await expect(link).toBeFocused()
  const paint = await link.evaluate((element) => {
    const nav = element.closest("nav")
    const root = element.ownerDocument.getElementById("storybook-root")
    if (!(nav && root)) {
      throw new Error("Missing pagination focus host")
    }
    const style = getComputedStyle(element)
    const width =
      Number.parseFloat(style.getPropertyValue("--default-ring-width")) || 0
    const offset =
      Number.parseFloat(style.getPropertyValue("--default-ring-offset")) || 0
    const outline =
      style.outlineStyle === "none"
        ? 0
        : (Number.parseFloat(style.outlineWidth) || 0) +
          (Number.parseFloat(style.outlineOffset) || 0)
    const halo = style.boxShadow === "none" ? 0 : offset + width * 2
    const extent = Math.max(0, outline, halo)
    const rect = element.getBoundingClientRect()
    const viewport = nav.getBoundingClientRect()
    const frame = root.getBoundingClientRect()
    const left = Math.max(viewport.left + nav.clientLeft, frame.left, 0)
    const right = Math.min(
      viewport.left + nav.clientLeft + nav.clientWidth,
      frame.right,
      element.ownerDocument.documentElement.clientWidth
    )
    const top = Math.max(viewport.top + nav.clientTop, frame.top, 0)
    const bottom = Math.min(
      viewport.top + nav.clientTop + nav.clientHeight,
      frame.bottom,
      element.ownerDocument.documentElement.clientHeight
    )
    return {
      extent,
      focusVisible: element.matches(":focus-visible"),
      overflow: getComputedStyle(nav).overflowX,
      escape: Math.max(
        left - rect.left + extent,
        rect.right + extent - right,
        top - rect.top + extent,
        rect.bottom + extent - bottom
      ),
      control: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: {
        x: viewport.x,
        y: viewport.y,
        width: nav.clientWidth,
        height: nav.clientHeight,
      },
    }
  })
  expect(paint.focusVisible, JSON.stringify(paint)).toBe(true)
  expect(paint.extent, JSON.stringify(paint)).toBeGreaterThan(0)
  expect(paint.overflow).toBe("auto")
  expect(paint.escape, JSON.stringify(paint)).toBeLessThanOrEqual(1)
}

for (const [brand, mode] of [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
]) {
  for (const width of [240, 361, 1280]) {
    for (const dir of ["ltr", "rtl"]) {
      test(`${brand} ${mode} ${width}px ${dir} pagination host preserves complete focus paint`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 844 })
        await openContractStory(page, "organisms-datatable--pagination", {
          brand,
          mode,
        })
        const nav = page.getByRole("navigation", {
          name: "pagination",
          exact: true,
        })
        const previous = nav.getByRole("link", {
          name: "previous page",
          exact: true,
        })
        // Inspect the completed play before changing direction or focus.
        await expectFullFocusPaint(previous)
        // Exercise the host's logical layout without changing the widget's API.
        await nav.evaluate(
          (element, direction) => element.setAttribute("dir", direction),
          dir
        )
        await expect(nav).toHaveCSS("direction", dir)
        const before = await previous.boundingBox()
        if (!before) {
          throw new Error("Missing pagination link")
        }
        await previous.press("Tab")
        for (const link of await nav
          .getByRole("link")
          .filter({ visible: true })
          .all()) {
          if (await link.isEnabled()) {
            await link.focus()
            await expectFullFocusPaint(link)
          }
        }
        await previous.focus()
        await expectFullFocusPaint(previous)
        const after = await previous.boundingBox()
        if (!after) {
          throw new Error("Missing focused pagination link")
        }
        expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1)
        expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1)
        await expect(
          page.getByText("6–10 of 500", { exact: true })
        ).toBeVisible()
      })
    }
  }
}
