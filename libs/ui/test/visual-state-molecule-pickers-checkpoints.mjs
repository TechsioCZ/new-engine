import { expect } from "@playwright/test"
import { assertWithinViewport } from "./visual-viewport.mjs"

/** @import { Page, Locator } from "@playwright/test" */

const sizeStates = ["sm", "md", "lg"].map((size, index) => ({
  appearance: `size-${size}`,
  index,
}))

const pickerCheckpoints = {
  "molecules-combobox--sizes": {
    scope: "combobox",
    triggerCount: 3,
    states: sizeStates,
  },
  "molecules-combobox--multiple-selection": {
    scope: "combobox",
    triggerCount: 1,
    states: [{ appearance: "selected-chips-suggestions", index: 0 }],
  },
  "molecules-datepicker--sizes": {
    scope: "date-picker",
    triggerCount: 3,
    states: sizeStates,
  },
  "molecules-datepicker--date-range-calendar": {
    scope: "date-picker",
    triggerCount: 1,
    states: [{ appearance: "range-calendars", index: 0 }],
  },
  "molecules-datepicker--localized-unavailable-range": {
    scope: "date-picker",
    triggerCount: 1,
    states: [{ appearance: "czech-unavailable-range", index: 0 }],
  },
  // These legacy IDs do not set defaultOpen. Their primary frames are closed.
  "molecules-datepicker--initially-open-timed-draft": {
    scope: "date-picker",
    triggerCount: 1,
    states: [{ appearance: "timed-draft", index: 0 }],
  },
  "molecules-datepicker--initially-open-date-time-range": {
    scope: "date-picker",
    triggerCount: 1,
    states: [{ appearance: "timed-range", index: 0 }],
  },
  "molecules-datepicker--transactional-time-granularities": {
    scope: "date-picker",
    triggerCount: 3,
    states: ["hour-12h", "minute-24h", "second-24h"].map(
      (appearance, index) => ({ appearance, index })
    ),
  },
  "molecules-datepicker--locales-and-long-labels": {
    scope: "date-picker",
    triggerCount: 2,
    states: ["czech-calendar", "english-calendar"].map((appearance, index) => ({
      appearance,
      index,
    })),
  },
  "molecules-phoneinput--sizes": {
    scope: "select",
    triggerCount: 3,
    states: sizeStates,
  },
  "molecules-phoneinput--country-display-variants": {
    scope: "select",
    triggerCount: 3,
    states: [{ appearance: "flag-free-countries", index: 1 }],
  },
  "molecules-phoneinput--limited-countries": {
    scope: "select",
    triggerCount: 1,
    states: [{ appearance: "limited-disabled-country", index: 0 }],
  },
  "molecules-phoneinput--custom-country-list": {
    scope: "select",
    triggerCount: 1,
    states: [{ appearance: "custom-country-rows", index: 0 }],
  },
}

const floatingPlacements = [
  "top-start",
  "top",
  "top-end",
  "right-start",
  "right",
  "right-end",
  "bottom-start",
  "bottom",
  "bottom-end",
  "left-start",
  "left",
  "left-end",
  "center",
]

const tourSteps = {
  "molecules-tour--playground": [
    ["welcome-dialog", "Make yourself at home", "dialog", "welcome"],
    [
      "targeted-spotlight",
      "Create something new",
      "tooltip",
      "create",
      "Create project",
    ],
    ["floating-completion", "You are ready", "floating", "done"],
  ],
  "molecules-tour--custom-controls": [
    ["custom-actions", "Edit your name", "dialog", "edit"],
  ],
  "molecules-tour--scroll-target": [
    [
      "below-fold-spotlight",
      "Further down the page",
      "tooltip",
      "below",
      "Target below the fold",
    ],
  ],
}

/** Pure capture inventory for integration checks; no browser work on import. */
export const stateCheckpointAppearances = {
  ...Object.fromEntries(
    Object.entries(pickerCheckpoints).map(([id, { states }]) => [
      id,
      states.map(({ appearance }) => appearance),
    ])
  ),
  ...Object.fromEntries(
    Object.entries(tourSteps).map(([id, steps]) => [
      id,
      steps.map(([appearance]) => appearance),
    ])
  ),
  "molecules-tour--floating-placements": floatingPlacements.map(
    (placement) => `floating-${placement}`
  ),
  "molecules-verticalnavigation--within-drawer": ["catalog-navigation"],
  "molecules-overlay-regressions--modal-popover-commands": [
    "modal-popover-commands",
  ],
  "molecules-overlay-regressions--detent-notifications": [
    "notification-half",
    "notification-quarter",
    "notification-full",
  ],
}

export const stateCheckpointStories = Object.keys(stateCheckpointAppearances)

/** @param {Page} page @param {string} scope */
function surface(page, scope) {
  return page
    .locator(`[data-scope="${scope}"][data-part="content"]`)
    .filter({ visible: true })
}

/** @param {Locator} locator */
async function assertAccessible(locator) {
  await expect
    .poll(() =>
      locator.evaluate(
        (element) => !!element.closest('[inert], [aria-hidden="true"]')
      )
    )
    .toBe(false)
}

/** Active surfaces must be accessible; nested modal hosts may deliberately be inert.
 * @param {Locator} content @param {boolean} inViewport
 */
async function assertOpen(content, inViewport = true) {
  await expect(content).toHaveCount(1)
  await expect(content).toBeVisible()
  await expect(content).toHaveAttribute("data-state", "open")
  await expect(content).toHaveCSS("opacity", "1")
  await assertAccessible(content)
  if (inViewport) {
    await expect(content).toBeInViewport({ ratio: 1 })
  }
}

/** Wait for actual positioning/scrolling, including Tour's below-fold target.
 * @param {Page} page @param {Locator[]} locators
 */
async function assertStableGeometry(page, locators) {
  await expect
    .poll(
      async () => {
        const before = await Promise.all(
          locators.map((item) => item.boundingBox())
        )
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve))
            )
        )
        const after = await Promise.all(
          locators.map((item) => item.boundingBox())
        )
        return (
          before.every(Boolean) &&
          JSON.stringify(before) === JSON.stringify(after)
        )
      },
      { message: "Checkpoint surfaces and anchors must finish positioning" }
    )
    .toBe(true)
}

/** @param {Page} page @param {Locator} content */
async function dismiss(page, content) {
  await page.keyboard.press("Escape")
  await expect(content).toHaveCount(0)
}

/** @param {Locator} content */
function selectedCalendarDay(content) {
  return content
    .getByRole("grid")
    .first()
    .locator('[data-part="table-cell-trigger"][data-selected]')
    .first()
}

/** @param {Locator} content @param {string} id @param {string} appearance */
async function assertCalendar(content, id, appearance) {
  const range =
    id.endsWith("--date-range-calendar") ||
    id.endsWith("--localized-unavailable-range") ||
    id.endsWith("--initially-open-date-time-range")
  const grids = content.getByRole("grid")
  await expect(grids).toHaveCount(range ? 2 : 1)
  for (const grid of await grids.all()) {
    await expect(grid).toBeVisible()
  }
  // Range calendars intentionally scroll on narrow viewports. Check their real
  // scrollport and a selected date, not that every offscreen day is intersecting.
  const calendar = content.locator('[data-part="calendar"]')
  await expect(calendar).toBeInViewport({ ratio: 1 })
  const selected = selectedCalendarDay(content)
  await expect(selected).toBeVisible()
  await assertWithinViewport(selected)
  if (range) {
    await expect(
      grids
        .first()
        .locator('[data-part="table-cell-trigger"][data-range-start]')
    ).toHaveCount(1)
    await expect(
      grids.first().locator('[data-part="table-cell-trigger"][data-range-end]')
    ).toHaveCount(1)
  }
  const czech =
    appearance === "czech-calendar" || appearance === "czech-unavailable-range"
  const localized = czech || appearance === "english-calendar"
  if (localized) {
    const month =
      appearance === "czech-unavailable-range" ? "září 2026" : "srpen 2026"
    await expect(grids.first()).toHaveAccessibleName(
      czech ? month : "August 2026"
    )
    await expect(
      grids.first().getByRole("columnheader").first()
    ).toHaveAccessibleName(czech ? "pondělí" : "Sunday")
  }
  if (appearance === "czech-unavailable-range") {
    const unavailable = grids
      .first()
      .locator(
        '[data-part="table-cell-trigger"][data-unavailable][data-value="2026-09-14"]'
      )
    await expect(unavailable).toHaveCount(1)
    await expect(unavailable).toBeInViewport({ ratio: 1 })
    await expect(unavailable).toHaveAttribute("aria-disabled", "true")
  }
  const timed =
    appearance === "timed-draft" ||
    appearance === "timed-range" ||
    id.endsWith("--transactional-time-granularities")
  if (!timed) {
    return
  }
  await assertTimeControls(content, appearance, range)
}

/** @param {Locator} content @param {string} appearance @param {boolean} range */
async function assertTimeControls(content, appearance, range) {
  const granularity = appearance.split("-")[0]
  const timeParts = { hour: 1, minute: 2, second: 3 }
  const precision = Object.hasOwn(timeParts, granularity)
    ? granularity
    : "minute"
  const time = content.locator('[data-part="time-control"]')
  await expect(time).toHaveAttribute("data-granularity", precision)
  await expect(time).toHaveAttribute(
    "data-hour-cycle",
    appearance === "hour-12h" ? "12" : "24"
  )
  await expect(time).toBeInViewport({ ratio: 1 })
  const inputs = time.getByRole("spinbutton")
  await expect(inputs).toHaveCount(timeParts[precision] * (range ? 2 : 1))
  for (const input of await inputs.all()) {
    await expect(input).toBeEnabled()
    await expect(input).toBeInViewport({ ratio: 1 })
  }
  if (range) {
    await expect(
      time.getByRole("group", { name: "Start time", exact: true })
    ).toBeVisible()
    await expect(
      time.getByRole("group", { name: "End time", exact: true })
    ).toBeVisible()
  }
  if (appearance === "hour-12h") {
    await expect(
      time.getByRole("combobox", { name: "Day period" })
    ).toHaveValue("12")
  } else {
    await expect(time.getByRole("combobox")).toHaveCount(0)
  }
  for (const part of ["cancel-trigger", "confirm-trigger"]) {
    const action = content.locator(`[data-part="${part}"]`)
    await expect(action).toBeVisible()
    await assertWithinViewport(action)
  }
}

/** @param {Page} page @param {Locator} content @param {string} id */
async function assertCountryList(page, content, id) {
  const limited = id.endsWith("--limited-countries")
  await expect(content.getByRole("option")).toHaveCount(limited ? 3 : 7)
  await expect(content.getByRole("option").first()).toBeInViewport({ ratio: 1 })
  if (limited) {
    const disabled = content.locator('[role="option"][data-value="PL"]')
    await expect(disabled).toHaveAttribute("aria-disabled", "true")
    await expect(disabled).toBeInViewport({ ratio: 1 })
    await expect(
      content.locator('[role="option"][data-value="SK"]')
    ).not.toHaveAttribute("aria-disabled", "true")
  }
  if (id.endsWith("--country-display-variants")) {
    // The custom flag slots render Icon spans. The flag-free list omits them.
    await expect(
      content.locator('[class*="icon-[twemoji--flag-"]')
    ).toHaveCount(0)
    await expect(
      content.locator('[role="option"][data-value="CZ"]')
    ).toContainText("+420")
    await expect(
      page.getByRole("textbox", { name: "Calling code only", exact: true })
    ).toBeVisible()
  }
  if (id.endsWith("--custom-country-list")) {
    const czech = content.locator('[role="option"][data-value="CZ"]')
    await expect(czech.getByText("CZ", { exact: true })).toBeVisible()
    await expect(czech).toContainText("Czechia")
    await expect(czech).toContainText("+420")
  }
}

/** @param {Page} page @param {string} id @param {import("@playwright/test").Locator} content */
async function assertSuggestions(page, id, content) {
  await expect(content.getByRole("option")).toHaveCount(10)
  await expect(
    content.getByRole("option", { name: "Czech Republic", exact: true })
  ).toBeInViewport({ ratio: 1 })
  if (id.endsWith("--multiple-selection")) {
    await expect(
      page.getByRole("list", { name: "Selected values" })
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Remove Czech Republic", exact: true })
    ).toBeInViewport({ ratio: 1 })
    await expect(
      content.getByRole("option", { name: "Czech Republic", exact: true })
    ).toHaveAttribute("aria-selected", "true")
  }
}

/** @param {Page} page @param {string} id @param {(suffix: string, beforeCapture?: () => Promise<void>, appearance?: {prepare: () => Promise<void>}) => Promise<void>} capture */
async function checkPickers(page, id, capture) {
  const { scope, triggerCount, states } = pickerCheckpoints[id]
  const triggers = page.locator(
    `#storybook-root [data-scope="${scope}"][data-part="trigger"]`
  )
  await expect(triggers).toHaveCount(triggerCount)
  for (const { appearance, index } of states) {
    const trigger = triggers.nth(index)
    await expect(trigger).toBeEnabled()
    await expect(trigger).not.toHaveAttribute("aria-disabled", "true")
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await trigger.click()
    const content = surface(page, scope)
    let prepare
    if (scope === "date-picker") {
      prepare = async () => {
        await assertOpen(content)
        await assertStableGeometry(page, [
          content,
          content.locator('[data-part="calendar"]'),
        ])
        // Theme/asset setup can perturb the calendar scrollport after opening.
        // Navigate at explicit preparation boundaries, never inside readiness.
        await selectedCalendarDay(content).scrollIntoViewIfNeeded()
      }
      await prepare()
    }
    if (id === "molecules-combobox--multiple-selection") {
      await content
        .getByRole("option", { name: "Czech Republic", exact: true })
        .click()
    }
    const ready = async () => {
      await assertOpen(content)
      await expect(trigger).toHaveAttribute("aria-expanded", "true")
      if (scope === "date-picker") {
        await assertCalendar(content, id, appearance)
      } else if (scope === "combobox") {
        await assertSuggestions(page, id, content)
      } else {
        await assertCountryList(page, content, id)
      }
      await assertStableGeometry(page, [content])
    }
    await page.mouse.move(0, 0)
    await ready()
    await capture(
      `--state-${appearance}-open`,
      ready,
      prepare ? { prepare } : undefined
    )
    await dismiss(page, content)
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    if (id === "molecules-combobox--multiple-selection") {
      await page
        .getByRole("button", { name: "Remove Czech Republic", exact: true })
        .click()
      await expect(
        page.getByRole("list", { name: "Selected values" })
      ).toHaveCount(0)
    }
  }
}

/** @param {Page} page @param {string} title @param {string} type @param {string} step @param {string | undefined} targetName */
function tourReadiness(page, title, type, step, targetName) {
  const content = surface(page, "tour")
  return async () => {
    await assertOpen(content)
    await expect(content).toHaveAccessibleName(title)
    await expect(content).toHaveAttribute("data-type", type)
    await expect(content).toHaveAttribute("data-step", step)
    const geometry = [content]
    if (targetName) {
      const target = page.getByRole("button", { name: targetName, exact: true })
      const spotlight = page.locator(
        '[data-scope="tour"][data-part="spotlight"]'
      )
      // Zag scrolls the target with block "nearest"; its fractional layout top
      // leaves a subpixel overhang after the whole-pixel scroll.
      await expect(target).toBeVisible()
      await assertWithinViewport(target)
      await expect(spotlight).toBeVisible()
      await assertWithinViewport(spotlight)
      geometry.push(target, spotlight)
    }
    await assertStableGeometry(page, geometry)
  }
}

/** @param {Page} page @param {string} id @param {(suffix: string, beforeCapture?: () => Promise<void>, appearance?: {prepare: () => Promise<void>}) => Promise<void>} capture */
async function checkTour(page, id, capture) {
  const content = surface(page, "tour")
  if (id === "molecules-tour--floating-placements") {
    const triggers = page.locator("#storybook-root").getByRole("button")
    await expect(triggers).toHaveCount(floatingPlacements.length)
    for (const placement of floatingPlacements) {
      await triggers.filter({ hasText: new RegExp(`^${placement}$`) }).click()
      const ready = async () => {
        await tourReadiness(page, placement, "floating", placement)()
        await expect(content).toHaveAttribute("data-placement", placement)
      }
      await ready()
      await capture(`--state-floating-${placement}-open`, ready)
      await dismiss(page, content)
    }
    return
  }
  const start = page.getByRole("button", { name: "Start tour", exact: true })
  await expect(start).toBeEnabled()
  await start.click()
  const steps = tourSteps[id]
  for (const [
    index,
    [appearance, title, type, step, target],
  ] of steps.entries()) {
    if (index > 0) {
      await content.getByRole("button", { name: "Next", exact: true }).click()
    }
    const ready = async () => {
      await tourReadiness(page, title, type, step, target)()
      if (appearance === "custom-actions") {
        await expect(
          content.getByRole("textbox", { name: "Your name" })
        ).toHaveValue("Ada")
        await expect(
          content.getByRole("button", { name: "Disabled next", exact: true })
        ).toBeDisabled()
        await expect(
          content.getByRole("button", { name: "Cancelled next", exact: true })
        ).toBeEnabled()
        await expect(
          content.getByRole("button", { name: "Replace steps", exact: true })
        ).toBeDisabled()
        for (const control of await content.getByRole("button").all()) {
          await expect(control).toBeInViewport({ ratio: 1 })
        }
      }
    }
    await ready()
    await capture(`--state-${appearance}-open`, ready)
  }
  await dismiss(page, content)
  await expect(start).toBeEnabled()
}

/** Handle only source-confirmed missing appearances; the caller owns asset waits,
 * full-page framing and comparison. Every callback revalidates the live state.
 * @param {Page} page @param {string} id @param {(suffix: string, beforeCapture?: () => Promise<void>, appearance?: {prepare: () => Promise<void>}) => Promise<void>} capture
 * @returns {Promise<boolean>}
 */
export async function checkStateCheckpoints(page, id, capture) {
  if (!stateCheckpointStories.includes(id)) {
    return false
  }
  if (Object.hasOwn(pickerCheckpoints, id)) {
    await checkPickers(page, id, capture)
  } else if (id.startsWith("molecules-tour--")) {
    await checkTour(page, id, capture)
  } else if (id === "molecules-verticalnavigation--within-drawer") {
    await page
      .getByRole("button", { name: "Browse categories", exact: true })
      .click()
    const content = surface(page, "drawer")
    const ready = async () => {
      await assertOpen(content)
      await expect(content).toHaveAccessibleName("Product catalog")
      const navigation = content.getByRole("navigation", {
        name: "Product categories",
      })
      await expect(navigation).toBeInViewport({ ratio: 1 })
      await expect(
        navigation.getByRole("link", { name: "Bolts", exact: true })
      ).toHaveAttribute("aria-current", "page")
      await expect(
        navigation.getByRole("button", { name: "Toggle Fasteners" })
      ).toHaveAttribute("aria-expanded", "true")
      await assertStableGeometry(page, [content, navigation])
    }
    await ready()
    await capture("--state-catalog-navigation-open", ready)
    await content
      .getByRole("button", { name: "Close catalog", exact: true })
      .click()
    await expect(content).toHaveCount(0)
  } else if (id === "molecules-overlay-regressions--modal-popover-commands") {
    // Story play intentionally leaves only the outer host open.
    const outer = surface(page, "dialog")
    await expect(outer).toHaveAccessibleName("Outer catalog task")
    await outer
      .getByRole("button", { name: "Open delivery options", exact: true })
      .click()
    const popover = surface(page, "popover")
    await popover
      .getByRole("button", { name: "Delivery commands", exact: true })
      .click()
    const menu = surface(page, "menu")
    const ready = async () => {
      for (const host of [outer, popover]) {
        await expect(host).toBeVisible()
        await expect(host).toHaveAttribute("data-state", "open")
        await expect(host).toBeInViewport({ ratio: 1 })
      }
      await assertOpen(menu)
      const command = menu.getByRole("menuitem", {
        name: "Use express delivery",
        exact: true,
      })
      await expect(command).toBeInViewport({ ratio: 1 })
      await assertAccessible(command)
      await expect(
        popover.locator('[data-scope="menu"][data-part="content"]')
      ).toHaveCount(1)
      await assertStableGeometry(page, [outer, popover, menu])
    }
    await ready()
    await capture("--state-modal-popover-commands-open", ready)
    await dismiss(page, menu)
    await dismiss(page, popover)
    await dismiss(page, outer)
  } else {
    await page
      .getByRole("button", { name: "Open notification drawer", exact: true })
      .click()
    const content = surface(page, "drawer")
    await content.getByRole("button", { name: "Notify", exact: true }).click()
    const undo = content.getByRole("button", { name: "Undo", exact: true })
    const detents = [
      ["half", "50%", 0.5],
      ["quarter", "25%", 0.25],
      ["full", "100%", 1],
    ]
    for (const [index, [appearance, label, fraction]] of detents.entries()) {
      if (index > 0) {
        await content
          .getByRole("button", { name: label, exact: true })
          .click({ timeout: 5000 })
      }
      const ready = async () => {
        // Zag measures the full translated panel; its inner viewport is the
        // detent. Offscreen outer-panel bounds are intentional, not clipping.
        await assertOpen(content, false)
        await expect(content).toHaveAccessibleName("Catalog updates")
        await expect(undo).toBeInViewport({ ratio: 1 })
        await assertAccessible(undo)
        await expect(
          content.getByText("Catalog updated", { exact: true })
        ).toBeVisible()
        await expect(
          content.getByRole("button", { name: label, exact: true })
        ).toBeInViewport({ ratio: 1 })
        await expect
          .poll(() =>
            content.evaluate((element, point) => {
              const box = element.getBoundingClientRect()
              return Math.abs(
                box.top - (window.innerHeight - box.height * point)
              )
            }, fraction)
          )
          .toBeLessThanOrEqual(1)
        await assertStableGeometry(page, [content, undo])
      }
      await ready()
      await capture(`--state-notification-${appearance}-open`, ready)
    }
    await content
      .getByRole("button", { name: "Close notification", exact: true })
      .click()
    await expect(undo).toHaveCount(0)
    await content
      .getByRole("button", { name: "Close drawer", exact: true })
      .click()
    await expect(content).toHaveCount(0)
  }
  return true
}
