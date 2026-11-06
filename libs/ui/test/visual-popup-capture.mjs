import { expect } from "@playwright/test"
import { PNG } from "pngjs"
import { openContractStory } from "./visual-shared-contracts.mjs"
import {
  stateCheckpointStories as atomStateCheckpointStories,
  checkStateCheckpoints as checkAtomStateCheckpoints,
} from "./visual-state-atoms-checkpoints.mjs"
import {
  checkStateCheckpoints as checkMoleculeMenuStateCheckpoints,
  stateCheckpointStories as moleculeMenuStateCheckpointStories,
} from "./visual-state-molecule-menus-checkpoints.mjs"
import {
  checkStateCheckpoints as checkMoleculePanelStateCheckpoints,
  stateCheckpointStories as moleculePanelStateCheckpointStories,
} from "./visual-state-molecule-panels-checkpoints.mjs"
import {
  checkStateCheckpoints as checkMoleculePickerStateCheckpoints,
  stateCheckpointStories as moleculePickerStateCheckpointStories,
} from "./visual-state-molecule-pickers-checkpoints.mjs"
import {
  checkStateCheckpoints as checkOrganismStateCheckpoints,
  stateCheckpointStories as organismStateCheckpointStories,
} from "./visual-state-organisms-checkpoints.mjs"
import {
  checkStateCheckpoints as checkTemplateStateCheckpoints,
  stateCheckpointStories as templateStateCheckpointStories,
} from "./visual-state-templates-checkpoints.mjs"
import {
  checkStateCheckpoints as checkToastStateCheckpoints,
  stateCheckpointStories as toastStateCheckpointStories,
} from "./visual-state-toast-checkpoints.mjs"

/** @import { Page, Locator, PageScreenshotOptions } from "@playwright/test" */
/** @typedef {{prepare: () => Promise<void>, fullPage?: boolean}} CheckpointAppearance */
/** @typedef {{x: number, y: number, width: number, height: number}} CaptureBounds */

/** Prepare only before the screenshot; both readiness calls are observational.
 * Prepared inline appearances use document-coordinate clips, avoiding the
 * implicit root scrolling performed by Locator.screenshot after readiness.
 * @param {Page} page @param {Locator} root @param {PageScreenshotOptions} options
 * @param {{fullPage: boolean, framing: {includesMarkers: boolean, bounds: CaptureBounds} | null, tile: {clip: CaptureBounds} | null, ready?: () => Promise<void>, appearance?: CheckpointAppearance}} state
 */
export async function captureCheckpointImage(page, root, options, state) {
  await state.appearance?.prepare()
  await state.ready?.()
  let image
  if (state.tile) {
    image = await page.screenshot({
      ...options,
      fullPage: true,
      clip: state.tile.clip,
    })
  } else if (state.fullPage || state.appearance?.fullPage) {
    image = await page.screenshot({ ...options, fullPage: true })
  } else if (
    state.framing &&
    (state.framing.includesMarkers || state.appearance)
  ) {
    image = await page.screenshot({
      ...options,
      fullPage: true,
      clip: state.framing.bounds,
    })
  } else {
    image = await root.screenshot(options)
  }
  await state.ready?.()
  return image
}

/** Positioner/content anatomy catches custom surfaces without a role allowlist.
 * @param {Page} page
 */
export function visibleFloatingSurfaces(page) {
  return page.evaluate(() => {
    const root = document.getElementById("storybook-root")
    const floatingRoles = [
      "dialog",
      "menu",
      "listbox",
      "tooltip",
      "tree",
      "application",
    ]
    const selector =
      '[data-scope="toast"][data-part="root"], ' +
      '[data-part="positioner"] [data-part="content"], ' +
      floatingRoles.map((role) => `[role="${role}"]`).join(", ")
    const scrollportBounds = (box, bounds, style) => {
      const scrollsX = ["auto", "scroll"].includes(style.overflowX)
      const scrollsY = ["auto", "scroll"].includes(style.overflowY)
      return {
        left: scrollsX ? bounds.left : box.left,
        right: scrollsX ? bounds.right : box.right,
        top: scrollsY ? bounds.top : box.top,
        bottom: scrollsY ? bounds.bottom : box.bottom,
      }
    }
    const outsideClipBounds = (box, bounds, clipsX, clipsY) =>
      (clipsX &&
        (box.left < bounds.left - 1 || box.right > bounds.right + 1)) ||
      (clipsY && (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1))
    const isClipped = (element, box, includeScrollports = true) => {
      let clipped = false
      let visibleBounds = box
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
        // Offscreen rows are valid inside a real scrollport. Beyond that
        // boundary, check the scrollport itself against outer clipping, not
        // the row's unscrolled coordinates. Preserve each axis independently.
        if (!includeScrollports) {
          visibleBounds = scrollportBounds(visibleBounds, bounds, parentStyle)
        }
        const overflow = includeScrollports
          ? /^(auto|scroll|hidden|clip)$/
          : /^(hidden|clip)$/
        const clipsX = overflow.test(parentStyle.overflowX)
        const clipsY = overflow.test(parentStyle.overflowY)
        clipped ||= outsideClipBounds(visibleBounds, bounds, clipsX, clipsY)
      }
      return clipped
    }
    const drawerEssentials =
      '[data-scope="drawer"][data-part="title"], ' +
      '[data-scope="drawer"][data-part="close-trigger"], ' +
      '[data-scope="drawer"][data-part="grabber"], .drawer-visible-footer'
    const toastEssentials =
      '[data-scope="toast"][data-part="title"], ' +
      '[data-scope="toast"][data-part="description"], ' +
      '[data-scope="toast"][data-part="close-trigger"], ' +
      '[data-scope="toast"][data-part="action-trigger"]'
    const scrollingDrawerHeader =
      '[data-scope="drawer"][data-part="title"], ' +
      '[data-scope="drawer"][data-part="grabber"]'
    const drawerHeaderHasScrolled = (viewport) => {
      if (!viewport) {
        return false
      }
      const style = getComputedStyle(viewport)
      return (
        ["auto", "scroll"].includes(style.overflowY) &&
        viewport.scrollHeight > viewport.clientHeight + 1 &&
        viewport.scrollTop > 1
      )
    }
    // Mirror viewportOverhang's containing-block rules inside this serialized
    // browser function. An absolute grabber can escape the inner scrollport,
    // but not its positioned containing block or an outer clipping ancestor.
    const establishesEssentialBlock = (style) =>
      [
        "transform",
        "translate",
        "rotate",
        "scale",
        "perspective",
        "filter",
        "backdropFilter",
      ].some((property) => style[property] && style[property] !== "none") ||
      (style.contain ?? "none")
        .split(" ")
        .some((value) =>
          ["layout", "paint", "strict", "content"].includes(value)
        ) ||
      (style.willChange ?? "auto")
        .split(",")
        .some((value) =>
          [
            "transform",
            "translate",
            "rotate",
            "scale",
            "perspective",
            "filter",
            "backdrop-filter",
            "contain",
          ].includes(value.trim())
        ) ||
      ["auto", "hidden"].includes(style.contentVisibility)
    const essentialPosition = (style) =>
      ["absolute", "fixed"].includes(style.position) ? style.position : null
    const escapesEssentialClip = (escaping, style) =>
      escaping &&
      !establishesEssentialBlock(style) &&
      !(escaping === "absolute" && (style.position ?? "static") !== "static")
    const bodyPropagatesOverflow = (doc, parent, style) => {
      if (parent !== doc.body || !doc.documentElement) {
        return false
      }
      const rootStyle = getComputedStyle(doc.documentElement)
      return (
        rootStyle.overflowX === "visible" &&
        rootStyle.overflowY === "visible" &&
        rootStyle.contain === "none" &&
        style.contain === "none"
      )
    }
    const intersectEssentialClip = (visible, parent, style) => {
      const bounds = parent.getBoundingClientRect()
      const scaleX = parent.offsetWidth ? bounds.width / parent.offsetWidth : 1
      const scaleY = parent.offsetHeight
        ? bounds.height / parent.offsetHeight
        : 1
      const left = bounds.left + (parent.clientLeft ?? 0) * scaleX
      const top = bounds.top + (parent.clientTop ?? 0) * scaleY
      if (["auto", "scroll", "hidden", "clip"].includes(style.overflowX)) {
        visible.left = Math.max(visible.left, left)
        visible.right = Math.min(
          visible.right,
          left + (parent.clientWidth ?? bounds.width) * scaleX
        )
      }
      if (["auto", "scroll", "hidden", "clip"].includes(style.overflowY)) {
        visible.top = Math.max(visible.top, top)
        visible.bottom = Math.min(
          visible.bottom,
          top + (parent.clientHeight ?? bounds.height) * scaleY
        )
      }
    }
    const essentialVisibleBounds = (descendant, shell) => {
      const doc = descendant.ownerDocument ?? document
      const visible = {
        left: Math.max(0, shell.left),
        top: Math.max(0, shell.top),
        right: Math.min(
          doc.documentElement?.clientWidth ?? shell.right,
          shell.right
        ),
        bottom: Math.min(
          doc.documentElement?.clientHeight ?? shell.bottom,
          shell.bottom
        ),
      }
      let escaping = essentialPosition(getComputedStyle(descendant))
      for (
        let parent = descendant.parentElement;
        parent && parent !== doc.documentElement;
        parent = parent.parentElement
      ) {
        const style = getComputedStyle(parent)
        if (escapesEssentialClip(escaping, style)) {
          continue
        }
        escaping = essentialPosition(style)
        if (
          bodyPropagatesOverflow(doc, parent, style) ||
          ["inline", "contents"].includes(style.display)
        ) {
          continue
        }
        intersectEssentialClip(visible, parent, style)
      }
      return visible
    }
    const clippedDescendants = (element, viewport, box, scope) => {
      let essentials = null
      if (viewport) {
        essentials = drawerEssentials
      } else if (scope === "toast") {
        essentials = toastEssentials
      }
      const headerScrolled = drawerHeaderHasScrolled(viewport)
      return Array.from(
        element.querySelectorAll(
          '[role="treeitem"], [role^="menuitem"], [role="grid"], [data-part="table-cell-trigger"]' +
            (essentials ? `, ${essentials}` : "")
        )
      ).flatMap((descendant) => {
        const bounds = descendant.getBoundingClientRect()
        const descendantStyle = getComputedStyle(descendant)
        // A genuinely scrolled detent can move its title/grabber vertically.
        // Header checkpoints separately prove them at the top. Close/footer,
        // horizontal bounds and every hard clipping ancestor stay mandatory.
        const movedHeader =
          headerScrolled && descendant.matches(scrollingDrawerHeader)
        const outsideEssentialBounds =
          essentials &&
          descendant.matches(essentials) &&
          outsideClipBounds(
            bounds,
            viewport
              ? essentialVisibleBounds(
                  descendant,
                  element.getBoundingClientRect()
                )
              : box,
            true,
            !movedHeader
          )
        if (
          !(bounds.width && bounds.height) ||
          descendantStyle.display === "none" ||
          descendantStyle.visibility === "hidden" ||
          !(outsideEssentialBounds || isClipped(descendant, bounds, false))
        ) {
          return []
        }
        return [
          descendant.getAttribute("aria-label") ??
            descendant.getAttribute("data-value") ??
            descendant.getAttribute("role"),
        ]
      })
    }
    const drawerViewport = (element, scope, style) => {
      if (scope !== "drawer") {
        return null
      }
      const detented = ["x", "y"].some(
        (axis) =>
          Math.abs(
            Number.parseFloat(
              style.getPropertyValue(`--drawer-snap-point-offset-${axis}`)
            ) || 0
          ) > 1
      )
      return detented
        ? element.querySelector(":scope > .drawer-visible-viewport")
        : null
    }
    return Array.from(document.querySelectorAll(selector)).flatMap(
      (element) => {
        const style = getComputedStyle(element)
        const outerBox = element.getBoundingClientRect()
        if (
          !(outerBox.width && outerBox.height) ||
          style.display === "none" ||
          style.visibility === "hidden" ||
          element.getClientRects().length === 0
        ) {
          return []
        }
        const positioner = element.closest('[data-part="positioner"]')
        const scope = element.getAttribute("data-scope")
        const role = element.getAttribute("role")
        // A dialog's positioner also contains inline tab/accordion panels.
        // Role-free popup anatomy must belong to its nearest positioner,
        // rather than treating every nested "content" part as another popup.
        const toastRoot =
          scope === "toast" &&
          element.getAttribute("data-part") === "root" &&
          element.closest('[data-scope="toast"][data-part="group"]')
        if (
          !(toastRoot || floatingRoles.includes(role)) &&
          (!positioner || positioner.getAttribute("data-scope") !== scope)
        ) {
          return []
        }
        // Detented drawers measure a full-height panel, then translate it;
        // their authored inner viewport bounds the content that remains visible.
        const viewport = drawerViewport(element, scope, style)
        const box = viewport?.getBoundingClientRect() ?? outerBox
        const positionerBox = positioner?.getBoundingClientRect()
        return [
          {
            scope,
            role,
            part: element.getAttribute("data-part"),
            external: !root?.contains(element),
            clipped:
              !(box.width && box.height) || isClipped(viewport ?? element, box),
            // An intact outer panel does not prove its hierarchy/calendar/menu
            // survived overflow clipping. Ignore scrollports here: offscreen rows
            // in a genuinely scrollable list are valid. Checkpoint targets below
            // additionally require full intersection through *all* ancestors.
            clippedDescendants: clippedDescendants(
              element,
              viewport,
              box,
              scope
            ),
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

/** @param {Page} page @param {(() => Promise<void>) | undefined} beforeCapture
 * @param {CheckpointAppearance} [appearance]
 */
export async function captureFloatingPage(page, beforeCapture, appearance) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  )
  await appearance?.prepare()
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

const documentedStateSuites = [
  { stories: atomStateCheckpointStories, run: checkAtomStateCheckpoints },
  {
    stories: moleculePickerStateCheckpointStories,
    run: checkMoleculePickerStateCheckpoints,
  },
  {
    stories: moleculeMenuStateCheckpointStories,
    run: checkMoleculeMenuStateCheckpoints,
  },
  {
    stories: moleculePanelStateCheckpointStories,
    run: checkMoleculePanelStateCheckpoints,
  },
  {
    stories: organismStateCheckpointStories,
    run: checkOrganismStateCheckpoints,
  },
  {
    stories: templateStateCheckpointStories,
    run: checkTemplateStateCheckpoints,
  },
  { stories: toastStateCheckpointStories, run: checkToastStateCheckpoints },
]

export const documentedStateCheckpointStories = documentedStateSuites.flatMap(
  ({ stories }) => stories
)

/** @type {Array<[string, string[]]>} */
export const tooltipCheckpointStories = [
  ["atoms-tooltip--sizes", ["sm", "md", "lg"]],
  ["atoms-tooltip--variants", ["default", "outline"]],
  ["atoms-tooltip--states", ["enabled"]],
  ["atoms-tooltip--long-content", ["long-content"]],
  ["atoms-tooltip--keyboard-description", ["keyboard"]],
]

/** Exercise the current story; the caller owns deterministic rendering and comparison.
 * @param {Page} page @param {string} id @param {(suffix: string, beforeCapture?: () => Promise<void>, appearance?: CheckpointAppearance) => Promise<void>} capture
 */
export async function checkStoryPopupCheckpoints(page, id, capture) {
  const suite = documentedStateSuites.find(({ stories }) =>
    stories.includes(id)
  )
  if (suite) {
    await suite.run(page, id, async (suffix, beforeCapture, appearance) => {
      if (!beforeCapture) {
        throw new Error(
          `State checkpoint ${id}${suffix} requires a readiness check`
        )
      }
      await beforeCapture()
      await capture(suffix, beforeCapture, appearance)
    })
    return
  }
  const tooltipEntry = tooltipCheckpointStories.find(
    ([storyId]) => storyId === id
  )
  if (tooltipEntry) {
    const [, states] = tooltipEntry
    const triggers = page.locator(
      '#storybook-root [data-scope="tooltip"][data-part="trigger"]:not(:has(:disabled, [aria-disabled="true"]))'
    )
    await expect(triggers).toHaveCount(states.length)
    for (const [index, state] of states.entries()) {
      const trigger = triggers.nth(index)
      if (state === "keyboard") {
        const button = trigger.getByRole("button")
        await button.evaluate((element) => element.blur())
        await page.keyboard.press("Tab")
        await button.focus()
        await expect(button).toBeFocused()
      } else {
        // A story play can dismiss a synthetic hover with Escape. A real
        // leave/re-entry clears that dismissed state before the capture.
        await trigger.hover()
        await page.mouse.move(0, 0)
        await trigger.hover()
      }
      const tooltip = page.getByRole("tooltip")
      const beforeCapture = async () => {
        await expect(tooltip).toHaveCount(1)
        await expect(tooltip).toBeVisible()
        await expect(tooltip).toHaveAttribute("data-state", "open")
        await expect(tooltip).toBeInViewport({ ratio: 1 })
      }
      await beforeCapture()
      await capture(`--tooltip-${state}-open`, beforeCapture)
      await page.keyboard.press("Escape")
      await expect(tooltip).toHaveCount(0)
    }
    return
  }
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
      async (suffix, beforeCapture, appearance) => {
        await attach(
          `${id}${suffix}`,
          (await captureFloatingPage(page, beforeCapture, appearance)).image
        )
      }
    )
  }
}
