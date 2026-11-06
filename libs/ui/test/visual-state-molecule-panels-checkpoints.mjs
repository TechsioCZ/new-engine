import { expect } from "@playwright/test"
import { assertWithinViewport } from "./visual-viewport.mjs"

/** @import { Page, Locator } from "@playwright/test" */

const catalogReviewRow = /^Review product \d+:/
const attachmentName = /^Catalog-2026-AB1234567890/
const attachmentRow = /^Attachment \d+:/

// Only source-confirmed Dialog/Drawer/Popover gaps. Existing Playground and
// Drawer placement/size checkpoints remain owned by the original capture lane.
const panelMatrices = {
  "molecules-dialog--sizes": {
    scope: "dialog",
    indexed: true,
    states: ["xs", "sm", "md", "lg", "xl", "full"].map((size) => ({
      appearance: size,
      trigger: size.toUpperCase(),
      title: `${size.toUpperCase()} dialog`,
      text: "Small confirmations need less space than detailed forms.",
    })),
  },
  "molecules-dialog--alert-dialog": {
    scope: "dialog",
    role: "alertdialog",
    states: [
      {
        appearance: "destructive-confirmation",
        trigger: "Delete account",
        title: "Delete the Northstar account?",
        text: "All projects and saved files in Northstar will be permanently removed. This cannot be undone.",
      },
    ],
  },
  "molecules-dialog--rich-content": {
    scope: "dialog",
    states: [
      {
        appearance: "profile-form",
        trigger: "Edit profile",
        title: "Edit profile",
      },
    ],
  },
  "molecules-dialog--minimal": {
    scope: "dialog",
    states: [
      {
        appearance: "informational",
        trigger: "View delivery note",
        title: "Delivery instructions",
        text: "Deliveries arrive at reception on weekdays between 09:00 and 17:00.",
      },
    ],
  },
  "molecules-dialog--modeless": {
    scope: "dialog",
    states: [
      {
        appearance: "modeless-activity",
        trigger: "Open activity window",
        title: "Recent activity",
        text: "Twelve catalog records were updated today.",
      },
    ],
  },
  "molecules-dialog--long-content": {
    scope: "dialog",
    states: [
      {
        appearance: "catalog-review",
        trigger: "Review long catalog",
        title: "Review catalog",
      },
    ],
  },
  "molecules-drawer--custom-container": {
    scope: "drawer",
    states: [
      {
        appearance: "contained-workspace",
        trigger: "Open contained drawer",
        title: "Contained drawer",
        text: "Workspace permissions were last updated yesterday.",
      },
    ],
  },
  "molecules-drawer--non-modal": {
    scope: "drawer",
    states: [
      {
        appearance: "non-modal-activity",
        trigger: "Open activity panel",
        title: "Recent activity",
        text: "Twelve catalog records were updated today.",
      },
    ],
  },
  "molecules-drawer--multiple-triggers": {
    scope: "drawer",
    states: [
      {
        appearance: "ada-profile-form",
        trigger: "Edit Ada",
        title: "Edit profile",
      },
    ],
  },
  "molecules-popover--sizes": {
    scope: "popover",
    indexed: true,
    states: ["sm", "md", "lg"].map((size) => ({
      appearance: size,
      trigger: "Delivery details",
      title: "Delivery details",
      text: "Track your order from your account.",
    })),
  },
  "molecules-popover--variants": {
    scope: "popover",
    states: [
      {
        appearance: "default",
        trigger: "Default",
        title: "Default Style",
        text: "Border + Shadow (default)",
      },
      {
        appearance: "border-only",
        trigger: "border-only",
        title: "Flat Style",
        text: "Border only, no shadow",
      },
      {
        appearance: "shadow-only",
        trigger: "shadow-only",
        title: "Elevated Style",
        text: "Shadow only, no border",
      },
      {
        appearance: "minimal",
        trigger: "Minimal",
        title: "Minimal Style",
        text: "No border, no shadow",
      },
      {
        appearance: "no-arrow",
        trigger: "No Arrow",
        title: "Clean Look",
        text: "No arrow indicator",
      },
    ],
  },
  "molecules-popover--with-form": {
    scope: "popover",
    states: [
      {
        appearance: "contact-form",
        trigger: "Edit delivery contact",
        title: "Delivery contact",
      },
    ],
  },
  "molecules-popover--long-content": {
    scope: "popover",
    states: [
      {
        appearance: "attachment-review",
        trigger: "Review attachment",
        title: "Attachment details",
      },
    ],
  },
  "molecules-popover--same-width-demo": {
    scope: "popover",
    states: [
      {
        appearance: "medium-trigger-width",
        trigger: "Medium Length Trigger",
        title: "Same Width",
        text: "This popover exactly matches the trigger button width.",
      },
      {
        appearance: "long-trigger-width",
        trigger: "Very Long Trigger Button Text Here",
        title: "Same Width",
        text: "Wide as trigger!",
      },
    ],
  },
  "molecules-popover--edge-positioning": {
    scope: "popover",
    states: [
      {
        appearance: "top-left",
        trigger: "Top Left",
        title: "Top-left details",
        text: "Opens at screen corner with smart positioning.",
      },
      {
        appearance: "top-right",
        trigger: "Top Right",
        title: "Top-right details",
        text: "Adjusts to avoid viewport overflow.",
      },
      {
        appearance: "bottom-left",
        trigger: "Bottom Left",
        title: "Bottom-left details",
        text: "Flips upward when at bottom.",
      },
      {
        appearance: "bottom-right",
        trigger: "Bottom Right",
        title: "Bottom-right details",
        text: "Smart positioning at corner.",
      },
      {
        appearance: "center",
        trigger: "Center",
        title: "Center details",
        text: "Center positioned with default behavior.",
      },
    ],
  },
  "molecules-popover--overflow-padding-demo": {
    scope: "popover",
    states: [
      {
        appearance: "padding-8px",
        trigger: "Default Padding (8px)",
        title: "Standard Gap",
        text: "8px minimum gap from viewport edges.",
        padding: 8,
      },
      {
        appearance: "padding-24px",
        trigger: "Large Padding (24px)",
        title: "Large Gap",
        text: "24px minimum gap from viewport edges.",
        padding: 24,
      },
      {
        appearance: "padding-0px",
        trigger: "No Padding (0px)",
        title: "No Gap",
        text: "Can touch viewport edges.",
        padding: 0,
      },
    ],
  },
  "molecules-popover--positioning-behaviors": {
    scope: "popover",
    states: [
      {
        appearance: "flip",
        trigger: "Flip Demo",
        title: "Auto Flip",
        text: "This popover opens on the left but will flip to right if there's no space.",
      },
      {
        appearance: "bounded-slide-enabled",
        trigger: "slide=true",
        title: "Slide Enabled",
        text: "Arrow shifts to keep popover visible.",
      },
      {
        appearance: "bounded-slide-disabled",
        trigger: "slide=false",
        title: "Slide Disabled",
        text: "Popover stays centered, may overflow.",
      },
    ],
  },
}

const snapDetents = [
  { height: 0.5, suffix: "--state-half-height-open" },
  {
    height: 0.25,
    suffix: "--state-quarter-height-open",
    controlsSuffix: "--state-quarter-height-controls-open",
  },
  { height: 1, suffix: "--state-full-height-open" },
]

const layeredAppearances = {
  "molecules-dialog--nested-overlays": [
    "dialog-host-nested-dialog",
    "dialog-host-nested-drawer",
    "drawer-host-nested-dialog",
    "drawer-host-nested-drawer",
  ],
  "molecules-drawer--stack": ["account-security-stack"],
  "molecules-popover--nested-popovers": ["three-levels"],
}

/** Pure inventory for the parent's manifest and focused Node contract tests. */
export const stateCheckpointSuffixes = Object.fromEntries([
  ...Object.entries(panelMatrices).map(([id, { states }]) => [
    id,
    states.map(({ appearance }) => `--state-${appearance}-open`),
  ]),
  ...Object.entries(layeredAppearances).map(([id, appearances]) => [
    id,
    appearances.map((appearance) => `--state-${appearance}-open`),
  ]),
  [
    "molecules-drawer--snap-points-and-swipe",
    snapDetents.flatMap(({ suffix, controlsSuffix }) =>
      controlsSuffix ? [suffix, controlsSuffix] : [suffix]
    ),
  ],
])

export const stateCheckpointStories = Object.keys(stateCheckpointSuffixes)

/** @param {Locator} panel @param {boolean} [fullViewport] @param {boolean} [active] */
async function assertPanelReady(panel, fullViewport = true, active = true) {
  await expect(panel).toHaveCount(1)
  await expect(panel).toBeVisible()
  await expect(panel).toHaveAttribute("data-state", "open")
  await expect(panel).toHaveCSS("opacity", "1")
  if (active) {
    await expect
      .poll(() =>
        panel.evaluate(
          (element) => !!element.closest('[inert], [aria-hidden="true"]')
        )
      )
      .toBe(false)
  }
  if (fullViewport) {
    await assertWithinViewport(panel)
  }
  // Positioning/transitions must actually settle, not merely produce a box.
  await expect
    .poll(() =>
      panel.evaluate(async (element) => {
        const geometry = () => {
          const { x, y, width, height } = element.getBoundingClientRect()
          return [x, y, width, height]
        }
        const before = geometry()
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
        return JSON.stringify(before) === JSON.stringify(geometry())
      })
    )
    .toBe(true)
}

/** Keep an anatomy locator that still resolves when a child makes its host inert.
 * @param {Locator} panel @param {Page} page
 */
async function retainedPanel(panel, page) {
  await expect(panel).toBeVisible()
  const id = await panel.getAttribute("id")
  expect(id, "An open panel must have an anatomy ID").toBeTruthy()
  return page.locator(`[id=${JSON.stringify(id)}]`)
}

/** @param {Locator} target */
async function assertViewportControl(target) {
  await expect(target).toBeVisible()
  await assertWithinViewport(target)
}

/** @param {Locator} viewport */
async function assertScrollable(viewport) {
  await expect(viewport).toHaveCount(1)
  await assertWithinViewport(viewport)
  await expect
    .poll(() =>
      viewport.evaluate(
        (element) =>
          ["auto", "scroll"].includes(getComputedStyle(element).overflowY) &&
          element.scrollHeight > element.clientHeight
      )
    )
    .toBe(true)
}

/** @param {Page} page @param {Locator} panel */
async function dismissPanel(page, panel) {
  await page.keyboard.press("Escape")
  await expect(panel).toBeHidden()
}

/** @typedef {{appearance: string, trigger: string, title: string, text?: string, padding?: number}} PanelState */
/** @typedef {{page: Page, id: string, panel: Locator, trigger: Locator, state: PanelState}} DetailContext */

/** @param {Locator} panel @param {string[]} names */
async function assertViewportButtons(panel, names) {
  for (const name of names) {
    await assertViewportControl(
      panel.getByRole("button", { name, exact: true })
    )
  }
}

/** @param {DetailContext} context */
async function assertPopoverPositioned({ panel, trigger }) {
  await expect
    .poll(() =>
      panel.evaluate(
        (element) =>
          element
            .closest('[data-part="positioner"]')
            ?.style.getPropertyValue("--x") ?? ""
      )
    )
    .not.toBe("")
  await expect(trigger).toHaveAttribute("aria-expanded", "true")
}

/** @param {DetailContext} context */
async function assertAlertDialog({ panel }) {
  await expect(
    panel.getByRole("button", { name: "Cancel", exact: true })
  ).toBeFocused()
  await assertViewportButtons(panel, ["Delete account"])
}

/** @param {DetailContext} context */
async function assertProfileDialog({ panel }) {
  await expect(
    panel.getByRole("textbox", { name: "Display name" })
  ).toHaveValue("Alex Morgan")
  await assertViewportButtons(panel, ["Cancel", "Save changes"])
}

/** @param {DetailContext} context */
async function assertMinimalDialog({ panel }) {
  await expect(panel.getByRole("button")).toHaveCount(1)
  await assertViewportControl(
    panel.getByRole("button", { name: "Close dialog" })
  )
}

/** @param {DetailContext} context */
async function assertNonModal({ page, id, panel }) {
  await expect(panel).not.toHaveAttribute("aria-modal", "true")
  const scope = id.startsWith("molecules-dialog") ? "dialog" : "drawer"
  await expect(
    page.locator(`[data-scope="${scope}"][data-part="backdrop"]:visible`)
  ).toHaveCount(0)
  const refresh = page.getByRole("button", {
    name: "Refresh results",
    exact: true,
  })
  await expect(refresh).toBeEnabled()
  await expect
    .poll(() =>
      refresh.evaluate(
        (element) => !!element.closest('[inert], [aria-hidden="true"]')
      )
    )
    .toBe(false)
}

/** @param {DetailContext} context */
async function assertLongDialog({ panel }) {
  await expect(panel.getByText(catalogReviewRow)).toHaveCount(24)
  await assertScrollable(panel.locator(".dialog-scroll-viewport"))
  await assertViewportButtons(panel, ["Publish changes"])
  await assertViewportControl(
    panel.getByRole("button", { name: "Close dialog" })
  )
}

/** @param {DetailContext} context */
async function assertContainedDrawer({ panel }) {
  // The Positioner is mounted directly in the actual workspace portal target.
  const bounds = await panel.evaluate((element) => {
    const positioner = element.closest('[data-part="positioner"]')
    const container = positioner?.parentElement
    const outer = container?.getBoundingClientRect()
    const inner = element.getBoundingClientRect()
    return outer
      ? {
          contained:
            inner.left >= outer.left &&
            inner.top >= outer.top &&
            inner.right <= outer.right &&
            inner.bottom <= outer.bottom,
          workspaceWidth: outer.width,
          viewportWidth: document.documentElement.clientWidth,
        }
      : null
  })
  expect(bounds?.contained, "Contained drawer must fit its workspace").toBe(
    true
  )
  expect(bounds?.workspaceWidth).toBeLessThan(bounds?.viewportWidth)
}

/** @param {DetailContext} context */
async function assertDrawerProfile({ panel }) {
  await expect(panel.getByRole("textbox", { name: "Full name" })).toHaveValue(
    "Ada Lovelace"
  )
  await expect(
    panel.getByRole("textbox", { name: "Email address" })
  ).toHaveValue("ada@example.com")
  await assertViewportButtons(panel, ["Cancel", "Save changes"])
}

/** @param {DetailContext} context */
async function assertPopoverArrow({ panel, state }) {
  const arrows = state.appearance === "no-arrow" ? 0 : 1
  await expect(panel.locator('[data-part="arrow"]')).toHaveCount(arrows)
}

/** @param {DetailContext} context */
async function assertPopoverForm({ panel }) {
  await expect(panel.getByRole("textbox", { name: "Full name" })).toHaveValue(
    "Mara Nováková"
  )
  await expect(
    panel.getByText("Use the name shown on your delivery address.", {
      exact: true,
    })
  ).toBeVisible()
  await assertViewportButtons(panel, ["Cancel", "Save contact"])
}

/** @param {DetailContext} context */
async function assertLongPopover({ panel }) {
  await expect(panel.getByText(attachmentName)).toBeVisible()
  await expect(panel.getByText(attachmentRow)).toHaveCount(15)
  await assertScrollable(panel.locator(".popover-scroll-viewport"))
  await assertViewportControl(
    panel.getByRole("button", { name: "Dismiss attachment details" })
  )
}

/** @param {DetailContext} context */
async function assertSameWidth({ panel, trigger }) {
  await expect
    .poll(async () => {
      const panelBox = await panel.boundingBox()
      const triggerBox = await trigger.boundingBox()
      if (!(panelBox && triggerBox)) {
        return Number.POSITIVE_INFINITY
      }
      return Math.abs(panelBox.width - triggerBox.width)
    })
    .toBeLessThanOrEqual(1)
}

/** @param {DetailContext} context */
async function assertViewportGap({ panel, state }) {
  await expect
    .poll(() =>
      panel.evaluate((element, padding) => {
        const rect = element.getBoundingClientRect()
        return (
          rect.left >= padding &&
          rect.top >= padding &&
          rect.right <= document.documentElement.clientWidth - padding &&
          rect.bottom <= document.documentElement.clientHeight - padding
        )
      }, state.padding ?? 0)
    )
    .toBe(true)
}

/** Story-specific anatomy beyond the shared title/text/positioning checks.
 * @type {Record<string, (context: DetailContext) => Promise<void>>}
 */
const matrixDetails = {
  "molecules-dialog--alert-dialog": assertAlertDialog,
  "molecules-dialog--rich-content": assertProfileDialog,
  "molecules-dialog--minimal": assertMinimalDialog,
  "molecules-dialog--modeless": assertNonModal,
  "molecules-dialog--long-content": assertLongDialog,
  "molecules-drawer--custom-container": assertContainedDrawer,
  "molecules-drawer--non-modal": assertNonModal,
  "molecules-drawer--multiple-triggers": assertDrawerProfile,
  "molecules-popover--variants": assertPopoverArrow,
  "molecules-popover--with-form": assertPopoverForm,
  "molecules-popover--long-content": assertLongPopover,
  "molecules-popover--same-width-demo": assertSameWidth,
  "molecules-popover--overflow-padding-demo": assertViewportGap,
}

/** @param {DetailContext} context */
async function assertMatrixDetails(context) {
  const { id, panel, state } = context
  await expect(panel).toHaveAccessibleName(state.title)
  if (state.text) {
    await expect(panel.getByText(state.text, { exact: true })).toBeVisible()
  }
  if (id.startsWith("molecules-popover--")) {
    await assertPopoverPositioned(context)
  }
  await matrixDetails[id]?.(context)
}

/** @typedef {(suffix: string, beforeCapture?: () => Promise<void>) => Promise<void>} Capture */

/** @param {Page} page @param {{scope: string, indexed?: boolean}} matrix @param {PanelState} state @param {number} index */
function matrixTrigger(page, matrix, state, index) {
  const root = page.locator("#storybook-root")
  if (matrix.indexed) {
    return root
      .locator(`[data-scope="${matrix.scope}"][data-part="trigger"]`)
      .nth(index)
  }
  return root.getByRole("button", { name: state.trigger, exact: true })
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function checkMatrix(page, id, capture) {
  const matrix = panelMatrices[id]
  if (matrix.indexed) {
    await expect(
      page.locator(
        `#storybook-root [data-scope="${matrix.scope}"][data-part="trigger"]`
      )
    ).toHaveCount(matrix.states.length)
  }
  for (const [index, state] of matrix.states.entries()) {
    const trigger = matrixTrigger(page, matrix, state, index)
    await expect(trigger).toHaveCount(1)
    await expect(trigger).toHaveText(state.trigger)
    await expect(trigger).toBeEnabled()
    await trigger.click()
    const panel = page.getByRole(matrix.role ?? "dialog", {
      name: state.title,
      exact: true,
    })
    const beforeCapture = async () => {
      await assertPanelReady(panel)
      await assertMatrixDetails({ page, id, panel, trigger, state })
    }
    await beforeCapture()
    await capture(stateCheckpointSuffixes[id][index], beforeCapture)
    await dismissPanel(page, panel)
  }
}

const nestedChildren = [
  ["dialog", "Nested confirmation"],
  ["drawer", "Nested drawer"],
]

/** @param {Locator} host @param {Locator} child */
async function assertNestedChild(host, child) {
  // The host may deliberately be inert under its child modal.
  await assertPanelReady(host, false, false)
  await assertPanelReady(child)
  await expect
    .poll(() =>
      child.evaluate((element) => element.contains(document.activeElement))
    )
    .toBe(true)
  await expect(
    child.getByText("Press Escape to return to the host.", { exact: true })
  ).toBeVisible()
}

/** @param {Page} page @param {Capture} capture @param {string} hostKind @param {string[]} suffixes */
async function checkNestedHost(page, capture, hostKind, suffixes) {
  const trigger = page.getByRole("button", {
    name: `Open ${hostKind} host`,
    exact: true,
  })
  await expect(trigger).toBeEnabled()
  await trigger.click()
  const hostLabel = hostKind === "dialog" ? "Dialog" : "Drawer"
  const host = await retainedPanel(
    page.getByRole("dialog", {
      name: `${hostLabel} overlay host`,
      exact: true,
    }),
    page
  )
  for (const [index, [childKind, childName]] of nestedChildren.entries()) {
    const childTrigger = host.getByRole("button", {
      name: `Open nested ${childKind}`,
      exact: true,
    })
    await expect(childTrigger).toBeEnabled()
    await childTrigger.click()
    const child = page.getByRole("dialog", { name: childName, exact: true })
    const beforeCapture = () => assertNestedChild(host, child)
    await beforeCapture()
    await capture(suffixes[index], beforeCapture)
    await dismissPanel(page, child)
    await expect(childTrigger).toBeFocused()
    await assertPanelReady(host)
  }
  await dismissPanel(page, host)
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function checkNestedOverlays(page, id, capture) {
  const suffixes = stateCheckpointSuffixes[id]
  await checkNestedHost(page, capture, "dialog", suffixes.slice(0, 2))
  await checkNestedHost(page, capture, "drawer", suffixes.slice(2, 4))
}

/** Self-contained for browser serialization and focused hit-test regressions.
 * @param {Element} element
 */
export function isControlCenterHit(element) {
  const box = element.getBoundingClientRect()
  const hit = element.ownerDocument.elementFromPoint(
    box.left + box.width / 2,
    box.top + box.height / 2
  )
  return !!hit && (hit === element || element.contains(hit))
}

/** Prove the center is not covered by the sticky footer or another overlay.
 * Trial clicks also require Playwright's real actionability checks, without
 * changing a snap point or closing the drawer.
 * @param {Locator} target
 */
async function assertUsableControl(target) {
  await assertViewportControl(target)
  await expect(target).toBeEnabled()
  await expect.poll(() => target.evaluate(isControlCenterHit)).toBe(true)
  await target.click({ trial: true })
}

/** Align above the sticky footer, not at the scrollport's obscured center.
 * @param {Locator} target
 */
async function scrollControlIntoView(target) {
  await target.evaluate((element) =>
    element.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: "instant",
    })
  )
  await assertUsableControl(target)
}

/** The translated outer Content intentionally extends beyond the screen.
 * The inner viewport must fit, including every clipping ancestor.
 * @param {Locator} panel @param {number} height
 */
async function assertSnapDetent(panel, height) {
  await assertPanelReady(panel, false)
  await expect(
    panel.getByText(`Active height: ${height}`, { exact: true })
  ).toHaveCount(1)
  const visible = panel.locator(".drawer-visible-viewport")
  await expect(visible).toHaveCount(1)
  await assertViewportControl(visible)
  await assertViewportControl(visible.locator(".drawer-visible-footer"))
  await assertUsableControl(
    visible.getByRole("button", { name: "Close", exact: true })
  )
  return visible
}

/** @param {Locator} panel @param {number} height */
async function assertSnapTop(panel, height) {
  const title = panel.getByRole("heading", {
    name: "Product filters",
    exact: true,
  })
  const grabber = panel.locator('[data-part="grabber"]')
  await panel
    .locator(".drawer-visible-viewport")
    .evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }))
  const visible = await assertSnapDetent(panel, height)
  await assertUsableControl(grabber)
  await assertViewportControl(title)
  await expect.poll(() => title.evaluate(isControlCenterHit)).toBe(true)
  if (height !== 0.25) {
    for (const name of ["25%", "50%", "100%"]) {
      await assertUsableControl(
        visible.getByRole("button", { name, exact: true })
      )
    }
  }
}

/** A short detent cannot show its header and resize row simultaneously.
 * Scroll actual controls into view, then prove all three remain usable together.
 * @param {Locator} panel @param {number} height
 */
async function assertSnapControls(panel, height) {
  for (const name of ["25%", "50%", "100%"]) {
    const button = panel.getByRole("button", { name, exact: true })
    await scrollControlIntoView(button)
  }
  const visible = await assertSnapDetent(panel, height)
  for (const name of ["25%", "50%", "100%"]) {
    await assertUsableControl(
      visible.getByRole("button", { name, exact: true })
    )
  }
}

/** @param {Page} page @param {string} _id @param {Capture} capture */
async function checkSnapPoints(page, _id, capture) {
  await page
    .getByRole("button", { name: "Open snap drawer", exact: true })
    .click()
  const panel = page.getByRole("dialog", {
    name: "Product filters",
    exact: true,
  })
  for (const { height, suffix, controlsSuffix } of snapDetents) {
    if (height !== 0.5) {
      const resize = panel.getByRole("button", {
        name: `${height * 100}%`,
        exact: true,
      })
      await scrollControlIntoView(resize)
      await resize.click()
    }
    const beforeCapture = () => assertSnapTop(panel, height)
    await beforeCapture()
    await capture(suffix, beforeCapture)
    if (controlsSuffix) {
      const beforeControls = () => assertSnapControls(panel, height)
      await beforeControls()
      await capture(controlsSuffix, beforeControls)
      // Prove scrolling did not strand the header or grabber above the detent.
      await assertSnapTop(panel, height)
    }
  }
  await panel.getByRole("button", { name: "Close", exact: true }).click()
  await expect(panel).toBeHidden()
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function checkDrawerStack(page, id, capture) {
  await page
    .getByRole("button", { name: "Open account drawer", exact: true })
    .click()
  const account = await retainedPanel(
    page.getByRole("dialog", { name: "Account", exact: true }),
    page
  )
  await account
    .getByRole("button", { name: "Security settings", exact: true })
    .click()
  const security = page.getByRole("dialog", { name: "Security", exact: true })
  // Zag's stack indent props carry only data-active/data-inactive and style
  // (no data-scope/data-part); Drawer.Indent adds the authored class.
  const indent = page.locator(".drawer-indent[data-active]")
  const beforeCapture = async () => {
    await assertPanelReady(account, false, false)
    await assertPanelReady(security)
    await expect(
      security.getByText(
        "Passkeys and two-factor authentication are enabled.",
        { exact: true }
      )
    ).toBeVisible()
    await expect(indent).toHaveCount(1)
    await expect(indent).toBeVisible()
    await expect(indent).not.toHaveCSS("transform", "none")
  }
  await beforeCapture()
  await capture(stateCheckpointSuffixes[id][0], beforeCapture)
  await dismissPanel(page, security)
  await assertPanelReady(account)
  await dismissPanel(page, account)
  await expect(page.locator(".drawer-indent[data-inactive]")).toHaveCount(1)
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function checkNestedPopovers(page, id, capture) {
  await page.getByRole("button", { name: "Level 1", exact: true }).click()
  const first = await retainedPanel(
    page.getByRole("dialog", { name: "First Level", exact: true }),
    page
  )
  await first.getByRole("button", { name: "Open Level 2", exact: true }).click()
  const second = await retainedPanel(
    page.getByRole("dialog", { name: "Second Level", exact: true }),
    page
  )
  await second
    .getByRole("button", { name: "Open Level 3", exact: true })
    .click()
  const third = page.getByRole("dialog", { name: "Third Level", exact: true })
  const beforeCapture = async () => {
    await assertPanelReady(first, true, false)
    await assertPanelReady(second, true, false)
    await assertPanelReady(third)
    await expect(
      third.getByText("This is the deepest level!", { exact: true })
    ).toBeVisible()
  }
  await beforeCapture()
  await capture(stateCheckpointSuffixes[id][0], beforeCapture)
  for (const panel of [third, second, first]) {
    await dismissPanel(page, panel)
  }
}

/** @type {Record<string, (page: Page, id: string, capture: Capture) => Promise<void>>} */
const layeredChecks = {
  "molecules-dialog--nested-overlays": checkNestedOverlays,
  "molecules-drawer--snap-points-and-swipe": checkSnapPoints,
  "molecules-drawer--stack": checkDrawerStack,
  "molecules-popover--nested-popovers": checkNestedPopovers,
}

/** Exercise the current story only; the parent owns asset waits and screenshots.
 * @param {Page} page @param {string} id @param {Capture} capture
 * @returns {Promise<boolean>}
 */
export async function checkStateCheckpoints(page, id, capture) {
  if (!Object.hasOwn(stateCheckpointSuffixes, id)) {
    return false
  }
  if (Object.hasOwn(panelMatrices, id)) {
    await checkMatrix(page, id, capture)
  } else {
    await layeredChecks[id](page, id, capture)
  }
  return true
}
