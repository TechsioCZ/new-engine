import { expect } from "@playwright/test"
import { assertWithinViewport } from "./visual-viewport.mjs"

/** @import { Locator, Page } from "@playwright/test" */
/** @typedef {(suffix: string, beforeCapture?: () => Promise<void>) => Promise<void>} Capture */

// Only source-confirmed missing appearances belong here. Existing Playground,
// initially-open hierarchy/machine-option and hotkey-palette captures stay owned
// by their existing lanes. LongLabels has a narrow exception to reproduce only
// its authored 200% root text stress input, restoring inline value and priority.
export const stateCheckpointAppearances = {
  "molecules-menu--sizes": ["sm", "md", "lg"],
  "molecules-menu--with-options-menu": ["checked-options"],
  "molecules-menu--context-menu": ["keyboard-context"],
  "molecules-menu--rtl-support": ["rtl-submenu"],
  "molecules-menu--tall-scrollable-submenus": [
    "ltr-short-child",
    "ltr-scrolling-child-end",
    "rtl-short-child",
    "rtl-scrolling-child-end",
  ],
  "molecules-menu--long-labels": [
    "long-labels",
    "long-labels-bottom",
    "long-labels-200-percent",
    "long-labels-200-percent-bottom",
  ],
  "molecules-select--sizes": ["sm", "md", "lg"],
  "molecules-select--with-item-groups": ["grouped-options"],
  "molecules-select--multiple": ["multiple-selection"],
  "molecules-cascadeselect--sizes": ["sm", "md", "lg"],
  // Only one selected branch can be expanded at a time. Both documented paths
  // need evidence; opening alone only reveals the most recent (Home) selection.
  "molecules-cascadeselect--multiple-selection": [
    "multiple-home",
    "multiple-electronics",
  ],
  "molecules-command--in-dialog": ["command-dialog"],
}

export const stateCheckpointStories = Object.keys(stateCheckpointAppearances)

/** @param {Page} page @param {string} scope */
function panels(page, scope) {
  return page
    .locator(`[data-scope="${scope}"][data-part="content"]`)
    .filter({ visible: true })
}

/** @param {Page} page @param {string} scope */
function triggers(page, scope) {
  return page.locator(
    `#storybook-root [data-scope="${scope}"][data-part="trigger"]`
  )
}

/** Check accessibility only for the active surface, not a retained parent layer.
 * @param {Locator} panel @param {boolean} [active]
 */
async function assertPanel(panel, active = true) {
  await expect(panel).toBeVisible()
  await expect(panel).toHaveAttribute("data-state", "open")
  await expect(panel).toHaveCSS("opacity", "1")
  await expect(panel).toBeInViewport({ ratio: 1 })
  await expect(
    panel.locator('xpath=ancestor::*[@data-part="positioner"][1]')
  ).toBeVisible()
  if (active) {
    await expect
      .poll(() =>
        panel.evaluate(
          (element) => !!element.closest('[inert], [aria-hidden="true"]')
        )
      )
      .toBe(false)
  }
}

/** @param {Locator} panel @param {"menuitem" | "option" | "treeitem"} role @param {string[]} names */
async function assertRows(panel, role, names) {
  await expect(panel.getByRole(role)).toHaveCount(names.length)
  for (const name of names) {
    const row = panel.getByRole(role, { name, exact: true })
    await expect(row).toBeVisible()
    await expect(row).toBeInViewport({ ratio: 1 })
  }
}

/** @param {Locator} trigger */
async function assertEnabled(trigger) {
  await expect(trigger).toBeEnabled()
  await expect(trigger).not.toHaveAttribute("aria-disabled", "true")
  await expect(trigger).not.toHaveAttribute("aria-readonly", "true")
  await expect(trigger).not.toHaveAttribute("data-disabled", "")
}

/** The caller invokes readiness around its own asset waits and screenshots.
 * @param {Page} page @param {Capture} capture @param {string} appearance
 * @param {() => Promise<void>} ready @param {() => Promise<void>} dismiss
 */
async function captureState(page, capture, appearance, ready, dismiss) {
  try {
    // Park before asserting: a pointer-opened submenu must not silently close
    // while the parent waits for fonts and images.
    await page.mouse.move(0, 0)
    await ready()
    await capture(`--state-${appearance}-open`, ready)
  } finally {
    await dismiss()
  }
}

/** @param {Page} page @param {Locator} trigger @param {string} scope */
async function dismissPopup(page, trigger, scope) {
  await page.keyboard.press("Escape")
  // Escape closes the active submenu first; retain the root until that happens.
  if ((await trigger.getAttribute("aria-expanded")) === "true") {
    await page.keyboard.press("Escape")
  }
  await expect(trigger).toHaveAttribute("aria-expanded", "false")
  await expect(panels(page, scope)).toHaveCount(0)
}

const projectCommands = [
  "Edit project",
  "Copy link",
  "Share project",
  "Archived projects",
]
const countries = [
  "United States",
  "Canada",
  "Czech Republic",
  "Germany",
  "France",
  "United Kingdom",
  "Spain (not available)",
]

/** @param {Locator} panel */
async function assertProjectMenu(panel) {
  await expect(panel).toHaveAttribute("role", "menu")
  await assertRows(panel, "menuitem", projectCommands)
  await expect(
    panel.getByRole("menuitem", { name: "Archived projects", exact: true })
  ).toHaveAttribute("aria-disabled", "true")
}

/** @param {Page} page @param {Locator} trigger @param {Locator} panel @param {string} scope */
async function assertPopup(page, trigger, panel, scope) {
  await expect(panels(page, scope)).toHaveCount(1)
  await expect(trigger).toHaveAttribute("aria-expanded", "true")
  await assertPanel(panel)
  // Context triggers do not expose aria-controls; all regular controls do.
  if (scope !== "menu") {
    await expect(trigger).toHaveAttribute(
      "aria-controls",
      await panel.getAttribute("id")
    )
  }
}

/** @param {Locator} panel @param {string} branch @param {string} selectedName */
async function assertHierarchy(panel, branch, selectedName) {
  await expect(panel).toHaveAttribute("role", "tree")
  const home = branch === "home"
  const branchName = home ? "Home & garden" : "Electronics"
  await expect(
    panel.getByRole("treeitem", { name: branchName, exact: true })
  ).toHaveAttribute("aria-expanded", "true")
  await expect(panel.locator('[data-part="column"]')).toHaveCount(2)
  await expect(panel.locator('[data-part="column-header"]')).toContainText([
    "Categories",
    branchName,
  ])
  await assertRows(panel, "treeitem", [
    "Electronics",
    "Home & garden",
    "Fashion",
    ...(home
      ? ["Furniture", "Lighting", "Garden"]
      : ["Computers", "Phones", "Cameras"]),
  ])
  const selected = panel.getByRole("treeitem", {
    name: selectedName,
    exact: true,
  })
  await expect(selected).toHaveAttribute("aria-selected", "true")
  await expect(selected.locator('[data-part="item-indicator"]')).toBeVisible()
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function checkSizes(page, id, capture) {
  let scope = "menu"
  if (id.startsWith("molecules-cascadeselect--")) {
    scope = "cascade-select"
  } else if (id.startsWith("molecules-select--")) {
    scope = "select"
  }
  const controls = triggers(page, scope)
  await expect(controls).toHaveCount(3)
  for (const [index, size] of ["sm", "md", "lg"].entries()) {
    const trigger = controls.nth(index)
    await assertEnabled(trigger)
    await trigger.click()
    const panel = panels(page, scope)
    const ready = async () => {
      await assertPopup(page, trigger, panel, scope)
      if (scope === "menu") {
        await assertProjectMenu(panel)
      } else if (scope === "select") {
        await expect(panel).toHaveAttribute("role", "listbox")
        await assertRows(panel, "option", countries)
        await expect(
          panel.getByRole("option", { name: "Germany", exact: true })
        ).toHaveAttribute("aria-selected", "true")
      } else {
        await expect(trigger).toContainText("Home & garden / Furniture")
        await assertHierarchy(panel, "home", "Furniture")
      }
    }
    await captureState(page, capture, size, ready, () =>
      dismissPopup(page, trigger, scope)
    )
  }
}

/** @type {Array<["menuitemcheckbox" | "menuitemradio", string, "true" | "false"]>} */
const checkedOptions = [
  ["menuitemcheckbox", "Show sidebar", "true"],
  ["menuitemcheckbox", "Show activity", "false"],
  ["menuitemradio", "List view", "false"],
  ["menuitemradio", "Grid view", "true"],
]

/** @param {Locator} root */
async function assertCheckedOptions(root) {
  await expect(root.getByRole("menuitemcheckbox")).toHaveCount(2)
  await expect(root.getByRole("menuitemradio")).toHaveCount(2)
  for (const [role, name, checked] of checkedOptions) {
    const row = root.getByRole(role, { name, exact: true })
    await expect(row).toHaveAttribute("aria-checked", checked)
    await expect(row).toBeInViewport({ ratio: 1 })
    // Menu's empty indicator slot stays mounted; only its decorative check
    // icon is conditional. There is no Zag item-indicator part on this Menu.
    const indicator = row.locator('[aria-hidden="true"]')
    await expect(indicator).toHaveCount(checked === "true" ? 1 : 0)
    if (checked === "true") {
      await expect(indicator).toBeVisible()
    }
  }
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function checkMenu(page, id, capture) {
  const options = id.endsWith("--with-options-menu")
  const context = id.endsWith("--context-menu")
  let triggerName = "Project actions"
  if (options) {
    triggerName = "View options"
  } else if (context) {
    triggerName = "Right-click project actions"
  }
  const trigger = page.getByRole("button", { name: triggerName, exact: true })
  await expect(trigger).toHaveCount(1)
  await assertEnabled(trigger)
  if (context) {
    await page.keyboard.press("Tab")
    await trigger.focus()
    await expect(trigger).toBeFocused()
    await page.keyboard.press("Shift+F10")
  } else {
    await trigger.click()
  }
  const root = panels(page, "menu").filter({
    hasText: options ? "Show sidebar" : "Edit project",
  })
  await expect(root).toHaveCount(1)
  await expect(root).toBeFocused()
  if (options) {
    // The story play toggles the sidebar off. Restore one checked checkbox so
    // the checkpoint actually contains checked and unchecked examples of both
    // checkbox and radio rows instead of capturing two unchecked checkboxes.
    for (const [role, name, checked] of checkedOptions) {
      const row = root.getByRole(role, { name, exact: true })
      if ((await row.getAttribute("aria-checked")) !== checked) {
        await row.click()
      }
    }
  } else if (!context) {
    await page.mouse.move(0, 0)
    await root.press("End")
    const share = root.getByRole("menuitem", {
      name: "Share project",
      exact: true,
    })
    await expect(share).toHaveAttribute("data-highlighted", "")
    await page.keyboard.press("ArrowLeft")
  }
  const ready = async () => {
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(panels(page, "menu")).toHaveCount(options || context ? 1 : 2)
    await assertPanel(root, options || context)
    if (options) {
      await assertCheckedOptions(root)
    } else {
      await assertProjectMenu(root)
      if (!context) {
        const submenu = panels(page, "menu").filter({
          hasText: "Send by email",
        })
        await expect(submenu).toHaveCount(1)
        await assertPanel(submenu)
        await expect(root).toHaveAttribute("dir", "rtl")
        await expect(submenu).toHaveAttribute("dir", "rtl")
        await expect(
          root.getByRole("menuitem", { name: "Share project", exact: true })
        ).toHaveAttribute("aria-expanded", "true")
        await assertRows(submenu, "menuitem", [
          "Send by email",
          "Invite teammate",
        ])
      }
    }
  }
  await captureState(
    page,
    capture,
    stateCheckpointAppearances[id][0],
    ready,
    () => dismissPopup(page, trigger, "menu")
  )
}

const scrollableOverflowPattern = /^(auto|scroll)$/
const longCommands = [
  "Download the complete catalog including archived products and regional delivery exceptions",
  `AKROS-2026-${"AB1234567890".repeat(8)}`,
]

/** Mirrors LongLabels.play: the root inline font-size is its only stress input.
 * @param {Page} page @param {string} value
 * @returns {Promise<{ value: string, priority: string }>}
 */
function setRootFontSize(page, value) {
  return page.evaluate((next) => {
    const { style } = document.documentElement
    const previous = {
      value: style.getPropertyValue("font-size"),
      priority: style.getPropertyPriority("font-size"),
    }
    style.fontSize = next
    return previous
  }, value)
}

/** @param {Page} page @param {{ value: string, priority: string }} previous */
async function restoreRootFontSize(page, previous) {
  await page.evaluate(({ value, priority }) => {
    const { style } = document.documentElement
    if (value) {
      style.setProperty("font-size", value, priority)
    } else {
      style.removeProperty("font-size")
    }
  }, previous)
}

/** @param {Page} page @param {Locator} trigger @param {string} fontSize @param {number} index */
async function assertLongLabelsMenu(page, trigger, fontSize, index) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.fontSize))
    .toBe(fontSize)
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth
      )
    )
    .toBe(true)
  await expect(trigger).toBeInViewport({ ratio: 1 })
  const root = panels(page, "menu")
  await expect(root).toHaveCount(1)
  await expect(trigger).toHaveAttribute("aria-expanded", "true")
  await assertPanel(root)
  await expect(root).toBeFocused()
  await expect(root).toHaveAttribute("role", "menu")
  await expect(root.getByRole("menuitem")).toHaveCount(longCommands.length)
  for (const name of longCommands) {
    await expect(
      root.getByRole("menuitem", { name, exact: true })
    ).toBeVisible()
  }
  // Each entire label must wrap without its own clipping/truncation. The panel
  // may scroll vertically, but neither the panel nor a label may scroll sideways.
  await expect(root.locator('[role="menuitem"] span')).toHaveCount(2)
  await expect
    .poll(() =>
      root.evaluate((element) => {
        if (element.scrollWidth > element.clientWidth) {
          return false
        }
        return [...element.querySelectorAll('[role="menuitem"] span')].every(
          (label) => {
            const style = getComputedStyle(label)
            return (
              label.scrollWidth <= label.clientWidth &&
              label.scrollHeight <= label.clientHeight &&
              style.whiteSpace === "normal" &&
              style.overflowWrap === "anywhere" &&
              style.textOverflow !== "ellipsis" &&
              style.webkitLineClamp === "none"
            )
          }
        )
      })
    )
    .toBe(true)
  const row = root.getByRole("menuitem", {
    name: longCommands[index],
    exact: true,
  })
  await expect(row).toHaveAttribute("data-highlighted", "")
  await expect(row).toBeInViewport({ ratio: 1 })
  const overflowing = await root.evaluate(
    (element) => element.scrollHeight > element.clientHeight
  )
  if (overflowing) {
    await expect(root).toHaveCSS("overflow-y", scrollableOverflowPattern)
    if (index === 0) {
      // Home may align the first row to the scrollport's edge, consuming the
      // panel's own top padding rather than returning scrollTop to exactly 0.
      await expect
        .poll(() =>
          root.evaluate(
            (element) =>
              element.scrollTop <=
              Number.parseFloat(getComputedStyle(element).paddingTop)
          )
        )
        .toBe(true)
    } else {
      await expect
        .poll(() => root.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0)
    }
  } else {
    // Keep the stronger all-rows assertion wherever both rows fit together.
    await assertRows(root, "menuitem", longCommands)
  }
}

/** @param {Page} page @param {Capture} capture @param {string} appearance @param {string} fontSize */
async function captureLongLabels(page, capture, appearance, fontSize) {
  const trigger = page.getByRole("button", {
    name: "File commands",
    exact: true,
  })
  await expect(trigger).toHaveCount(1)
  await assertEnabled(trigger)
  // Both rows fit at normal size; at phone 200% each fits individually, not
  // together. Keyboard navigation must expose each full row through real inner
  // scrolling. Stable suffixes retain the original top views and add the bottom.
  for (const [index, key] of ["Home", "End"].entries()) {
    await trigger.focus()
    await expect(trigger).toBeFocused()
    await page.keyboard.press("ArrowDown")
    await expect(panels(page, "menu")).toBeFocused()
    await page.mouse.move(0, 0)
    await page.keyboard.press(key)
    await captureState(
      page,
      capture,
      index === 0 ? appearance : `${appearance}-bottom`,
      () => assertLongLabelsMenu(page, trigger, fontSize, index),
      () => dismissPopup(page, trigger, "menu")
    )
  }
}

/** @param {Page} page @param {Capture} capture */
async function checkLongLabels(page, capture) {
  // The story play restores its inline value; capture that authored baseline.
  const baseline = await page.evaluate(
    () => document.documentElement.style.fontSize
  )
  await captureLongLabels(page, capture, "long-labels", baseline)
  const previous = await setRootFontSize(page, "200%")
  try {
    await captureLongLabels(page, capture, "long-labels-200-percent", "200%")
  } finally {
    await restoreRootFontSize(page, previous)
  }
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function checkSelect(page, id, capture) {
  const controls = triggers(page, "select")
  await expect(controls).toHaveCount(1)
  await assertEnabled(controls)
  await controls.click()
  const panel = panels(page, "select")
  const grouped = id.endsWith("--with-item-groups")
  const ready = async () => {
    await assertPopup(page, controls, panel, "select")
    await expect(panel).toHaveAttribute("role", "listbox")
    await assertRows(
      panel,
      "option",
      grouped ? countries.slice(0, 6) : countries
    )
    if (grouped) {
      const labels = panel.locator('[data-part="item-group-label"]')
      await expect(labels).toHaveText(["Europe", "North America"])
      for (const label of await labels.all()) {
        await expect(label).toBeInViewport({ ratio: 1 })
      }
      await expect(
        panel.getByRole("group", { name: "Europe", exact: true })
      ).toBeVisible()
      await expect(
        panel.getByRole("group", { name: "North America", exact: true })
      ).toBeVisible()
    } else {
      await expect(panel).toHaveAttribute("aria-multiselectable", "true")
      await expect(panel.getByRole("option", { selected: true })).toHaveCount(3)
      for (const name of ["Czech Republic", "Germany", "France"]) {
        const option = panel.getByRole("option", { name, exact: true })
        await expect(option).toHaveAttribute("aria-selected", "true")
        await expect(
          option.locator('[data-part="item-indicator"]')
        ).toBeVisible()
      }
    }
  }
  await captureState(
    page,
    capture,
    stateCheckpointAppearances[id][0],
    ready,
    () => dismissPopup(page, controls, "select")
  )
}

/** @param {Page} page @param {Capture} capture */
async function checkMultipleHierarchy(page, capture) {
  const trigger = triggers(page, "cascade-select")
  await expect(trigger).toHaveCount(1)
  await assertEnabled(trigger)
  for (const branch of ["home", "electronics"]) {
    await trigger.click()
    const panel = panels(page, "cascade-select")
    await expect(panel).toBeVisible()
    const branchName = branch === "home" ? "Home & garden" : "Electronics"
    const row = panel.getByRole("treeitem", { name: branchName, exact: true })
    if ((await row.getAttribute("aria-expanded")) !== "true") {
      await row.click()
    }
    const ready = async () => {
      await assertPopup(page, trigger, panel, "cascade-select")
      await expect(panel).toHaveAttribute("aria-multiselectable", "true")
      await expect(trigger).toHaveText("Computers, Lighting")
      await assertHierarchy(
        panel,
        branch,
        branch === "home" ? "Lighting" : "Computers"
      )
    }
    await captureState(page, capture, `multiple-${branch}`, ready, () =>
      dismissPopup(page, trigger, "cascade-select")
    )
  }
}

/** @param {Page} page @param {Capture} capture */
async function checkCommandDialog(page, capture) {
  const trigger = page.getByRole("button", {
    name: "Open command palette",
    exact: true,
  })
  await assertEnabled(trigger)
  await trigger.click()
  const dialog = page.getByRole("dialog", {
    name: "Command palette",
    exact: true,
  })
  const input = dialog.getByRole("combobox", { name: "Actions", exact: true })
  const ready = async () => {
    await expect(dialog).toHaveCount(1)
    await assertPanel(dialog)
    await expect(input).toBeFocused()
    await expect(input).toHaveAttribute("aria-expanded", "true")
    const list = dialog.getByRole("listbox")
    await expect(list).toHaveCount(1)
    await expect(list).toBeInViewport({ ratio: 1 })
    await assertRows(list, "option", ["Overview", "Orders", "Settings"])
  }
  await captureState(page, capture, "command-dialog", ready, async () => {
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })
}

/** @param {Page} page @param {Capture} capture */
async function checkTallSubmenus(page, capture) {
  const trigger = page.getByRole("button", {
    name: "Tall project commands",
    exact: true,
  })
  const originalDirection = await trigger.evaluate(
    (element) => element.closest("[dir]")?.getAttribute("dir") ?? "ltr"
  )
  const setDirection = async (dir) => {
    await page.evaluate((direction) => {
      window.__STORYBOOK_ADDONS_CHANNEL__.emit("updateStoryArgs", {
        storyId: "molecules-menu--tall-scrollable-submenus",
        updatedArgs: { dir: direction },
      })
    }, dir)
    await expect
      .poll(() =>
        trigger.evaluate((element) =>
          element.closest("[dir]")?.getAttribute("dir")
        )
      )
      .toBe(dir)
  }
  try {
    for (const dir of ["ltr", "rtl"]) {
      await setDirection(dir)
      for (const [key, command, lastName, appearance] of [
        ["s", "Sharing commands", "Last sharing command", "short-child"],
        [
          "a",
          "All project commands",
          "Nested project 24",
          "scrolling-child-end",
        ],
      ]) {
        await trigger.focus()
        await page.keyboard.press("ArrowDown")
        const parent = page.getByRole("menu", {
          name: "Tall project commands",
          exact: true,
        })
        await expect(parent).toBeFocused()
        await page.keyboard.press(key)
        const row = parent.getByRole("menuitem", { name: command, exact: true })
        await expect(row).toHaveAttribute("data-highlighted", "")
        await page.keyboard.press(dir === "rtl" ? "ArrowLeft" : "ArrowRight")
        const last = page.getByRole("menuitem", { name: lastName, exact: true })
        const child = page.getByRole("menu").filter({ has: last })
        await expect(child).toBeFocused()
        await page.keyboard.press("End")
        const ready = async () => {
          await expect(row).toHaveAttribute("aria-expanded", "true")
          await expect(child).toBeVisible()
          await expect(child).toBeFocused()
          await expect(last).toHaveAttribute("data-highlighted", "")
          await assertWithinViewport(child)
          await assertWithinViewport(last)
          await expect
            .poll(() =>
              last.evaluate((element) => {
                const box = element.getBoundingClientRect()
                const hit = element.ownerDocument.elementFromPoint(
                  box.left + box.width / 2,
                  box.top + box.height / 2
                )
                return !!hit && element.contains(hit)
              })
            )
            .toBe(true)
        }
        await captureState(page, capture, `${dir}-${appearance}`, ready, () =>
          dismissPopup(page, trigger, "menu")
        )
      }
    }
  } finally {
    await setDirection(originalDirection)
  }
}

/** Exercise only assigned, confirmed missing appearances in the current story.
 * @param {Page} page @param {string} id @param {Capture} capture
 * @returns {Promise<boolean>}
 */
export async function checkStateCheckpoints(page, id, capture) {
  if (!stateCheckpointStories.includes(id)) {
    return false
  }
  if (id.endsWith("--sizes")) {
    await checkSizes(page, id, capture)
  } else if (id === "molecules-menu--long-labels") {
    await checkLongLabels(page, capture)
  } else if (id === "molecules-menu--tall-scrollable-submenus") {
    await checkTallSubmenus(page, capture)
  } else if (id.startsWith("molecules-menu--")) {
    await checkMenu(page, id, capture)
  } else if (id.startsWith("molecules-select--")) {
    await checkSelect(page, id, capture)
  } else if (id === "molecules-cascadeselect--multiple-selection") {
    await checkMultipleHierarchy(page, capture)
  } else {
    await checkCommandDialog(page, capture)
  }
  return true
}
