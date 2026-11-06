import { expect } from "@playwright/test"
import { assertWithinViewport } from "./visual-viewport.mjs"

/** @import { Page, Locator } from "@playwright/test" */

// Only the additional appearances confirmed by the Templates source audit.
// Medium search results already have evidence in grouped-results.
export const stateCheckpointAppearances = {
  "templates-popover--playground": ["default"],
  "templates-popover--sizes": ["sm", "md", "lg"],
  "templates-popover--with-close-button": ["contact-form"],
  "templates-popover--without-arrow": ["arrowless"],
  "templates-selecttemplate--playground": ["unselected-options"],
  "templates-selecttemplate--sizes": ["sm", "md", "lg"],
  "templates-selecttemplate--multiple": ["multiple-options"],
  "templates-searchsuggestions--sizes": ["sm-results", "lg-results"],
  "templates-searchsuggestions--in-dialog": ["dialog-results"],
  "templates-comprehensive-form--sizes": [
    "sm-team",
    "sm-category",
    "md-team",
    "md-category",
    "lg-team",
    "lg-category",
  ],
  "templates-comprehensive-form--popup-lifecycle-contracts": [
    "lifecycle-select",
    "lifecycle-combobox",
    "lifecycle-cascade",
    "lifecycle-date",
  ],
  "templates-comprehensive-form--modal-popup-contracts": [
    "dialog-cascade",
    "dialog-suggestions",
    "drawer-cascade",
    "drawer-suggestions",
  ],
  "templates-facetfilterpanel--overflow": ["expanded-material"],
  "templates-facetfilterpanel--rejected-drawer-close": [
    "declined-close-drawer",
  ],
  // Keep Storybook's Akros brandLock; this is not a Business appearance.
  "templates-akrosproductcardcomposition--playground": ["product-preview"],
}

export const stateCheckpointStories = Object.keys(stateCheckpointAppearances)

/** @param {Page} page @param {string} scope */
function activeContent(page, scope) {
  return page
    .locator(`[data-scope="${scope}"][data-part="content"]`)
    .filter({ visible: true })
}

/** Only the active surface must be accessible; nested overlays can inert a host.
 * @param {Locator} content
 */
async function expectOpen(content) {
  await expect(content).toHaveCount(1)
  await expect(content).toBeVisible()
  await expect(content).toHaveAttribute("data-state", "open")
  await expect(content).toHaveCSS("opacity", "1")
  await assertWithinViewport(content)
  await expect
    .poll(() =>
      content.evaluate(
        (element) => !!element.closest('[inert], [aria-hidden="true"]')
      )
    )
    .toBe(false)
}

/** @param {Locator} trigger @param {boolean} [keyboard] */
async function openField(trigger, keyboard = false) {
  await expect(trigger).toHaveCount(1)
  await expect(trigger).toBeEnabled()
  await expect(trigger).not.toHaveAttribute("aria-disabled", "true")
  await expect(trigger).not.toHaveAttribute("aria-readonly", "true")
  if (keyboard) {
    // Focus a real input/button, never the surrounding anatomy wrapper.
    await trigger.scrollIntoViewIfNeeded()
    await trigger.focus()
    await expect(trigger).toBeFocused()
    await trigger.press("ArrowDown")
  } else {
    await trigger.click()
  }
  await expect(trigger).toHaveAttribute("aria-expanded", "true")
}

/** @param {Locator} content @param {string[]} names */
async function expectOptions(content, names) {
  const list =
    (await content.getAttribute("role")) === "listbox"
      ? content
      : content.getByRole("listbox")
  await expect(list).toHaveCount(1)
  await expect(list).toBeVisible()
  await assertWithinViewport(list)
  for (const name of names) {
    const option = list.getByRole("option", { name, exact: true })
    await expect(option).toBeVisible()
    await assertWithinViewport(option)
  }
}

/** The caller runs ready again around its asset waits and screenshot boundary.
 * @param {Page} page
 * @param {(suffix: string, beforeCapture?: () => Promise<void>) => Promise<void>} capture
 * @param {string} appearance @param {Locator} content
 * @param {() => Promise<void>} details
 */
async function captureOpen(page, capture, appearance, content, details) {
  const ready = async () => {
    await expectOpen(content)
    await details()
  }
  await ready()
  await capture(`--state-${appearance}-open`, ready)
  await page.keyboard.press("Escape")
  await expect(content).not.toBeVisible()
}

/** @param {Locator} modal @param {Locator} content */
async function expectHost(modal, content) {
  // Role lookup on the host is deliberately not repeated while its child is active.
  await expect(modal).toBeVisible()
  await expect(modal).toHaveAttribute("data-state", "open")
  const hostId = await modal.getAttribute("id")
  await expect
    .poll(() =>
      content.evaluate(
        // The active popup must remain physically inside the modal's focus scope.
        (element, id) => !!id && !!element.closest(`[id="${CSS.escape(id)}"]`),
        hostId
      )
    )
    .toBe(true)
}

/** @typedef {(suffix: string, beforeCapture?: () => Promise<void>) => Promise<void>} Capture */
const sizes = ["sm", "md", "lg"]
const popoverCopy = {
  "templates-popover--playground": ["Open popover", "Popover title"],
  "templates-popover--sizes": ["Delivery details", "Delivery details"],
  "templates-popover--with-close-button": [
    "Edit delivery contact",
    "Delivery contact",
  ],
  "templates-popover--without-arrow": ["Open clean popover", "No arrow"],
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function checkPopover(page, id, capture) {
  const root = page.locator("#storybook-root")
  const sizeMatrix = id.endsWith("--sizes")
  const contact = id.endsWith("--with-close-button")
  const arrowless = id.endsWith("--without-arrow")
  const [name, title] = popoverCopy[id]
  const triggers = root.getByRole("button", { name, exact: true })
  await expect(triggers).toHaveCount(sizeMatrix ? 3 : 1)
  for (const [index, appearance] of stateCheckpointAppearances[id].entries()) {
    const trigger = triggers.nth(index)
    await openField(trigger)
    const content = activeContent(page, "popover")
    await captureOpen(page, capture, appearance, content, async () => {
      await expect(trigger).toHaveAttribute("aria-expanded", "true")
      await expect(content).toHaveAccessibleName(title)
      if (sizeMatrix) {
        await expect(
          content.getByText("Standard delivery takes 2–4 business days.", {
            exact: true,
          })
        ).toBeVisible()
      } else if (contact) {
        await expect(
          content.getByRole("textbox", {
            name: "Full name (required)",
            exact: true,
          })
        ).toBeVisible()
        const save = content.getByRole("button", {
          name: "Save contact",
          exact: true,
        })
        const close = content.locator('[data-part="close-trigger"]')
        for (const control of [save, close]) {
          await expect(control).toBeVisible()
          await assertWithinViewport(control)
        }
      } else {
        await expect(
          content.getByText("Short supporting text for the popover.", {
            exact: true,
          })
        ).toBeVisible()
        await expect(content.locator('[data-part="arrow"]')).toHaveCount(
          arrowless ? 0 : 1
        )
      }
    })
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
  }
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function checkSelect(page, id, capture) {
  const root = page.locator("#storybook-root")
  const sizeMatrix = id.endsWith("--sizes")
  const multiple = id.endsWith("--multiple")
  let selectedNames = []
  if (sizeMatrix) {
    selectedNames = ["Germany"]
  }
  if (multiple) {
    selectedNames = ["Czech Republic", "Germany", "France"]
  }
  const triggers = root.getByRole("combobox", {
    name: "Country",
    exact: true,
  })
  await expect(triggers).toHaveCount(sizeMatrix ? 3 : 1)
  for (const [index, appearance] of stateCheckpointAppearances[id].entries()) {
    const trigger = triggers.nth(index)
    await openField(trigger)
    const content = activeContent(page, "select")
    await captureOpen(page, capture, appearance, content, async () => {
      await expect(trigger).toHaveAttribute("aria-expanded", "true")
      await expectOptions(content, [
        "Czech Republic",
        "Germany",
        "France",
        "Poland",
      ])
      await expect(content.getByRole("option")).toHaveCount(4)
      const selected = content.getByRole("option", { selected: true })
      await expect(selected).toHaveCount(selectedNames.length)
      for (const name of selectedNames) {
        const option = content.getByRole("option", { name, exact: true })
        await expect(option).toHaveAttribute("aria-selected", "true")
        await expect(
          option.locator('[data-part="item-indicator"]')
        ).toBeVisible()
      }
    })
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
  }
}

/** @param {Page} page @param {string} id @param {Capture} capture */
async function checkSuggestions(page, id, capture) {
  const root = page.locator("#storybook-root")
  const inDialog = id.endsWith("--in-dialog")
  const modal = page.locator('[role="dialog"]').filter({ visible: true })
  if (inDialog) {
    await root.getByRole("button", { name: "Open search", exact: true }).click()
    await expectOpen(modal)
    await expect(modal).toHaveAccessibleName("Search catalog")
  }
  const inputs = (inDialog ? modal : root).getByRole("combobox", {
    name: "Search catalog",
    exact: true,
  })
  await expect(inputs).toHaveCount(inDialog ? 1 : 3)
  for (const index of inDialog ? [0] : [0, 2]) {
    const input = inputs.nth(index)
    await openField(input, true)
    const content = activeContent(page, "combobox")
    const appearance = inDialog ? "dialog-results" : `${sizes[index]}-results`
    await captureOpen(page, capture, appearance, content, async () => {
      await expect(input).toHaveAttribute("aria-expanded", "true")
      await expectOptions(content, [
        "Everyday trainers",
        "Limited edition trainers",
        "Footwear",
      ])
      await expect(content.getByRole("option")).toHaveCount(3)
      await expect(
        content.getByRole("option", {
          name: "Limited edition trainers",
          exact: true,
        })
      ).toHaveAttribute("aria-disabled", "true")
      if (inDialog) {
        await expectHost(modal, content)
      }
    })
    await expect(input).toHaveAttribute("aria-expanded", "false")
  }
  if (inDialog) {
    await expectOpen(modal)
    await page.keyboard.press("Escape")
    await expect(modal).not.toBeVisible()
  }
}

/** @param {Page} page @param {string} _id @param {Capture} capture */
async function checkFormSizes(page, _id, capture) {
  const root = page.locator("#storybook-root")
  const forms = root.locator("form")
  await expect(forms).toHaveCount(3)
  for (const [index, size] of sizes.entries()) {
    const form = forms.nth(index)
    for (const [field, scope, label, names] of [
      [
        "team",
        "select",
        "Team",
        ["Sales", "Technical support", "Partnerships"],
      ],
      [
        "category",
        "combobox",
        "Project category",
        ["Office supplies", "Warehouse equipment", "Custom order"],
      ],
    ]) {
      const input = form.getByRole("combobox", { name: label, exact: true })
      await openField(input, field === "category")
      const content = activeContent(page, scope)
      await captureOpen(
        page,
        capture,
        `${size}-${field}`,
        content,
        async () => {
          await expect(input).toHaveAttribute("aria-expanded", "true")
          await expectOptions(content, names)
          await expect(content.getByRole("option")).toHaveCount(3)
        }
      )
      await expect(input).toHaveAttribute("aria-expanded", "false")
    }
  }
}

/** @param {Page} page @param {string} _id @param {Capture} capture */
async function checkLifecycle(page, _id, capture) {
  const root = page.locator("#storybook-root")
  for (const [field, scope, label] of [
    ["select", "select", "Lifecycle select"],
    ["combobox", "combobox", "Lifecycle combobox"],
    ["cascade", "cascade-select", "Lifecycle cascade"],
    ["date", "date-picker", "Lifecycle date"],
  ]) {
    const trigger =
      field === "date"
        ? root.locator('[data-scope="date-picker"][data-part="trigger"]')
        : root.getByRole("combobox", { name: label, exact: true })
    await openField(trigger, field === "combobox")
    const content = activeContent(page, scope)
    await captureOpen(
      page,
      capture,
      `lifecycle-${field}`,
      content,
      async () => {
        await expect(trigger).toHaveAttribute("aria-expanded", "true")
        if (field === "cascade") {
          await expect(content).toHaveAttribute("role", "tree")
          // Pointer opening reveals the selected path's deepest column in the
          // real horizontal scrollport. The tree itself is viewport-checked above.
          await expect(
            content.getByRole("treeitem", { name: "Group", exact: true })
          ).toBeVisible()
        } else if (field === "date") {
          const grid = content.getByRole("grid")
          await expect(grid).toBeVisible()
          await assertWithinViewport(grid)
          await expect(
            content.locator('[data-part="table-cell-trigger"]').first()
          ).toBeVisible()
        } else {
          // The restored combobox query is Alpha; it need not expose Beta until edited.
          await expectOptions(
            content,
            field === "select" ? ["Alpha", "Beta"] : ["Alpha"]
          )
        }
      }
    )
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
  }
}

/** @param {Page} page @param {string} _id @param {Capture} capture */
async function checkModalFields(page, _id, capture) {
  const root = page.locator("#storybook-root")
  for (const host of ["dialog", "drawer"]) {
    const trigger = root.getByRole("button", {
      name: `Open popup ${host}`,
      exact: true,
    })
    await trigger.click()
    // Bind by anatomy before a nested child can change accessibility projections.
    const modal = page.locator('[role="dialog"]').filter({ visible: true })
    await expectOpen(modal)
    await expect(modal).toHaveAccessibleName(`Popup ${host}`)
    for (const field of ["cascade", "suggestions"]) {
      const input = modal.getByRole("combobox", {
        name: field === "cascade" ? "Modal category" : "Modal suggestions",
        exact: true,
      })
      await openField(input, true)
      const content = activeContent(
        page,
        field === "cascade" ? "cascade-select" : "combobox"
      )
      await captureOpen(
        page,
        capture,
        `${host}-${field}`,
        content,
        async () => {
          await expect(input).toHaveAttribute("aria-expanded", "true")
          await expectHost(modal, content)
          if (field === "cascade") {
            await expect(content).toHaveAttribute("role", "tree")
            const group = content.getByRole("treeitem", {
              name: "Group",
              exact: true,
            })
            await expect(group).toBeVisible()
            await assertWithinViewport(group)
          } else {
            await expectOptions(content, ["Sample result"])
          }
        }
      )
      await expect(input).toBeFocused()
      await expectOpen(modal)
    }
    await page.keyboard.press("Escape")
    await expect(modal).not.toBeVisible()
    await expect(trigger).toBeFocused()
  }
}

/** The native checkbox is intentionally sr-only; geometry belongs to its painted anatomy.
 * @param {Page} page @param {Locator} root @param {string} name
 */
async function expectFacetOption(page, root, name) {
  const option = root
    .locator('[data-scope="checkbox"][data-part="root"]')
    .filter({
      has: page.getByRole("checkbox", { name: new RegExp(`^${name}\\b`) }),
    })
  await expect(option).toHaveCount(1)
  const input = option.getByRole("checkbox")
  await expect(input).toBeEnabled()
  await expect(input).not.toBeChecked()
  const control = option.locator('[data-part="control"]')
  await expect(control).toHaveAttribute("data-state", "unchecked")
  for (const part of [control, option.locator('[data-part="label"]')]) {
    await expect(part).toBeVisible()
    // The geometry check also includes the panel's own scroll container.
    await assertWithinViewport(part)
  }
}

/** @param {Page} page @param {string} _id @param {Capture} capture */
async function checkFacetOverflow(page, _id, capture) {
  const root = page.locator("#storybook-root")
  await root.getByRole("button", { name: "Show 2 more", exact: true }).click()
  const less = root.getByRole("button", { name: "Show less", exact: true })
  const ready = async () => {
    await expect(less).toHaveAttribute("aria-expanded", "true")
    await expect(less).toBeVisible()
    await assertWithinViewport(less)
    // First and revealed last options bound the expanded list top and bottom.
    for (const name of ["Cotton", "Hemp", "Recycled fibers"]) {
      await expectFacetOption(page, root, name)
    }
  }
  await ready()
  await capture("--state-expanded-material-open", ready)
  await less.click()
  await expect(
    root.getByRole("button", { name: "Show 2 more", exact: true })
  ).toHaveAttribute("aria-expanded", "false")
}

/** @param {Page} page @param {string} _id @param {Capture} capture */
async function checkDeclinedDrawer(page, _id, capture) {
  const root = page.locator("#storybook-root")
  // Play already spent the one refusal and closed on request 2. Reopening
  // preserves the documented declined-close explanation; another Escape here
  // would immediately close it, not recreate the one-shot refusal.
  await expect(
    root.getByText("Close requests: 2", { exact: true })
  ).toBeVisible()
  const trigger = root.locator('button[aria-haspopup="dialog"]')
  await openField(trigger)
  const modal = page.locator('[role="dialog"]').filter({ visible: true })
  await captureOpen(page, capture, "declined-close-drawer", modal, async () => {
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    // The range Slider's <output> is also an implicit status in this drawer.
    const message =
      "Close was declined once. Press Escape or Close again to leave."
    const declined = modal.getByRole("status").filter({ hasText: message })
    await expect(declined).toHaveCount(1)
    await expect(declined).toHaveText(message)
    await expect(declined).toBeVisible()
    await assertWithinViewport(declined)
    await expect
      .poll(() =>
        modal.evaluate((element) =>
          element.contains(element.ownerDocument.activeElement)
        )
      )
      .toBe(true)
  })
  await expect(trigger).toBeFocused()
}

/** @param {Page} page @param {string} _id @param {Capture} capture */
async function checkProductPreview(page, _id, capture) {
  const root = page.locator("#storybook-root")
  const trigger = root.getByRole("link", {
    name: "Detail produktu: Montážní sada M8",
    exact: true,
  })
  await trigger.click()
  const modal = page.locator('[role="dialog"]').filter({ visible: true })
  await captureOpen(page, capture, "product-preview", modal, async () => {
    await expect(modal).toHaveAccessibleName("Montážní sada M8")
    const description = modal.getByText(
      "Lokální náhled produktu. Storybook zůstává otevřený.",
      { exact: true }
    )
    await expect(description).toBeVisible()
    await assertWithinViewport(description)
    await expect(modal.getByText("249 Kč", { exact: true })).toBeVisible()
  })
}

const individualChecks = {
  "templates-comprehensive-form--sizes": checkFormSizes,
  "templates-comprehensive-form--popup-lifecycle-contracts": checkLifecycle,
  "templates-comprehensive-form--modal-popup-contracts": checkModalFields,
  "templates-facetfilterpanel--overflow": checkFacetOverflow,
  "templates-facetfilterpanel--rejected-drawer-close": checkDeclinedDrawer,
  "templates-akrosproductcardcomposition--playground": checkProductPreview,
}

/** Exercise the already-rendered story after its play function has completed.
 * @param {Page} page @param {string} id @param {Capture} capture
 * @returns {Promise<boolean>}
 */
export async function checkStateCheckpoints(page, id, capture) {
  if (!Object.hasOwn(stateCheckpointAppearances, id)) {
    return false
  }
  let check = individualChecks[id]
  if (id.startsWith("templates-popover--")) {
    check = checkPopover
  }
  if (id.startsWith("templates-selecttemplate--")) {
    check = checkSelect
  }
  if (id.startsWith("templates-searchsuggestions--")) {
    check = checkSuggestions
  }
  await check(page, id, capture)
  return true
}
