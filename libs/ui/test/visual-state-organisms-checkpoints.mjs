import { expect } from "@playwright/test"
import { assertWithinViewport } from "./visual-viewport.mjs"

/** @import { Locator, Page } from "@playwright/test" */
/** @typedef {import("./visual-popup-capture.mjs").CheckpointAppearance} CheckpointAppearance */
/** @typedef {(suffix: string, beforeCapture?: () => Promise<void>, appearance?: CheckpointAppearance) => Promise<void>} Capture */

const departments = ["Engineering", "Design", "Sales"]
const skills = ["React", "Node", "Figma", "SQL"]
const textConditions = [
  "Contains",
  "Does not contain",
  "Equals",
  "Does not equal",
  "Starts with",
  "Ends with",
  "Is empty",
  "Is not empty",
]
const numberConditions = [
  "=",
  "≠",
  ">",
  "≥",
  "<",
  "≤",
  "Between",
  "Is empty",
  "Is not empty",
]

// These are appearances already documented by the stories, not interaction permutations.
const filterCheckpoints = {
  "organisms-datatable--column-filters-with-conditions": [
    {
      appearance: "text-condition",
      condition: "First name",
      choices: textConditions,
    },
    {
      appearance: "number-condition",
      condition: "Age",
      choices: numberConditions,
    },
    {
      appearance: "role-filter",
      field: "Filter Role",
      choices: ["All", "Admin", "Editor", "Viewer"],
    },
  ],
  "organisms-datatable--narrow-column-filters": [
    {
      appearance: "narrow-number-condition",
      condition: "Age",
      table: "fixed layout filters",
      choices: numberConditions,
    },
  ],
  "organisms-datatable--typed-column-filters": [
    {
      appearance: "department-filter",
      field: "Filter Department",
      choices: ["All", ...departments],
    },
    {
      appearance: "active-filter",
      field: "Filter Active",
      choices: ["All", "Yes", "No"],
    },
    {
      appearance: "skills-filter",
      field: "Filter Skills",
      multiple: true,
      choices: skills,
    },
  ],
  "organisms-datatable--custom-filter-template": [
    {
      appearance: "salary-band-filter",
      field: "Salary band",
      choices: ["Any band", "Junior (< 5000)", "Senior (5000+)"],
    },
  ],
  "organisms-datatable--pagination": [
    {
      appearance: "page-size",
      field: "Rows per page",
      choices: ["5", "10", "25"],
    },
  ],
}

const editorStories = [
  "organisms-datatable--inline-edit-by-column-type",
  "organisms-datatable--large-field-alignment",
  "organisms-datatable--editor-validation",
]

const sidebarCheckpoints = {
  "organisms-sidebar--playground": [["start", "Primary navigation"]],
  "organisms-sidebar--controlled-offcanvas": [["start", "Primary navigation"]],
  "organisms-sidebar--two-pane-sidebar-09": [["start", "Workspace navigation"]],
  "organisms-sidebar--right-sidebar-14": [["end", "Order navigation"]],
  "organisms-sidebar--left-and-right-sidebar-15": [
    ["start", "Primary navigation"],
    ["end", "Context navigation"],
  ],
  "organisms-sidebar--logical-edges-rtl": [
    ["start", "Primary navigation"],
    ["end", "Context navigation"],
  ],
  "organisms-sidebar--sticky-site-header-sidebar-16": [
    ["start", "Primary navigation"],
  ],
}

/** Expected suffixes across the existing desktop/mobile projects. */
export const stateCheckpointSuffixes = {
  "organisms-header--narrow-container": ["--state-mobile-navigation-md-open"],
  "organisms-header--sizes": ["sm", "md", "lg"].map(
    (size) => `--state-mobile-navigation-${size}-open`
  ),
  ...Object.fromEntries(
    Object.entries(sidebarCheckpoints).map(([id, edges]) => [
      id,
      [
        ...edges.map(([side]) => `--state-mobile-${side}-navigation-open`),
        ...(id === "organisms-sidebar--controlled-offcanvas"
          ? ["--state-desktop-offcanvas-open"]
          : []),
      ],
    ])
  ),
  ...Object.fromEntries(
    Object.entries(filterCheckpoints).map(([id, states]) => [
      id,
      states.map(({ appearance }) => `--state-${appearance}-open`),
    ])
  ),
  ...Object.fromEntries(
    editorStories.map((id) => [
      id,
      ["--state-department-editor-open", "--state-skills-editor-open"],
    ])
  ),
  "organisms-datatable--loading-more": ["--state-loading-more-open"],
  "organisms-datatable--overlay-isolation": ["--state-customer-notes-open"],
  "organisms-datatable--async-save-recovery": [
    "--state-save-pending-open",
    "--state-save-rejected-open",
  ],
  "organisms-datatable--required-date-range": [
    "--state-required-range-open",
    "--state-reversed-range-open",
  ],
  "organisms-datatable--edit-mode-locks-interactions": [
    "--state-edit-lock-open",
    "--state-edit-lock-actions-open",
  ],
  "organisms-gallery--media-lifecycle-and-refs": [
    "--state-gallery-loading-open",
    "--state-gallery-error-open",
    "--state-gallery-recovered-open",
  ],
  "organisms-table--with-selection-and-actions": [
    "--state-selection-actions-open",
    "--state-delete-undo-open",
  ],
}

export const stateCheckpointStories = Object.keys(stateCheckpointSuffixes)

/** Assert accessibility only on the active surface, not an intentionally inert backdrop.
 * @param {Locator} surface
 */
async function assertActive(surface) {
  await expect(surface).toHaveCount(1)
  await expect(surface).toBeVisible()
  await assertWithinViewport(surface)
  await expect
    .poll(() =>
      surface.evaluate(
        (element) => !!element.closest('[inert], [aria-hidden="true"]')
      )
    )
    .toBe(false)
}

/** The caller prepares the appearance after asset waits, then observes readiness
 * before and after the screenshot without repairing any screenshot-induced drift.
 * @param {Capture} capture @param {string} appearance @param {() => Promise<void>} ready
 * @param {CheckpointAppearance} [preparation]
 */
async function checkpoint(capture, appearance, ready, preparation) {
  await preparation?.prepare()
  await ready()
  await capture(`--state-${appearance}-open`, ready, preparation)
}

/** @param {Locator} field */
function comboboxTrigger(field) {
  // The input is the named focus target; the adjacent anatomy trigger is the
  // actual button. Never try to focus/click a nonfocusable root wrapper.
  return field
    .locator('xpath=ancestor::*[@data-scope="combobox"][@data-part="root"]')
    .locator('[data-scope="combobox"][data-part="trigger"]')
}

/** @param {Page} page @param {Capture} capture
 * @param {{appearance: string, field?: string, condition?: string, table?: string, multiple?: boolean, choices: string[]}} state
 * @param {boolean} [invalid]
 */
async function popupCheckpoint(page, capture, state, invalid = false) {
  const root = page.locator("#storybook-root")
  const container = state.table
    ? root.getByRole("table", { name: state.table, exact: true })
    : root
  const field =
    state.multiple && state.field === "Filter Skills"
      ? container.getByPlaceholder(state.field, { exact: true })
      : container.getByRole("combobox", { name: state.field, exact: true })
  let trigger = field
  let scope = "select"
  if (state.condition) {
    trigger = container.getByRole("button", {
      name: new RegExp(`^Filter condition for ${state.condition}:`),
    })
    scope = "menu"
  } else if (state.multiple) {
    trigger = comboboxTrigger(field)
    scope = "combobox"
  }
  await expect(trigger).toHaveCount(1)
  await expect(trigger).toBeEnabled()
  if (state.multiple) {
    await expect(field).toBeEnabled()
  }
  await trigger.click()
  const surface = page
    .locator(`[data-scope="${scope}"][data-part="content"]`)
    .filter({ visible: true })
  const ready = async () => {
    await assertActive(surface)
    await expect(surface).toHaveAttribute("data-state", "open")
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    if (invalid) {
      await expect(field).toHaveAttribute("aria-invalid", "true")
    }
    const list = state.condition ? surface : page.getByRole("listbox")
    await expect(list).toHaveCount(1)
    await expect(list).toBeVisible()
    await expect(list).toBeInViewport({ ratio: 1 })
    const role = state.condition ? "menuitemradio" : "option"
    await expect(list.getByRole(role)).toHaveCount(state.choices.length)
    for (const name of state.choices) {
      await expect(list.getByRole(role, { name, exact: true })).toBeInViewport({
        ratio: 1,
      })
    }
  }
  await checkpoint(capture, state.appearance, ready)
  await page.keyboard.press("Escape")
  await expect(surface).toHaveCount(0)
  await expect(trigger).toHaveAttribute("aria-expanded", "false")
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function headerCheckpoints(page, id, capture) {
  const triggers = page.locator(
    '#storybook-root button[aria-label="Toggle mobile menu"]'
  )
  const sizes = id === "organisms-header--sizes" ? ["sm", "md", "lg"] : ["md"]
  await expect(triggers).toHaveCount(sizes.length)
  // Sizes is desktop navigation on the desktop project. NarrowContainer uses
  // the mobile composition at either viewport; do not resize the caller's page.
  if (
    id === "organisms-header--sizes" &&
    !(await triggers.first().isVisible())
  ) {
    for (const trigger of await triggers.all()) {
      await expect(trigger).toBeHidden()
    }
    return
  }
  for (const [index, size] of sizes.entries()) {
    const trigger = triggers.nth(index)
    await expect(trigger).toBeEnabled()
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await trigger.click()
    const controls = await trigger.getAttribute("aria-controls")
    expect(controls).toBeTruthy()
    const panel = page.locator(`[id=${JSON.stringify(controls)}]`)
    const navigation = panel.getByRole("navigation", {
      name:
        id === "organisms-header--sizes"
          ? `Header ${size} mobile navigation`
          : "Mobile navigation",
      exact: true,
    })
    const ready = async () => {
      await expect(trigger).toHaveAttribute("aria-expanded", "true")
      await assertActive(panel)
      await expect(panel).toHaveAttribute("data-open", "true")
      await expect(navigation).toBeVisible()
      await expect(navigation.getByRole("link")).toHaveCount(3)
      for (const link of await navigation.getByRole("link").all()) {
        await assertWithinViewport(link)
      }
    }
    await checkpoint(capture, `mobile-navigation-${size}`, ready, {
      // The absolute panel can extend below the root. A locator screenshot
      // both crops it and scrolls the root after readiness has been observed.
      fullPage: true,
      prepare: async () => {
        await panel.scrollIntoViewIfNeeded()
        for (const link of await navigation.getByRole("link").all()) {
          // Native actionability checks can scroll too; never run them in ready.
          await link.click({ trial: true })
        }
      },
    })
    await trigger.click()
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(panel).toBeHidden()
  }
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function sidebarStates(page, id, capture) {
  const desktop = await page
    .locator('#storybook-root [data-scope="sidebar"][data-part="breakpoint"]')
    .evaluate((element) => getComputedStyle(element).display !== "none")
  if (desktop && id !== "organisms-sidebar--controlled-offcanvas") {
    return
  }
  for (const [side, name] of sidebarCheckpoints[id]) {
    const trigger = page.getByRole("button", {
      name: `Toggle ${side} navigation`,
      exact: true,
    })
    await expect(trigger).toBeEnabled()
    await trigger.click()
    const surface = desktop
      ? page.locator(
          `#storybook-root [data-scope="sidebar"][data-part="panel"][data-side="${side}"]`
        )
      : page.getByRole("dialog", { name, exact: true })
    const ready = async () => {
      await assertActive(surface)
      await expect(surface).toHaveAttribute(
        "data-state",
        desktop ? "expanded" : "open"
      )
      await expect(
        surface.getByRole("link", { name: "Commerce workspace", exact: true })
      ).toBeInViewport({ ratio: 1 })
      if (id === "organisms-sidebar--two-pane-sidebar-09") {
        await expect(
          surface.getByRole("navigation", {
            name: "Workspace switcher",
            exact: true,
          })
        ).toBeVisible()
        await expect(surface.getByTestId("detail-pane")).toBeVisible()
        await expect(
          surface.getByRole("link", { name: "Assigned to me", exact: true })
        ).toBeInViewport({ ratio: 1 })
      }
      if (id === "organisms-sidebar--logical-edges-rtl") {
        await expect(
          page.locator(
            '#storybook-root [data-scope="sidebar"][data-part="root"]'
          )
        ).toHaveAttribute("dir", "rtl")
        await expect(surface).toHaveCSS("direction", "rtl")
      }
      if (id === "organisms-sidebar--sticky-site-header-sidebar-16") {
        // The header is intentionally inert under the modal; inspect geometry,
        // not accessibility, to retain its documented relationship to the shell.
        await expect(page.getByTestId("site-header")).toBeVisible()
        await expect(page.getByTestId("site-header")).toBeInViewport({
          ratio: 1,
        })
      }
      if (desktop) {
        await expect(trigger).toHaveAttribute("aria-expanded", "true")
      }
    }
    await checkpoint(
      capture,
      desktop ? "desktop-offcanvas" : `mobile-${side}-navigation`,
      ready
    )
    if (desktop) {
      await trigger.click()
      await expect(surface).toHaveAttribute("data-state", "collapsed")
      await expect(surface).toHaveAttribute("inert", "")
    } else {
      await page.keyboard.press("Escape")
      await expect(surface).toBeHidden()
    }
  }
}

/** @param {Page} page @param {Capture} capture */
async function asyncSaveStates(page, capture) {
  await page.getByRole("button", { name: "Edit Ada", exact: true }).click()
  const input = page.getByRole("textbox", {
    name: "Edit First name",
    exact: true,
  })
  await input.fill("Augusta")
  const save = page.getByRole("button", { name: "Save row", exact: true })
  await save.click()
  const pending = page.getByText("Saving row…", { exact: true })
  await pending.scrollIntoViewIfNeeded()
  await checkpoint(capture, "save-pending", async () => {
    await assertActive(pending)
    await expect(save).toHaveAttribute("aria-disabled", "true")
    await expect(input).toHaveValue("Augusta")
    await expect(
      page.getByRole("button", { name: "Simulate save failure", exact: true })
    ).toBeEnabled()
  })
  await page
    .getByRole("button", { name: "Simulate save failure", exact: true })
    .click()
  const alert = page.getByRole("alert")
  await alert.scrollIntoViewIfNeeded()
  await checkpoint(capture, "save-rejected", async () => {
    await assertActive(alert)
    await expect(alert).toContainText("Could not save this row")
    await expect(input).toHaveValue("Augusta")
    await expect(save).toBeEnabled()
    await expect(pending).toBeHidden()
  })
  await page.getByRole("button", { name: "Cancel edit", exact: true }).click()
  await expect(input).toHaveCount(0)
}

/** @param {Page} page @param {Capture} capture */
async function rangeStates(page, capture) {
  await page
    .getByRole("button", { name: "Edit row booking", exact: true })
    .click()
  const from = page.getByLabel("Edit Period from", { exact: true })
  const to = page.getByLabel("Edit Period to", { exact: true })
  const save = page.getByRole("button", { name: "Save row", exact: true })
  await from.fill("")
  await to.fill("")
  await save.click()
  const alert = page.getByRole("alert")
  await alert.scrollIntoViewIfNeeded()
  await checkpoint(capture, "required-range", async () => {
    await assertActive(alert)
    await expect(alert).toContainText("Enter a value")
    await expect(from).toHaveValue("")
    await expect(to).toHaveValue("")
  })
  await from.fill("2026-04-01")
  await to.fill("2026-03-29")
  await save.click()
  await alert.scrollIntoViewIfNeeded()
  await checkpoint(capture, "reversed-range", async () => {
    await assertActive(alert)
    await expect(alert).toContainText("start on or before the end")
    await expect(from).toHaveValue("2026-04-01")
    await expect(to).toHaveValue("2026-03-29")
  })
  await page.getByRole("button", { name: "Cancel edit", exact: true }).click()
  await expect(from).toHaveCount(0)
}

/** @param {Page} page @param {Capture} capture */
async function galleryMediaStates(page, capture) {
  const root = page.locator("#storybook-root")
  const control = (name) => root.getByRole("button", { name, exact: true })
  await control("Remount gallery").click()
  const image = root.locator('[data-media-prop="preserved"]')
  await expect(image).toHaveCount(1)
  const frame = image.locator("xpath=ancestor::*[@data-image-state][1]")
  const size = await frame.evaluate((element) => {
    const { width, height } = element.getBoundingClientRect()
    return { width, height }
  })
  expect(size.width).toBeGreaterThan(0)
  expect(size.height).toBeGreaterThan(0)
  const ready = async (state, source) => {
    await expect(frame).toBeVisible()
    await expect(frame).toHaveAttribute("data-image-state", state)
    await expect(image).toHaveAttribute("data-requested-src", source)
    expect(
      await frame.evaluate((element) => {
        const { width, height } = element.getBoundingClientRect()
        return { width, height }
      })
    ).toEqual(size)
  }
  await checkpoint(capture, "gallery-loading", () =>
    ready("loading", "controlled-pending")
  )
  await control("Simulate image error").click()
  await checkpoint(capture, "gallery-error", async () => {
    await ready("error", "controlled-pending")
    await expect(
      root.getByRole("img", {
        name: "Workshop sneaker full view",
        exact: true,
      })
    ).toBeVisible()
  })
  await control("Change source").click()
  await expect(frame).toHaveAttribute("data-image-state", "loading")
  await control("Simulate image load").click()
  await checkpoint(capture, "gallery-recovered", async () => {
    const source = await image.getAttribute("src")
    expect(source).toBeTruthy()
    if (!source) {
      throw new Error("Recovery must request real image bytes")
    }
    await ready("loaded", source)
    const thumbnail = root.locator('img[data-adapter="thumbnail"]')
    for (const media of [image, thumbnail]) {
      await expect(media).toHaveAttribute("src", source)
      await expect(media).toHaveAttribute("data-requested-src", source)
      await expect(
        media.locator("xpath=ancestor::*[@data-image-state][1]")
      ).toHaveAttribute("data-image-state", "loaded")
      await expect
        .poll(() =>
          media.evaluate(async (element) => {
            if (
              !(
                element.complete &&
                element.naturalWidth > 0 &&
                element.naturalHeight > 0
              )
            ) {
              return false
            }
            try {
              await element.decode()
              return true
            } catch {
              return false
            }
          })
        )
        .toBe(true)
    }
    await expect(frame.locator("[data-image-fallback]")).toHaveCount(0)
    await expect(root.locator("[data-gallery-loading]")).toHaveCount(0)
    await expect(
      root
        .getByRole("button", { name: "Show slide 2", exact: true })
        .locator("[data-image-fallback]")
    ).toHaveAttribute("aria-hidden", "true")
  })
  await control("Unmount gallery").click()
  await expect(frame).toHaveCount(0)
  await control("Check cleanup").click()
  await expect(root.getByRole("status")).toHaveText("All refs cleaned.")
}

/** Reveal the authored pending row without changing loading state or existing records.
 * @param {Page} page @param {Capture} capture
 */
async function loadingMoreState(page, capture) {
  const region = page.locator(
    '#storybook-root section[aria-label="Scrollable records"]'
  )
  const original = await region.evaluate((element) => ({
    top: element.scrollTop,
    left: element.scrollLeft,
  }))
  const skeleton = region
    .locator("tbody tr")
    .last()
    .locator(".data-table-skeleton")
    .first()
  try {
    await checkpoint(
      capture,
      "loading-more",
      async () => {
        await expect(region.getByRole("table")).toHaveAttribute(
          "aria-busy",
          "true"
        )
        await expect(skeleton).toBeVisible()
        await assertWithinViewport(skeleton)
        await expect
          .poll(() =>
            region.evaluate((element) =>
              Math.abs(
                element.scrollHeight - element.clientHeight - element.scrollTop
              )
            )
          )
          .toBeLessThanOrEqual(1)
      },
      {
        prepare: () =>
          region.evaluate((element) => {
            element.scrollTo({ top: element.scrollHeight, behavior: "instant" })
          }),
      }
    )
  } finally {
    await region.evaluate((element, position) => {
      element.scrollTo({ ...position, behavior: "instant" })
    }, original)
    await expect
      .poll(() =>
        region.evaluate((element) => ({
          top: element.scrollTop,
          left: element.scrollLeft,
        }))
      )
      .toEqual(original)
  }
}

/** Exercise the current story after its play completes; the parent owns full-page capture.
 * @param {Page} page @param {string} id @param {Capture} capture
 * @returns {Promise<boolean>}
 */
export async function checkStateCheckpoints(page, id, capture) {
  if (!stateCheckpointStories.includes(id)) {
    return false
  }
  if (id === "organisms-gallery--media-lifecycle-and-refs") {
    await galleryMediaStates(page, capture)
  } else if (id === "organisms-datatable--loading-more") {
    await loadingMoreState(page, capture)
  } else if (id.startsWith("organisms-header--")) {
    await headerCheckpoints(page, id, capture)
  } else if (sidebarCheckpoints[id]) {
    await sidebarStates(page, id, capture)
  } else if (filterCheckpoints[id]) {
    for (const state of filterCheckpoints[id]) {
      await popupCheckpoint(page, capture, state)
    }
  } else if (editorStories.includes(id)) {
    if (id === "organisms-datatable--inline-edit-by-column-type") {
      await page
        .getByRole("button", { name: "Edit row 0", exact: true })
        .click()
    }
    await popupCheckpoint(
      page,
      capture,
      {
        appearance: "department-editor",
        field: "Edit Department",
        choices: departments,
      },
      id === "organisms-datatable--editor-validation"
    )
    await popupCheckpoint(
      page,
      capture,
      {
        appearance: "skills-editor",
        field: "Edit Skills",
        multiple: true,
        choices: skills,
      },
      id === "organisms-datatable--editor-validation"
    )
    // The two lg stories deliberately leave their editor visible in the original
    // evidence. Only reset the editor that this helper itself opened.
    if (id === "organisms-datatable--inline-edit-by-column-type") {
      await page
        .getByRole("button", { name: "Cancel edit", exact: true })
        .click()
      await expect(
        page.getByRole("combobox", { name: "Edit Department", exact: true })
      ).toHaveCount(0)
    }
  } else if (id === "organisms-datatable--overlay-isolation") {
    // This background region becomes deliberately inert while the dialog is open.
    const scrollRegion = page.locator(
      '#storybook-root section[aria-label="Scrollable records"]'
    )
    const scrollTop = await scrollRegion.evaluate(
      (element) => element.scrollTop
    )
    expect(scrollTop).toBeGreaterThan(0)
    await page
      .getByRole("button", { name: "Review customer notes", exact: true })
      .click()
    const dialog = page.getByRole("dialog", {
      name: "Customer notes",
      exact: true,
    })
    await checkpoint(capture, "customer-notes", async () => {
      await assertActive(dialog)
      await expect(dialog).toHaveAttribute("data-state", "open")
      await expect(
        dialog.getByRole("textbox", { name: "Delivery note", exact: true })
      ).toBeInViewport({ ratio: 1 })
      expect(await scrollRegion.evaluate((element) => element.scrollTop)).toBe(
        scrollTop
      )
    })
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  } else if (id === "organisms-datatable--async-save-recovery") {
    await asyncSaveStates(page, capture)
  } else if (id === "organisms-datatable--required-date-range") {
    await rangeStates(page, capture)
  } else if (id === "organisms-datatable--edit-mode-locks-interactions") {
    await page.getByRole("button", { name: "Edit row 0", exact: true }).click()
    const name = page.getByRole("textbox", { name: "Edit Name", exact: true })
    const save = page.getByRole("button", { name: "Save row", exact: true })
    const cancel = page.getByRole("button", {
      name: "Cancel edit",
      exact: true,
    })
    // Opening the draft focuses its first editor. Wait for that effect before
    // scrolling the wide mobile table; otherwise it can undo the actions scroll.
    await expect(name).toBeFocused()
    const locked = async () => {
      await expect(
        page.getByRole("checkbox", { name: "Select row 0", exact: true })
      ).toBeDisabled()
      await expect(
        page.getByRole("button", { name: "Salary", exact: true })
      ).toBeDisabled()
      await expect(
        page.getByRole("combobox", { name: "Filter Department", exact: true })
      ).toBeDisabled()
    }
    await checkpoint(
      capture,
      "edit-lock",
      async () => {
        await assertActive(name)
        await expect(name).toHaveValue("Ada Lovelace")
        await locked()
      },
      { prepare: () => name.scrollIntoViewIfNeeded() }
    )
    await checkpoint(
      capture,
      "edit-lock-actions",
      async () => {
        await expect(save).toBeEnabled()
        await expect(cancel).toBeEnabled()
        await assertActive(save)
        await assertActive(cancel)
        await locked()
      },
      {
        prepare: async () => {
          await save.scrollIntoViewIfNeeded()
          await save.click({ trial: true })
          await cancel.click({ trial: true })
        },
      }
    )
    await cancel.click()
    await expect(name).toHaveCount(0)
    await expect(
      page.getByRole("checkbox", { name: "Select row 0", exact: true })
    ).toBeEnabled()
  } else if (id === "organisms-table--with-selection-and-actions") {
    const selection = page.getByRole("checkbox", {
      name: "Select Laptop",
      exact: true,
    })
    await selection.check()
    const action = page.getByRole("button", {
      name: "Delete selected products",
      exact: true,
    })
    await action.scrollIntoViewIfNeeded()
    await checkpoint(capture, "selection-actions", async () => {
      await assertActive(action)
      await expect(selection).toBeChecked()
      await expect(
        page.getByText("1 product selected", { exact: true })
      ).toBeVisible()
      await expect(
        page.getByRole("button", { name: "Clear selection", exact: true })
      ).toBeVisible()
    })
    await action.click()
    const undo = page.getByRole("button", { name: "Undo delete", exact: true })
    await checkpoint(capture, "delete-undo", async () => {
      await assertActive(undo)
      await expect(
        page.getByText("Selected products deleted from this demo.", {
          exact: true,
        })
      ).toBeVisible()
      await expect(selection).toHaveCount(0)
      await expect(action).toHaveCount(0)
    })
    await undo.click()
    await expect(selection).not.toBeChecked()
    await expect(undo).toHaveCount(0)
  }
  return true
}
