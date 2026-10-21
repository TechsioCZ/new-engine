import { expect, type Page, test } from "@playwright/test"

// Embed mode disables Storybook autoplay: this suite owns all user input.
// Story play functions remain covered independently by visual.spec.ts.

const stories = {
  openHierarchy: "molecules-cascadeselect--open-hierarchy",
  parentSelection: "molecules-cascadeselect--parent-selection",
  playground: "molecules-cascadeselect--playground",
  controlled: "molecules-cascadeselect--controlled",
  multipleSelection: "molecules-cascadeselect--multiple-selection",
  withinForm: "molecules-cascadeselect--within-form",
  states: "molecules-cascadeselect--states",
  accessibleStatusText: "molecules-cascadeselect--accessible-status-text",
  selectPlayground: "molecules-select--playground",
} as const

const cascadeTriggerSelector =
  '[data-scope="cascade-select"][data-part="trigger"]'
const cascadeContentSelector =
  '[data-scope="cascade-select"][data-part="content"]'
const cascadeItemSelector = '[data-scope="cascade-select"][data-part="item"]'

async function openStory(page: Page, storyId: string, args = "") {
  await page.goto(
    `/iframe.html?id=${storyId}&viewMode=story&embed=true${args ? `&args=${args}` : ""}`,
    { waitUntil: "domcontentloaded" }
  )
  await expect(page.locator("#storybook-root")).not.toBeEmpty()
}

function getControlStyles(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const styles = getComputedStyle(element)

    return {
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      borderRadius: styles.borderRadius,
      borderWidth: styles.borderWidth,
      fontSize: styles.fontSize,
      height: styles.height,
      padding: styles.padding,
    }
  })
}

test.describe("CascadeSelect browser behavior", () => {
  test("associates the default helper text with the trigger", async ({
    page,
  }) => {
    await openStory(page, stories.playground)

    const trigger = page.locator(cascadeTriggerSelector)
    const helperText = "Select the most specific category that applies."
    const statusText = page.getByText(helperText, { exact: true }).locator("..")
    await expect(statusText).toHaveAttribute("id")
    const statusId = await statusText.getAttribute("id")
    expect(statusId).toBeTruthy()
    await expect(trigger).toHaveAttribute("aria-describedby", statusId ?? "")
    await expect(trigger).toHaveAccessibleDescription(helperText)

    await trigger.click()
    await expect(statusText).toHaveAttribute("id", statusId ?? "")
    await expect(trigger).toHaveAccessibleDescription(helperText)
  })

  test("keeps status descriptions unique across fields and validation states", async ({
    page,
  }) => {
    await openStory(page, stories.states)

    const triggers = page.locator(cascadeTriggerSelector)
    const descriptions = [
      "Choose a leaf category.",
      "Category selection is unavailable while the catalog is syncing.",
      "This saved value cannot be changed.",
      "Choose a category before continuing.",
      "Category is available.",
      "This category requires manual review.",
    ]
    await expect(triggers.nth(1)).toBeDisabled()
    await expect(triggers.nth(2)).toHaveAttribute("aria-readonly", "true")
    await triggers.nth(2).click()
    await expect(triggers.nth(2)).toHaveAttribute("aria-expanded", "false")
    await expect(triggers.nth(3)).toHaveAttribute("aria-invalid", "true")
    await expect(triggers.nth(3)).toHaveAttribute("aria-required", "true")

    const statusIds: string[] = []
    for (const [index, description] of descriptions.entries()) {
      const trigger = triggers.nth(index)
      await expect(trigger).toHaveAccessibleDescription(description)
      if (description) {
        const statusId = await trigger.getAttribute("aria-describedby")
        expect(statusId).toBeTruthy()
        if (statusId) {
          statusIds.push(statusId)
        }
      } else {
        await expect(trigger).not.toHaveAttribute("aria-describedby")
      }
    }
    expect(new Set(statusIds).size).toBe(statusIds.length)
  })

  test("links persistent guidance and an icon-backed error, then removes only the resolved error", async ({
    page,
  }) => {
    await openStory(page, stories.accessibleStatusText)

    const trigger = page.locator(cascadeTriggerSelector)
    const introduction =
      "Choose where customers will find this product in the catalog."
    const guidance =
      "Select a department, then choose its most specific category."
    const error = "Choose a category before saving the product."
    const initialIds = await trigger.getAttribute("aria-describedby")
    await expect(trigger).toHaveAccessibleDescription(
      `${introduction} ${guidance}`
    )
    await expect(trigger).not.toHaveAttribute("aria-invalid", "true")

    await page.getByRole("button", { name: "Save product" }).click()
    const errorText = page.getByRole("alert")
    await expect(errorText).toHaveText(error)
    await expect(
      errorText.locator(".token-icon-status-text-error")
    ).toBeVisible()
    await expect(trigger).toHaveAttribute("aria-invalid", "true")
    await expect(trigger).toHaveAccessibleDescription(
      `${introduction} ${guidance} ${error}`
    )
    const errorId = await errorText.getAttribute("id")
    expect(errorId).toBeTruthy()
    await expect(trigger).toHaveAttribute(
      "aria-describedby",
      `${initialIds} ${errorId}`
    )

    await trigger.click()
    await page
      .locator(`${cascadeItemSelector}[data-value="electronics"]`)
      .click()
    await page.getByText("Phones", { exact: true }).click()
    await expect(errorText).toHaveCount(0)
    await expect(trigger).not.toHaveAttribute("aria-invalid", "true")
    await expect(trigger).toHaveAccessibleDescription(
      `${introduction} ${guidance}`
    )
    await expect(trigger).toHaveAttribute("aria-describedby", initialIds ?? "")
    await expect(page.locator("output")).toHaveCount(0)
    await page.getByRole("button", { name: "Save product" }).click()
    await expect(page.locator("output")).toHaveText("Product category saved.")

    await page.getByRole("button", { name: "Clear selection" }).click()
    await expect(trigger).toHaveAccessibleDescription(
      `${introduction} ${guidance} ${error}`
    )
    await expect(page.locator("output")).toHaveCount(0)
  })

  test("labels distinct columns and keeps the ancestor path marked during keyboard navigation", async ({
    page,
  }) => {
    await openStory(page, stories.openHierarchy)
    const columns = page.locator(
      '[data-scope="cascade-select"][data-part="column"]'
    )
    await expect(columns).toHaveCount(2)
    await expect(
      columns.nth(0).locator('[data-part="column-header"]')
    ).toHaveText("1Categories")
    await expect(
      columns.nth(1).locator('[data-part="column-header"]')
    ).toHaveText("2Electronics")
    await expect(columns.nth(0).getByRole("group")).toHaveAccessibleName(
      "Categories"
    )
    await expect(columns.nth(1).getByRole("group")).toHaveAccessibleName(
      "Electronics"
    )
    const headerSize = await columns
      .nth(0)
      .locator('[data-part="column-header"]')
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))
    const itemSize = await columns
      .nth(0)
      .getByRole("treeitem")
      .first()
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))
    expect(headerSize).toBeLessThan(itemSize)
    const border = await columns
      .nth(1)
      .evaluate((el) => getComputedStyle(el).borderInlineStartWidth)
    expect(Number.parseFloat(border)).toBeGreaterThan(0)
    const ancestor = page.locator(
      `${cascadeItemSelector}[data-value="electronics"]`
    )
    await expect(ancestor).toHaveAttribute("data-active-path", "")
    await page.locator(cascadeContentSelector).focus()
    await page.keyboard.press("ArrowRight")
    await expect(ancestor).toHaveAttribute("data-active-path", "")
    const marker = await ancestor.evaluate(
      (el) => getComputedStyle(el).borderInlineStartColor
    )
    expect(marker).not.toBe("rgba(0, 0, 0, 0)")
    const first = await columns.nth(0).boundingBox()
    const second = await columns.nth(1).boundingBox()
    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    if (first && second) {
      expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1)
      expect(second.x).toBeGreaterThanOrEqual(first.x + first.width - 1)
    }
  })

  test("exposes a named tree and only references mounted child groups", async ({
    page,
  }) => {
    await openStory(page, stories.playground)
    const trigger = page.locator(cascadeTriggerSelector)
    await expect(trigger).toHaveAttribute("aria-haspopup", "tree")
    await trigger.click()
    const tree = page.getByRole("tree", { name: "Product category" })
    await expect(tree).toBeVisible()
    await expect(tree).not.toHaveAttribute("aria-activedescendant")
    const electronics = tree.getByRole("treeitem", {
      name: "Electronics",
      exact: true,
    })
    await expect(electronics).toHaveAttribute("aria-level", "1")
    await expect(electronics).toHaveAttribute("aria-expanded", "false")
    await expect(electronics).not.toHaveAttribute("aria-owns")
    await expect(electronics).not.toHaveAttribute("aria-controls")

    await electronics.click()
    await expect(electronics).toHaveAttribute("aria-expanded", "true")
    const childGroup = page.getByRole("group", { name: "Electronics" })
    const groupId = await childGroup.getAttribute("id")
    expect(groupId).toBeTruthy()
    await expect(electronics).toHaveAttribute("aria-owns", groupId ?? "")
    await expect(electronics).toHaveAttribute("aria-controls", groupId ?? "")
    const phone = tree.getByRole("treeitem", { name: "Phones", exact: true })
    await expect(phone).toHaveAttribute("aria-level", "2")
    await expect(phone).toHaveAttribute("aria-selected", "false")
    await expect(phone).not.toHaveAttribute("aria-expanded")

    await page.keyboard.press("Escape")
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(trigger).toBeFocused()
  })

  test("matches the shared Select trigger presentation", async ({ page }) => {
    await openStory(page, stories.playground)
    await page.mouse.move(0, 0)
    const cascadeStyles = await getControlStyles(page, cascadeTriggerSelector)
    const cascadeIndicator = page.locator(
      `${cascadeTriggerSelector} [data-part="indicator"]`
    )
    const cascadeIndicatorColor = await cascadeIndicator.evaluate(
      (element) => getComputedStyle(element).color
    )
    await page.locator(cascadeTriggerSelector).hover()
    await page.waitForTimeout(250)
    const cascadeIndicatorHoverColor = await cascadeIndicator.evaluate(
      (element) => getComputedStyle(element).color
    )

    await openStory(page, stories.selectPlayground)
    await page.mouse.move(0, 0)
    const selectTriggerSelector = '[data-scope="select"][data-part="trigger"]'
    const selectStyles = await getControlStyles(page, selectTriggerSelector)
    const selectIndicator = page.locator(
      `${selectTriggerSelector} .token-icon-select-indicator`
    )
    const selectIndicatorColor = await selectIndicator.evaluate(
      (element) => getComputedStyle(element).color
    )
    await page.locator(selectTriggerSelector).hover()
    await page.waitForTimeout(250)
    const selectIndicatorHoverColor = await selectIndicator.evaluate(
      (element) => getComputedStyle(element).color
    )

    expect(cascadeStyles).toEqual(selectStyles)
    expect(cascadeIndicatorColor).toBe(selectIndicatorColor)
    expect(cascadeIndicatorHoverColor).toBe(selectIndicatorHoverColor)
  })

  test("keeps an open hierarchy stable and inside the viewport", async ({
    page,
  }) => {
    await openStory(page, stories.openHierarchy)

    const trigger = page.locator(cascadeTriggerSelector)
    const content = page.locator(cascadeContentSelector)
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(content).toBeVisible()
    await expect(
      page.locator('[data-scope="cascade-select"][data-part="list"]')
    ).toHaveCount(2)
    await page.waitForTimeout(300)
    await expect(trigger).toHaveAttribute("aria-expanded", "true")

    const contentBox = await content.boundingBox()
    const viewport = page.viewportSize()
    expect(contentBox).not.toBeNull()
    expect(viewport).not.toBeNull()
    if (contentBox && viewport) {
      expect(contentBox.x).toBeGreaterThanOrEqual(0)
      expect(contentBox.x + contentBox.width).toBeLessThanOrEqual(
        viewport.width
      )
    }
  })

  test("keeps the popup anchored while adding a hierarchy level", async ({
    page,
  }, testInfo) => {
    // biome-ignore lint/suspicious/noSkippedTests: Desktop anchoring needs a desktop viewport.
    test.skip(
      testInfo.project.name !== "desktop",
      "This assertion covers constrained desktop placement."
    )
    await page.setViewportSize({ width: 860, height: 600 })
    await openStory(page, stories.playground)

    await page.locator(cascadeTriggerSelector).click()
    const content = page.locator(cascadeContentSelector)
    await expect(content).toBeVisible()
    await page.waitForTimeout(300)
    const initialBox = await content.boundingBox()

    await page
      .locator(`${cascadeItemSelector}[data-value="electronics"]`)
      .click()
    await expect(
      page.locator('[data-scope="cascade-select"][data-part="list"]')
    ).toHaveCount(2)
    await page.waitForTimeout(300)
    const expandedBox = await content.boundingBox()

    expect(initialBox).not.toBeNull()
    expect(expandedBox).not.toBeNull()
    if (initialBox && expandedBox) {
      expect(Math.abs(expandedBox.x - initialBox.x)).toBeLessThanOrEqual(2)
      expect(expandedBox.width).toBeGreaterThan(initialBox.width)
    }
  })

  test("opens branches and commits a complete leaf path", async ({ page }) => {
    await openStory(page, stories.playground)

    const trigger = page.locator(cascadeTriggerSelector)
    await trigger.click()
    await page
      .locator(`${cascadeItemSelector}[data-value="electronics"]`)
      .click()

    const electronics = page
      .locator(cascadeItemSelector)
      .filter({ hasText: "Electronics" })
      .first()
    // Read both rectangles in one layout snapshot: keyboard-cursor scrolling
    // may move the column between separate Playwright boundingBox calls.
    const { itemBox, branchBox } = await electronics.evaluate((element) => ({
      itemBox: element.getBoundingClientRect().toJSON(),
      branchBox: element
        .querySelector(':scope > span[aria-hidden="true"]')
        ?.getBoundingClientRect()
        .toJSON(),
    }))
    expect(branchBox).toBeDefined()
    if (branchBox) {
      const inset = itemBox.x + itemBox.width - (branchBox.x + branchBox.width)
      expect(inset).toBeGreaterThanOrEqual(8)
      expect(inset).toBeLessThanOrEqual(12)
    }

    await page.getByText("Phones", { exact: true }).click()
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(trigger).toContainText("Electronics / Phones")
  })

  test("supports keyboard traversal through hierarchy levels", async ({
    page,
  }) => {
    await openStory(page, stories.playground)

    const trigger = page.locator(cascadeTriggerSelector)
    await trigger.focus()
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("Enter")
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(page.locator(cascadeContentSelector)).toBeFocused()
    await expect(
      page.locator(`${cascadeItemSelector}[data-highlighted]`)
    ).toContainText("Electronics")

    await page.keyboard.press("ArrowRight")
    await expect(
      page.locator('[data-scope="cascade-select"][data-part="list"]')
    ).toHaveCount(2)

    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("Enter")
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(trigger).toContainText("Electronics / Phones")
  })

  test("scrolls the keyboard cursor into view when columns overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await openStory(page, stories.playground)
    await page.locator(cascadeTriggerSelector).focus()
    await page.keyboard.press("ArrowDown")
    await page.keyboard.press("Enter")
    const content = page.locator(cascadeContentSelector)
    await expect(content).toBeFocused()
    await expect(
      page.getByRole("treeitem", { name: "Electronics", exact: true })
    ).toHaveAttribute("data-highlighted", "")
    await page.keyboard.press("ArrowRight")
    await expect(
      page.locator('[data-scope="cascade-select"][data-part="list"]')
    ).toHaveCount(2)
    // The column is rendered before the cursor enters it. Wait for that
    // transition before asking for the next sibling on slow WebKit.
    await expect(
      page.getByRole("treeitem", { name: "Computers", exact: true })
    ).toHaveAttribute("data-highlighted", "")
    await page.keyboard.press("ArrowDown")
    const phone = page.getByRole("treeitem", { name: "Phones", exact: true })
    await expect(phone).toHaveAttribute("data-highlighted", "")
    await expect(content).toHaveAttribute(
      "aria-activedescendant",
      (await phone.getAttribute("id")) as string
    )
    await expect
      .poll(() =>
        content.evaluate((element) => element.scrollWidth > element.clientWidth)
      )
      .toBe(true)
    await expect
      .poll(() => content.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0)
    await expect
      .poll(async () => {
        const viewport = await content.boundingBox()
        const item = await phone.boundingBox()
        return Boolean(
          viewport &&
            item &&
            item.x >= viewport.x &&
            item.x + item.width <= viewport.x + viewport.width
        )
      })
      .toBe(true)
  })

  test("reflects controlled updates in the trigger", async ({ page }) => {
    await openStory(page, stories.controlled)

    const trigger = page.locator(cascadeTriggerSelector)
    await expect(trigger).toContainText("Home & garden / Furniture")
    await page.getByRole("button", { name: "Set phones" }).click()
    await expect(trigger).toContainText("Electronics / Phones")
    await page.getByRole("button", { name: "Clear", exact: true }).click()
    await expect(trigger).toContainText("Choose a category")
  })

  test("keeps multiple selection open while appending a path", async ({
    page,
  }) => {
    await openStory(page, stories.multipleSelection)

    const trigger = page.locator(cascadeTriggerSelector)
    await expect(trigger).toContainText("Computers, Lighting")
    await trigger.click()
    await page.getByText("Fashion", { exact: true }).click()
    await page.getByText("Men", { exact: true }).click()

    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(trigger).toContainText("Computers, Lighting, Men")
  })

  test("submits the complete selected path with a native form", async ({
    page,
  }) => {
    await openStory(page, stories.withinForm)

    await page.getByRole("button", { name: "Save category" }).click()
    await expect(page.getByRole("alert")).toHaveText(
      "Choose a category before saving."
    )
    await expect(page.locator(cascadeTriggerSelector)).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    await expect(page.locator("output")).toHaveCount(0)
    await page.locator(cascadeTriggerSelector).click()
    await page
      .locator(`${cascadeItemSelector}[data-value="electronics"]`)
      .click()
    await page.getByText("Phones", { exact: true }).click()
    await page.getByRole("button", { name: "Save category" }).click()

    await expect(page.locator("output")).toHaveText(
      "Submitted value: electronics,phones"
    )
  })

  test("renders selection and branch indicators without overlap", async ({
    page,
  }) => {
    await openStory(page, stories.parentSelection)
    await page.locator(cascadeTriggerSelector).click()

    const selectedParent = page
      .locator(cascadeItemSelector)
      .filter({ hasText: "Electronics" })
      .first()
    await expect(selectedParent).toHaveAttribute("data-state", "checked")

    const selectionBox = await selectedParent
      .locator('[data-part="item-indicator"]')
      .boundingBox()
    const branchBox = await selectedParent
      .locator(':scope > span[aria-hidden="true"]')
      .boundingBox()
    expect(selectionBox).not.toBeNull()
    expect(branchBox).not.toBeNull()
    if (selectionBox && branchBox) {
      expect(
        branchBox.x - (selectionBox.x + selectionBox.width)
      ).toBeGreaterThan(0)
    }
  })

  test("uses the logical item edge in RTL", async ({ page }) => {
    await openStory(page, stories.playground, "dir:rtl")
    await page.locator(cascadeTriggerSelector).click()
    await page
      .locator(`${cascadeItemSelector}[data-value="electronics"]`)
      .click()

    const electronics = page
      .locator(cascadeItemSelector)
      .filter({ hasText: "Electronics" })
      .first()
    // Read both rectangles in one layout snapshot: keyboard-cursor scrolling
    // may move the column between separate Playwright boundingBox calls.
    const { itemBox, branchBox } = await electronics.evaluate((element) => ({
      itemBox: element.getBoundingClientRect().toJSON(),
      branchBox: element
        .querySelector(':scope > span[aria-hidden="true"]')
        ?.getBoundingClientRect()
        .toJSON(),
    }))
    expect(branchBox).toBeDefined()
    if (branchBox) {
      const inset = branchBox.x - itemBox.x
      expect(inset).toBeGreaterThanOrEqual(8)
      expect(inset).toBeLessThanOrEqual(12)
    }
  })
})
