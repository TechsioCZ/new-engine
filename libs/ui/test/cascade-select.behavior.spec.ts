import { expect, type Page, test } from "@playwright/test"

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
    `/iframe.html?id=${storyId}&viewMode=story${args ? `&args=${args}` : ""}`,
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
      "",
      "This saved value cannot be changed.",
      "Choose a category before continuing.",
      "Category is available.",
      "This category requires manual review.",
    ]
    const statusIds = []
    for (const [index, description] of descriptions.entries()) {
      const trigger = triggers.nth(index)
      await expect(trigger).toHaveAccessibleDescription(description)
      if (description) {
        const statusId = await trigger.getAttribute("aria-describedby")
        expect(statusId).toBeTruthy()
        statusIds.push(statusId)
      } else {
        await expect(trigger).not.toHaveAttribute("aria-describedby")
      }
    }
    expect(new Set(statusIds).size).toBe(statusIds.length)
  })

  test("updates custom status IDs and removes unmounted descriptions without losing caller descriptions", async ({
    page,
  }) => {
    await openStory(page, stories.accessibleStatusText)

    const trigger = page.locator(cascadeTriggerSelector)
    const guidance = "Your category determines the available products."
    const error = "Choose a category before continuing."
    const descriptionId = await page
      .getByText(guidance, { exact: true })
      .getAttribute("id")
    const statusText = page.getByText(error, { exact: true }).locator("..")
    await expect(statusText).toHaveAttribute("id")
    const generatedId = await statusText.getAttribute("id")
    await expect(trigger).toHaveAttribute(
      "aria-describedby",
      `${descriptionId} ${generatedId}`
    )
    await expect(trigger).toHaveAccessibleDescription(`${guidance} ${error}`)

    await page.getByRole("button", { name: "Toggle custom status ID" }).click()
    await expect(statusText).toHaveAttribute("id", `${descriptionId}-status`)
    await expect(trigger).toHaveAttribute(
      "aria-describedby",
      `${descriptionId} ${descriptionId}-status`
    )

    await page.getByRole("button", { name: "Toggle custom status ID" }).click()
    await expect(statusText).toHaveAttribute("id", generatedId ?? "")
    await expect(trigger).toHaveAttribute(
      "aria-describedby",
      `${descriptionId} ${generatedId}`
    )

    await page.getByRole("button", { name: "Toggle status text" }).click()
    await expect(statusText).toHaveCount(0)
    await expect(trigger).toHaveAttribute(
      "aria-describedby",
      descriptionId ?? ""
    )
    await expect(trigger).toHaveAccessibleDescription(guidance)

    await page.getByRole("button", { name: "Toggle status text" }).click()
    await expect(trigger).toHaveAccessibleDescription(`${guidance} ${error}`)
    const remountedId = await statusText.getAttribute("id")
    expect(remountedId).toBeTruthy()
    await expect(trigger).toHaveAttribute(
      "aria-describedby",
      `${descriptionId} ${remountedId}`
    )
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

    await page.getByText("Electronics", { exact: true }).click()
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
    await page.getByText("Electronics", { exact: true }).click()

    const electronics = page
      .locator(cascadeItemSelector)
      .filter({ hasText: "Electronics" })
      .first()
    const itemBox = await electronics.boundingBox()
    const branchBox = await electronics
      .locator(':scope > span[aria-hidden="true"]')
      .boundingBox()
    expect(itemBox).not.toBeNull()
    expect(branchBox).not.toBeNull()
    if (itemBox && branchBox) {
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

    await page.locator(cascadeTriggerSelector).click()
    await page.getByText("Electronics", { exact: true }).click()
    await page.getByText("Phones", { exact: true }).click()
    await page.getByRole("button", { name: "Submit" }).click()

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
    await page.getByText("Electronics", { exact: true }).click()

    const electronics = page
      .locator(cascadeItemSelector)
      .filter({ hasText: "Electronics" })
      .first()
    const itemBox = await electronics.boundingBox()
    const branchBox = await electronics
      .locator(':scope > span[aria-hidden="true"]')
      .boundingBox()
    expect(itemBox).not.toBeNull()
    expect(branchBox).not.toBeNull()
    if (itemBox && branchBox) {
      const inset = branchBox.x - itemBox.x
      expect(inset).toBeGreaterThanOrEqual(8)
      expect(inset).toBeLessThanOrEqual(12)
    }
  })
})
