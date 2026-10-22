import { expect } from "@playwright/test"
import { PNG } from "pngjs"
import { openContractStory } from "./visual-shared-contracts.mjs"

/** @import { Page } from "@playwright/test" */

/** Positioner/content anatomy catches custom surfaces without a role allowlist.
 * @param {Page} page
 */
export function visibleFloatingSurfaces(page) {
  return page.evaluate(() => {
    const root = document.getElementById("storybook-root")
    const selector =
      '[data-part="positioner"] [data-part="content"], [role="dialog"], [role="menu"], [role="listbox"], [role="tooltip"], [role="tree"], [role="application"]'
    const isClipped = (element, box, includeScrollports = true) => {
      let clipped = false
      for (
        let parent = element.parentElement;
        parent;
        parent = parent.parentElement
      ) {
        // The page capture includes document overflow, not just the viewport.
        if (parent === document.body || parent === document.documentElement) {
          continue
        }
        const parentStyle = getComputedStyle(parent)
        const bounds = parent.getBoundingClientRect()
        const overflow = includeScrollports
          ? /^(auto|scroll|hidden|clip)$/
          : /^(hidden|clip)$/
        const clipsX = overflow.test(parentStyle.overflowX)
        const clipsY = overflow.test(parentStyle.overflowY)
        clipped ||=
          (clipsX &&
            (box.left < bounds.left - 1 || box.right > bounds.right + 1)) ||
          (clipsY &&
            (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1))
      }
      return clipped
    }
    return Array.from(document.querySelectorAll(selector)).flatMap(
      (element) => {
        const style = getComputedStyle(element)
        const box = element.getBoundingClientRect()
        if (
          !(box.width && box.height) ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          element.getClientRects().length === 0
        ) {
          return []
        }
        const positioner = element.closest('[data-part="positioner"]')
        const positionerBox = positioner?.getBoundingClientRect()
        return [
          {
            scope: element.getAttribute("data-scope"),
            role: element.getAttribute("role"),
            part: element.getAttribute("data-part"),
            external: !root?.contains(element),
            clipped: isClipped(element, box),
            // An intact outer panel does not prove its hierarchy/calendar/menu
            // survived overflow clipping. Ignore scrollports here: offscreen rows
            // in a genuinely scrollable list are valid. Checkpoint targets below
            // additionally require full intersection through *all* ancestors.
            clippedDescendants: Array.from(
              element.querySelectorAll(
                '[role="treeitem"], [role^="menuitem"], [role="grid"], [data-part="table-cell-trigger"]'
              )
            ).flatMap((descendant) => {
              const bounds = descendant.getBoundingClientRect()
              const descendantStyle = getComputedStyle(descendant)
              if (
                !(bounds.width && bounds.height) ||
                descendantStyle.display === "none" ||
                descendantStyle.visibility === "hidden" ||
                !isClipped(descendant, bounds, false)
              ) {
                return []
              }
              return [
                descendant.getAttribute("aria-label") ??
                  descendant.getAttribute("data-value") ??
                  descendant.getAttribute("role"),
              ]
            }),
            inaccessible: !!element.closest('[inert], [aria-hidden="true"]'),
            x: box.x + scrollX,
            y: box.y + scrollY,
            width: box.width,
            height: box.height,
            positioner:
              positionerBox?.width && positionerBox.height
                ? {
                    x: positionerBox.x + scrollX,
                    y: positionerBox.y + scrollY,
                    width: positionerBox.width,
                    height: positionerBox.height,
                  }
                : null,
          },
        ]
      }
    )
  })
}

/** Check both CSS clipping and PNG bounds, independently of ARIA roles.
 * @param {Awaited<ReturnType<typeof visibleFloatingSurfaces>>} surfaces
 * @param {{width: number, height: number}} dimensions
 */
export function assertFloatingContainment(surfaces, dimensions) {
  expect(
    surfaces.length,
    "Expected an opened floating surface"
  ).toBeGreaterThan(0)
  for (const surface of surfaces) {
    const label = `${surface.scope}/${surface.part ?? surface.role}`
    expect(surface.clipped, `${label} is clipped by an ancestor`).toBe(false)
    expect(
      surface.clippedDescendants ?? [],
      `${label} descendants are clipped by an ancestor`
    ).toEqual([])
    for (const [part, bounds] of [
      ["content", surface],
      ["positioner", surface.positioner],
    ]) {
      if (!bounds) {
        continue
      }
      expect(
        bounds.x,
        `${label} ${part} starts outside capture`
      ).toBeGreaterThanOrEqual(-1)
      expect(
        bounds.y,
        `${label} ${part} starts outside capture`
      ).toBeGreaterThanOrEqual(-1)
      expect(
        bounds.x + bounds.width,
        `${label} ${part} exceeds capture width`
      ).toBeLessThanOrEqual(dimensions.width + 1)
      expect(
        bounds.y + bounds.height,
        `${label} ${part} exceeds capture height`
      ).toBeLessThanOrEqual(dimensions.height + 1)
    }
  }
}

/** @param {Page} page @param {(() => Promise<void>) | undefined} beforeCapture */
export async function captureFloatingPage(page, beforeCapture) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  )
  await beforeCapture?.()
  const surfaces = await visibleFloatingSurfaces(page)
  const image = await page.screenshot({
    fullPage: true,
    animations: "disabled",
    scale: "css",
  })
  await beforeCapture?.()
  assertFloatingContainment(surfaces, PNG.sync.read(image))
  return { image, surfaces }
}

/** Assert the state at the capture boundary, after pointer parking and asset waits.
 * @param {Page} page
 */
export async function assertSubmenuCaptureReady(page) {
  const menus = page
    .locator('[data-scope="menu"][data-part="content"]')
    .filter({ visible: true })
  await expect(menus).toHaveCount(2)
  for (const menu of await menus.all()) {
    await expect(menu).toHaveAttribute("data-state", "open")
    await expect(menu).toHaveCSS("opacity", "1")
  }
  for (const name of ["Send by email", "Invite teammate"]) {
    const item = page.getByRole("menuitem", { name, exact: true })
    await expect(item).toBeVisible()
    await expect(item).toBeInViewport({ ratio: 1 })
  }
  // Positioning and delayed pointer-out state must settle without a fixed sleep.
  await expect
    .poll(
      async () => {
        const before = await visibleFloatingSurfaces(page)
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve))
            )
        )
        const after = await visibleFloatingSurfaces(page)
        return (
          after.filter(
            (surface) => surface.scope === "menu" && surface.part === "content"
          ).length === 2 && JSON.stringify(before) === JSON.stringify(after)
        )
      },
      { message: "Both submenu surfaces must remain stable at capture" }
    )
    .toBe(true)
  const viewport = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))
  assertFloatingContainment(await visibleFloatingSurfaces(page), viewport)
}

export const popupCheckpointStories = [
  ["molecules-select--playground", "select"],
  ["molecules-menu--playground", "menu"],
  ["molecules-menu--nested-menu", "menu"],
  ["molecules-phoneinput--playground", "select"],
  ["molecules-cascadeselect--playground", "cascade-select"],
  ["molecules-datepicker--playground", "date-picker"],
]

/** Exercise the current story; the caller owns deterministic rendering and comparison.
 * @param {Page} page @param {string} id @param {(suffix: string, beforeCapture?: () => Promise<void>) => Promise<void>} capture
 */
export async function checkStoryPopupCheckpoints(page, id, capture) {
  const entry = popupCheckpointStories.find(([storyId]) => storyId === id)
  if (!entry) {
    return
  }
  const [, scope] = entry
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
  // Background dialogs can legitimately be inert beneath a nested overlay;
  // require accessibility on the active checkpoint, not every visible backdrop.
  await expect
    .poll(() =>
      content.evaluate(
        (element) => !!element.closest('[inert], [aria-hidden="true"]')
      )
    )
    .toBe(false)
  await expect(
    content.locator('xpath=ancestor::*[@data-part="positioner"]')
  ).toBeVisible()
  if (scope === "cascade-select") {
    await expect(content).toHaveAttribute("role", "tree")
    await expect(
      page.getByRole("treeitem", { name: "Electronics", exact: true })
    ).toBeInViewport({ ratio: 1 })
  }
  if (scope === "date-picker") {
    await expect(content.getByRole("grid")).toBeVisible()
    await expect(content.getByRole("grid")).toBeInViewport({ ratio: 1 })
    await expect(
      content.locator('[data-part="table-cell-trigger"]').first()
    ).toBeVisible()
  }
  await page.mouse.move(0, 0)
  await capture("--popup-open")
  if (id === "molecules-menu--nested-menu") {
    // Park before keyboard activation: moving off a pointer-opened submenu can
    // legitimately schedule its close while assets settle for the screenshot.
    await content.press("End")
    await expect(
      page.getByRole("menuitem", { name: "Share project", exact: true })
    ).toHaveAttribute("data-highlighted", "")
    await content.press("ArrowRight")
    const beforeCapture = () => assertSubmenuCaptureReady(page)
    await beforeCapture()
    await capture("--popup-submenu", beforeCapture)
  }
  if (scope === "cascade-select") {
    await page
      .getByRole("treeitem", { name: "Electronics", exact: true })
      .click()
    await expect(
      page.getByRole("treeitem", { name: "Phones", exact: true })
    ).toBeVisible()
    // Narrow screens intentionally scroll columns horizontally. Reveal the new
    // column only in a real scrollport, never by scrolling an overflow-hidden
    // regression into view and accidentally hiding the clipping defect.
    await content.evaluate(async (element) => {
      // Let the component's two-frame highlighted-row scrolling finish first.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
      const overflowX = getComputedStyle(element).overflowX
      if (overflowX === "auto" || overflowX === "scroll") {
        element.scrollLeft = element.scrollWidth
      }
    })
    // toBeVisible only checks CSS/box existence; IntersectionObserver also
    // accounts for ancestor overflow and catches a completely clipped column.
    await expect(
      page.getByRole("treeitem", { name: "Phones", exact: true })
    ).toBeInViewport({ ratio: 1 })
    await page.mouse.move(0, 0)
    await capture("--popup-hierarchy")
  }
}

/** @param {Page} page @param {{brand: string, mode: string, baseURL?: string}} options @param {(name: string, image: Buffer) => Promise<void>} attach */
export async function checkPopupCheckpoints(page, options, attach) {
  for (const [id] of popupCheckpointStories) {
    await openContractStory(page, id, options)
    await checkStoryPopupCheckpoints(
      page,
      id,
      async (suffix, beforeCapture) => {
        await attach(
          `${id}${suffix}`,
          (await captureFloatingPage(page, beforeCapture)).image
        )
      }
    )
  }
}
