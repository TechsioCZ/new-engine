import { expect } from "@playwright/test"
import { PNG } from "pngjs"
import { openContractStory } from "./visual-shared-contracts.mjs"

/** @import { Page } from "@playwright/test" */

/** Positioner/content anatomy catches tree/calendar/custom surfaces without an ARIA role allowlist.
 * @param {Page} page
 */
export function visibleFloatingSurfaces(page) {
  return page.evaluate(() => {
    const root = document.getElementById("storybook-root")
    const selector =
      '[data-part="positioner"] [data-part="content"], [role="dialog"], [role="menu"], [role="listbox"], [role="tooltip"], [role="tree"], [role="application"]'
    return Array.from(document.querySelectorAll(selector)).flatMap(
      (element) => {
        const style = getComputedStyle(element)
        const box = element.getBoundingClientRect()
        if (
          !(box.width && box.height) ||
          style.display === "none" ||
          style.visibility === "hidden"
        ) {
          return []
        }
        return [
          {
            scope: element.getAttribute("data-scope"),
            role: element.getAttribute("role"),
            external: !root?.contains(element),
            x: box.x + scrollX,
            y: box.y + scrollY,
            width: box.width,
            height: box.height,
          },
        ]
      }
    )
  })
}

/** Capture the page, never the story root, and assert every visible popup fits the actual PNG.
 * @param {Page} page
 */
export async function captureFloatingPage(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  )
  const surfaces = await visibleFloatingSurfaces(page)
  expect(surfaces.length).toBeGreaterThan(0)
  const image = await page.screenshot({
    fullPage: true,
    animations: "disabled",
    scale: "css",
  })
  const dimensions = PNG.sync.read(image)
  for (const surface of surfaces) {
    const label = `${surface.scope}/${surface.role}`
    expect(surface.x, `${label} starts outside capture`).toBeGreaterThanOrEqual(
      -1
    )
    expect(surface.y, `${label} starts outside capture`).toBeGreaterThanOrEqual(
      -1
    )
    expect(
      surface.x + surface.width,
      `${label} exceeds capture width`
    ).toBeLessThanOrEqual(dimensions.width + 1)
    expect(
      surface.y + surface.height,
      `${label} exceeds capture height`
    ).toBeLessThanOrEqual(dimensions.height + 1)
  }
  return { image, surfaces }
}

/** @param {Page} page @param {{brand: string, mode: string, baseURL?: string}} options @param {(name: string, image: Buffer) => Promise<void>} attach */
export async function checkPopupCheckpoints(page, options, attach) {
  for (const [id, scope] of [
    ["molecules-select--playground", "select"],
    ["molecules-menu--playground", "menu"],
    ["molecules-menu--nested-menu", "menu"],
    ["molecules-phoneinput--playground", "select"],
    ["molecules-cascadeselect--playground", "cascade-select"],
    ["molecules-datepicker--playground", "date-picker"],
  ]) {
    await openContractStory(page, id, options)
    await page
      .locator(`#storybook-root [data-scope="${scope}"][data-part="trigger"]`)
      .first()
      .click()
    const content = page
      .locator(`[data-scope="${scope}"][data-part="content"]`)
      .filter({ visible: true })
      .first()
    await expect(content).toBeVisible()
    await expect(content).toHaveAttribute("data-state", "open")
    await attach(`${id}-open`, (await captureFloatingPage(page)).image)
    if (id === "molecules-menu--nested-menu") {
      const submenu = page.getByRole("menuitem", {
        name: "Share project",
        exact: true,
      })
      await submenu.click()
      await expect(
        page.getByRole("menuitem", { name: "Send by email", exact: true })
      ).toBeVisible()
      expect(
        (await visibleFloatingSurfaces(page)).filter(
          (surface) => surface.role === "menu"
        ).length
      ).toBe(2)
      await attach(`${id}-submenu`, (await captureFloatingPage(page)).image)
    }
    if (scope === "cascade-select") {
      await page
        .getByRole("treeitem", { name: "Electronics", exact: true })
        .click()
      await expect(
        page.getByRole("treeitem", { name: "Phones", exact: true })
      ).toBeVisible()
      await attach(`${id}-hierarchy`, (await captureFloatingPage(page)).image)
    }
  }
}
