import { expect, test, type Locator, type Page } from "@playwright/test"

const stories = {
  clearAndForm: "molecules-datepicker--clear-and-form-serialization",
  controlled: "molecules-datepicker--controlled-parent-behaviors",
  controlledRange: "molecules-datepicker--controlled-date-range",
  controlledTimedResync: "molecules-datepicker--controlled-timed-resync",
  dateOnlyOpen: "molecules-datepicker--date-only-calendar",
  dateRangeOpen: "molecules-datepicker--date-range-calendar",
  locales: "molecules-datepicker--locales-and-long-labels",
  localizedUnavailableRange:
    "molecules-datepicker--localized-unavailable-range",
  playground: "molecules-datepicker--playground",
  rangeForm: "molecules-datepicker--range-form-serialization",
  states: "molecules-datepicker--states",
  timedOpen: "molecules-datepicker--initially-open-timed-draft",
  timedRangeOpen: "molecules-datepicker--initially-open-date-time-range",
  timedVariants: "molecules-datepicker--transactional-time-granularities",
  typedValues: "molecules-datepicker--typed-date-time-values",
  zonedRange: "molecules-datepicker--zoned-date-time-range",
} as const

const pickerRootSelector = '[data-scope="date-picker"][data-part="root"]'
const contentSelector = '[data-scope="date-picker"][data-part="content"]'
const daySelector =
  '[data-scope="date-picker"][data-part="table-cell-trigger"]:not([data-selected]):not([data-disabled]):not([data-unavailable]):not([data-outside-range])'

async function openStory(page: Page, storyId: string) {
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story`, {
    waitUntil: "domcontentloaded",
  })
  await expect(page.locator("#storybook-root")).not.toBeEmpty()
  await expect(page.locator(pickerRootSelector).first()).toBeVisible()
}

function pickerByLabel(page: Page, label: string) {
  return page.locator(pickerRootSelector).filter({ hasText: label })
}

function hiddenValue(root: Locator) {
  return root.locator('input[type="hidden"]')
}

async function chooseDifferentDay(page: Page) {
  const target = page.locator(daySelector).first()
  await expect(target).toBeVisible()
  const value = await target.getAttribute("data-value")
  await target.click()
  return value
}

test.describe("DatePicker browser behavior", () => {
  test("supports real segmented keyboard entry", async ({ page }) => {
    await openStory(page, stories.playground)

    const root = page.locator(pickerRootSelector).first()
    const day = root.locator(
      '[data-scope="date-input"][data-part="segment"][data-type="day"]'
    )

    await day.click()
    await day.pressSequentially("01")

    await expect(hiddenValue(root)).toHaveValue("2026-08-01")
  })

  test("portals the popup, moves through the grid, and restores trigger focus", async ({
    page,
  }) => {
    await openStory(page, stories.playground)

    const root = page.locator(pickerRootSelector).first()
    const trigger = root.locator(
      '[data-scope="date-picker"][data-part="trigger"]'
    )
    const content = page.locator(contentSelector)

    await trigger.click()
    await expect(content).toBeVisible()
    expect(
      await content.evaluate(
        (node) =>
          !node.closest("#storybook-root") &&
          node.parentElement?.parentElement === document.body
      )
    ).toBe(true)

    const focusedDay = page.locator(daySelector).first()
    await focusedDay.focus()
    const before = await focusedDay.getAttribute("data-value")
    await focusedDay.press("ArrowRight")
    const after = await page.locator(":focus").getAttribute("data-value")
    expect(after).not.toBe(before)

    await page.keyboard.press("Escape")
    await expect(content).toHaveCount(0)
    await expect(trigger).toBeFocused()

    await trigger.click()
    await expect(content).toBeVisible()
    await trigger.click()
    await expect(content).toHaveCount(0)

    await trigger.click()
    await expect(content).toBeVisible()
    await expect
      .poll(() =>
        content.evaluate((node) => {
          const rect = node.getBoundingClientRect()
          return !(
            4 >= rect.left &&
            4 <= rect.right &&
            4 >= rect.top &&
            4 <= rect.bottom
          )
        })
      )
      .toBe(true)
    await page.mouse.click(4, 4)
    await expect(content).toHaveCount(0)
  })

  test("commits date-only selection immediately and owns one scalar hidden value", async ({
    page,
  }) => {
    await openStory(page, stories.dateOnlyOpen)

    const root = page.locator(pickerRootSelector).first()
    const hidden = hiddenValue(root)
    await expect(hidden).toHaveCount(1)
    await expect(hidden).toHaveValue("")

    const selectedDate = await chooseDifferentDay(page)

    await expect(page.locator(contentSelector)).toHaveCount(0)
    await expect(hidden).not.toHaveValue("")
    if (selectedDate) {
      await expect(hidden).toHaveValue(selectedDate)
    }
  })

  test("keeps a date range private until its second endpoint and lays out two coordinated months", async ({
    page,
  }, testInfo) => {
    await openStory(page, stories.dateRangeOpen)

    const root = page.locator(pickerRootSelector).first()
    const hidden = hiddenValue(root)
    const baseline = ["2026-09-05", "2026-09-18"] as const

    await expect(hidden).toHaveCount(2)
    await expect(hidden.nth(0)).toHaveAttribute("name", "reportingStart")
    await expect(hidden.nth(1)).toHaveAttribute("name", "reportingEnd")
    await expect(hidden.nth(0)).toHaveValue(baseline[0])
    await expect(hidden.nth(1)).toHaveValue(baseline[1])

    const panels = page.locator(
      '[data-selection-mode="range"][data-view="day"] > [data-index]'
    )
    await expect(panels).toHaveCount(2)
    const [firstBox, secondBox] = await Promise.all([
      panels.nth(0).boundingBox(),
      panels.nth(1).boundingBox(),
    ])
    expect(firstBox).not.toBeNull()
    expect(secondBox).not.toBeNull()
    if (firstBox && secondBox) {
      if (testInfo.project.name === "mobile") {
        expect(secondBox.y).toBeGreaterThan(firstBox.y)
      } else {
        expect(secondBox.x).toBeGreaterThan(firstBox.x)
      }
    }

    await panels
      .nth(1)
      .getByRole("button", { name: /next month/i })
      .click()
    await expect(panels.nth(0)).toContainText("September 2026")
    await expect(panels.nth(1)).toContainText("November 2026")

    await chooseDifferentDay(page)
    await expect(page.locator(contentSelector)).toBeVisible()
    await expect(hidden.nth(0)).toHaveValue(baseline[0])
    await expect(hidden.nth(1)).toHaveValue(baseline[1])

    const end = await chooseDifferentDay(page)
    await expect(page.locator(contentSelector)).toHaveCount(0)
    await expect(hidden.nth(0)).not.toHaveValue(baseline[0])
    if (end) {
      await expect(hidden.nth(1)).toHaveValue(end)
    }
  })

  test("keeps range panels aligned, independently navigable, and opens a period chooser from either heading", async ({
    page,
  }) => {
    await openStory(page, stories.dateRangeOpen)

    const panels = page.locator(
      '[data-selection-mode="range"][data-view] > [data-index]'
    )
    const startPanel = panels.nth(0)
    const endPanel = panels.nth(1)

    await expect(startPanel.locator("tbody tr")).toHaveCount(6)
    await expect(endPanel.locator("tbody tr")).toHaveCount(6)

    await startPanel.getByRole("button", { name: /previous month/i }).click()
    await expect(startPanel).toContainText("August 2026")
    await expect(endPanel).toContainText("October 2026")

    await endPanel.getByRole("button", { name: /October 2026/ }).click()
    await expect(startPanel).toContainText("August 2026")
    await expect(endPanel).toHaveAttribute("data-view", "month")
    await expect(
      endPanel.getByRole("button", { name: /November/ })
    ).toBeVisible()

    await endPanel.getByRole("button", { name: /November/ }).click()
    await expect(startPanel).toContainText("August 2026")
    await expect(endPanel).toHaveAttribute("data-view", "day")
    await expect(endPanel).toContainText("November 2026")
  })

  test("commits indexed direct range entry only after both groups are complete", async ({
    page,
  }) => {
    await openStory(page, stories.dateRangeOpen)

    const root = page.locator(pickerRootSelector).first()
    const hidden = hiddenValue(root)
    await root
      .locator('[data-scope="date-picker"][data-part="trigger"]')
      .click()
    await root
      .locator('[data-scope="date-picker"][data-part="clear-trigger"]')
      .click()
    await expect(hidden.nth(0)).toHaveValue("")
    await expect(hidden.nth(1)).toHaveValue("")

    const groups = root.locator(
      '[data-scope="date-input"][data-part="segment-group"]'
    )
    await expect(groups).toHaveCount(2)

    const enterEndpoint = async (
      group: Locator,
      endpoint: { day: string; month: string; year: string }
    ) => {
      for (const part of ["month", "day", "year"] as const) {
        const segment = group.locator(`[data-type="${part}"]`)
        await segment.click()
        await segment.pressSequentially(endpoint[part])
      }
    }

    await enterEndpoint(groups.nth(0), {
      day: "06",
      month: "09",
      year: "2026",
    })
    await expect(hidden.nth(0)).toHaveValue("")
    await expect(hidden.nth(1)).toHaveValue("")

    await enterEndpoint(groups.nth(1), {
      day: "19",
      month: "09",
      year: "2026",
    })
    await expect(hidden.nth(0)).toHaveValue("2026-09-06")
    await expect(hidden.nth(1)).toHaveValue("2026-09-19")
  })

  test("commits both timed range endpoints through one confirm action", async ({
    page,
  }) => {
    await openStory(page, stories.timedRangeOpen)

    const root = page.locator(pickerRootSelector).first()
    const hidden = hiddenValue(root)
    await expect(hidden).toHaveCount(2)
    await expect(hidden.nth(0)).toHaveValue("2026-09-05T09:30:00")
    await expect(hidden.nth(1)).toHaveValue("2026-09-18T17:45:00")
    await expect(page.getByText("Start time", { exact: true })).toBeVisible()
    await expect(page.getByText("End time", { exact: true })).toBeVisible()

    await page.getByLabel("Start time minute").fill("35")
    await expect(hidden.nth(0)).toHaveValue("2026-09-05T09:30:00")
    await expect(page.getByRole("button", { name: "Confirm" })).toHaveCount(1)
    await page.getByRole("button", { name: "Confirm" }).click()

    await expect(page.locator(contentSelector)).toHaveCount(0)
    await expect(hidden.nth(0)).toHaveValue("2026-09-05T09:35:00")
    await expect(hidden.nth(1)).toHaveValue("2026-09-18T17:45:00")
  })

  test("discards one timed range transaction on Escape and Cancel", async ({
    page,
  }) => {
    await openStory(page, stories.timedRangeOpen)

    const root = page.locator(pickerRootSelector).first()
    const hidden = hiddenValue(root)
    const baseline = ["2026-09-05T09:30:00", "2026-09-18T17:45:00"] as const

    await page.getByLabel("Start time minute").fill("35")
    await page.keyboard.press("Escape")
    await expect(page.locator(contentSelector)).toHaveCount(0)
    await expect(hidden.nth(0)).toHaveValue(baseline[0])
    await expect(hidden.nth(1)).toHaveValue(baseline[1])

    await root
      .locator('[data-scope="date-picker"][data-part="trigger"]')
      .click()
    await page.getByLabel("End time minute").fill("50")
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(hidden.nth(0)).toHaveValue(baseline[0])
    await expect(hidden.nth(1)).toHaveValue(baseline[1])
  })

  test("keeps timed edits private across cancel, confirm, and draft clear", async ({
    page,
  }) => {
    await openStory(page, stories.timedOpen)

    let root = page.locator(pickerRootSelector).first()
    let hidden = hiddenValue(root)
    const baseline = "2026-08-31T14:30:00"
    await expect(hidden).toHaveValue(baseline)
    await expect(
      root.locator('[data-scope="date-input"][data-part="segment"]').first()
    ).toHaveAttribute("data-readonly")

    await chooseDifferentDay(page)
    await expect(hidden).toHaveValue(baseline)
    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.locator(contentSelector)).toHaveCount(0)
    await expect(hidden).toHaveValue(baseline)

    await openStory(page, stories.timedOpen)
    root = page.locator(pickerRootSelector).first()
    hidden = hiddenValue(root)
    await chooseDifferentDay(page)
    await page
      .locator(contentSelector)
      .locator('input[aria-label="Hour"]')
      .fill("16")
    await page.getByRole("button", { name: "Confirm" }).click()
    await expect(page.locator(contentSelector)).toHaveCount(0)
    await expect(hidden).toHaveValue(/T16:30:00$/)

    await openStory(page, stories.timedOpen)
    root = page.locator(pickerRootSelector).first()
    hidden = hiddenValue(root)
    await root
      .locator('[data-scope="date-picker"][data-part="clear-trigger"]')
      .click()
    await expect(hidden).toHaveValue(baseline)
    await expect(page.getByRole("button", { name: "Confirm" })).toBeEnabled()
    await page.getByRole("button", { name: "Confirm" }).click()
    await expect(hidden).toHaveValue("")
  })

  test("renders small timed editing controls for single and range transactions", async ({
    page,
  }) => {
    await openStory(page, stories.timedOpen)

    const content = page.locator(contentSelector)
    const timeGroup = content
      .locator('[role="group"][aria-label="Time"]')
      .last()
    const hour = timeGroup.getByLabel("Hour")
    const minute = timeGroup.getByLabel("Minute")
    const hourLabel = timeGroup.getByText("Hour", { exact: true })
    const minuteLabel = timeGroup.getByText("Minute", { exact: true })
    const selectedDay = content
      .locator(
        '[data-scope="date-picker"][data-part="table-cell-trigger"][data-selected]'
      )
      .first()
    const cancel = content.getByRole("button", { name: "Cancel" })

    await expect(timeGroup.getByText("Time", { exact: true })).toBeVisible()

    const [
      groupBox,
      hourBox,
      minuteBox,
      hourLabelBox,
      minuteLabelBox,
      selectedDayBox,
      cancelBox,
    ] = await Promise.all([
      timeGroup.boundingBox(),
      hour.boundingBox(),
      minute.boundingBox(),
      hourLabel.boundingBox(),
      minuteLabel.boundingBox(),
      selectedDay.boundingBox(),
      cancel.boundingBox(),
    ])
    expect(groupBox).not.toBeNull()
    expect(hourBox).not.toBeNull()
    expect(minuteBox).not.toBeNull()
    expect(hourLabelBox).not.toBeNull()
    expect(minuteLabelBox).not.toBeNull()
    expect(selectedDayBox).not.toBeNull()
    expect(cancelBox).not.toBeNull()

    if (
      groupBox &&
      hourBox &&
      minuteBox &&
      hourLabelBox &&
      minuteLabelBox &&
      selectedDayBox &&
      cancelBox
    ) {
      expect(groupBox.height).toBeLessThanOrEqual(48)
      expect(Math.abs(hourBox.y - minuteBox.y)).toBeLessThanOrEqual(1)
      expect(hourBox.width).toBeLessThanOrEqual(48)
      expect(minuteBox.width).toBeLessThanOrEqual(48)
      expect(hourBox.height).toBeLessThanOrEqual(36)
      expect(minuteBox.height).toBeLessThanOrEqual(36)
      expect(hourLabelBox.width).toBeLessThanOrEqual(1)
      expect(minuteLabelBox.width).toBeLessThanOrEqual(1)
      expect(selectedDayBox.height).toBeLessThanOrEqual(28)
      expect(cancelBox.height).toBeLessThanOrEqual(36)
    }

    await openStory(page, stories.timedRangeOpen)
    const rangeTimeInputs = page.locator(
      `${contentSelector} [data-part="time-control"] input[type="number"]`
    )
    await expect(rangeTimeInputs).toHaveCount(4)

    for (const input of await rangeTimeInputs.all()) {
      const inputBox = await input.boundingBox()
      expect(inputBox).not.toBeNull()
      expect(inputBox?.width).toBeLessThanOrEqual(48)
      expect(inputBox?.height).toBeLessThanOrEqual(36)
    }
  })

  test("keeps controlled parents authoritative for accept, reject, delay, and transform", async ({
    page,
  }) => {
    const baseline = "2026-08-31"

    const propose = async (label: string) => {
      const root = pickerByLabel(page, label)
      await root
        .locator('[data-scope="date-picker"][data-part="trigger"]')
        .click()
      await chooseDifferentDay(page)
      return root
    }

    await openStory(page, stories.controlled)
    let root = await propose("Accept proposals")
    await expect(hiddenValue(root)).not.toHaveValue(baseline)

    await openStory(page, stories.controlled)
    root = await propose("Reject proposals")
    await expect(hiddenValue(root)).toHaveValue(baseline)
    await expect(page.getByText(/^Proposed:/)).toBeVisible()

    await openStory(page, stories.controlled)
    root = await propose("Delay proposals")
    await expect(hiddenValue(root)).toHaveValue(baseline)
    await expect(page.getByText(/^Accepted later:/)).toBeVisible()
    await expect(hiddenValue(root)).not.toHaveValue(baseline)

    await openStory(page, stories.controlled)
    root = await propose("Transform proposals")
    const proposed = await page.getByText(/^Proposed:/).textContent()
    const accepted = await hiddenValue(root).inputValue()
    expect(proposed).toBeTruthy()
    expect(proposed).not.toContain(accepted)
  })

  test("resynchronizes an open timed draft from an external controlled value", async ({
    page,
  }) => {
    await openStory(page, stories.controlledTimedResync)

    const root = pickerByLabel(page, "Externally synchronized appointment")
    await expect(page.locator(contentSelector)).toBeVisible()
    await page
      .getByTestId("date-picker-external-resync")
      .evaluate((button: HTMLButtonElement) => button.click())

    await expect(page.locator(contentSelector)).toBeVisible()
    await expect(hiddenValue(root)).toHaveValue("2026-09-02T16:45:00")
    await expect(
      page.locator(contentSelector).locator('input[aria-label="Hour"]')
    ).toHaveValue("16")
    await expect(
      page.locator(contentSelector).locator('input[aria-label="Minute"]')
    ).toHaveValue("45")
  })

  test("serializes only the accepted value through the form-owned hidden input", async ({
    page,
  }) => {
    await openStory(page, stories.clearAndForm)

    const root = pickerByLabel(page, "Delivery date")
    const hidden = root.locator('input[type="hidden"][name="deliveryDate"]')
    await expect(hidden).toHaveCount(1)
    await expect(hidden).toHaveValue("2026-08-31")

    await page.getByRole("button", { name: "Read serialized value" }).click()
    await expect(page.locator("output")).toHaveText("2026-08-31")

    await root
      .locator('[data-scope="date-picker"][data-part="clear-trigger"]')
      .click()
    await page.getByRole("button", { name: "Read serialized value" }).click()
    await expect(page.locator("output")).toHaveText("")
  })

  test("keeps controlled range clearing and two-name form serialization canonical", async ({
    page,
  }) => {
    await openStory(page, stories.controlledRange)

    let root = page.locator(pickerRootSelector).first()
    await expect(page.locator("output")).toHaveText("2026-09-05 – 2026-09-18")
    await root
      .locator('[data-scope="date-picker"][data-part="clear-trigger"]')
      .click()
    await expect(page.locator("output")).toHaveText("empty")

    await openStory(page, stories.rangeForm)
    root = page.locator(pickerRootSelector).first()
    await expect(hiddenValue(root)).toHaveCount(2)
    await page.getByRole("button", { name: "Read serialized range" }).click()
    await expect(page.locator("output")).toHaveText("2026-09-05 → 2026-09-18")
  })

  test("renders locale, week-start, hour-cycle, state, and zoned-value semantics", async ({
    page,
  }) => {
    await openStory(page, stories.locales)

    let root = page.locator(pickerRootSelector).first()
    await root
      .locator('[data-scope="date-picker"][data-part="trigger"]')
      .click()
    await expect(page.locator("thead abbr").first()).toHaveAttribute(
      "title",
      /pondělí/i
    )
    await page.keyboard.press("Escape")

    root = page.locator(pickerRootSelector).nth(1)
    await root
      .locator('[data-scope="date-picker"][data-part="trigger"]')
      .click()
    await expect(page.locator("thead abbr").first()).toHaveAttribute(
      "title",
      /Sunday/i
    )

    await openStory(page, stories.timedVariants)
    root = pickerByLabel(page, "Appointment hour")
    await root
      .locator('[data-scope="date-picker"][data-part="trigger"]')
      .click()
    await expect(page.getByLabel("Day period")).toBeVisible()
    await page.keyboard.press("Escape")

    root = pickerByLabel(page, "Appointment minute")
    await root
      .locator('[data-scope="date-picker"][data-part="trigger"]')
      .click()
    await expect(page.getByLabel("Day period")).toHaveCount(0)

    await openStory(page, stories.states)
    root = pickerByLabel(page, "Disabled")
    await expect(
      root.locator('[data-scope="date-picker"][data-part="trigger"]')
    ).toBeDisabled()
    const readOnlyRoot = pickerByLabel(page, "Read only")
    await expect(
      readOnlyRoot
        .locator('[data-scope="date-input"][data-part="segment"]')
        .first()
    ).toHaveAttribute("data-readonly")
    const readOnlyClearTrigger = readOnlyRoot.locator(
      '[data-scope="date-picker"][data-part="clear-trigger"]'
    )
    await expect(readOnlyClearTrigger).toBeDisabled()
    await expect(readOnlyClearTrigger).toBeHidden()
    await readOnlyClearTrigger.evaluate((trigger: HTMLButtonElement) =>
      trigger.click()
    )
    await expect(hiddenValue(readOnlyRoot)).toHaveValue("2026-08-31")

    await openStory(page, stories.typedValues)
    root = pickerByLabel(page, "Europe/Prague ZonedDateTime")
    await root
      .locator('[data-scope="date-picker"][data-part="trigger"]')
      .click()
    await expect(page.getByTitle("Europe/Prague")).toBeVisible()
    await expect(hiddenValue(root)).toHaveValue(
      "2026-08-31T14:30:00+02:00[Europe/Prague]"
    )
  })

  test("renders localized unavailable range days and preserves zoned endpoints", async ({
    page,
  }) => {
    await openStory(page, stories.localizedUnavailableRange)

    await expect(page.locator("thead abbr").first()).toHaveAttribute(
      "title",
      /pond/i
    )
    await expect(
      page.locator(
        '[data-scope="date-picker"][data-part="table-cell-trigger"][data-value="2026-09-14"]'
      )
    ).toHaveAttribute("data-unavailable")

    await openStory(page, stories.zonedRange)
    const root = page.locator(pickerRootSelector).first()
    const hidden = hiddenValue(root)
    await expect(hidden.nth(0)).toHaveValue(
      "2026-10-24T09:30:00+02:00[Europe/Prague]"
    )
    await expect(hidden.nth(1)).toHaveValue(
      "2026-10-26T17:45:00+01:00[Europe/Prague]"
    )
    await root
      .locator('[data-scope="date-picker"][data-part="trigger"]')
      .click()
    await expect(page.getByTitle("Europe/Prague")).toHaveCount(2)
  })

  test("preserves selected-day visibility in forced colors and removes motion", async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" })
    await openStory(page, stories.playground)

    const root = page.locator(pickerRootSelector).first()
    const trigger = root.locator(
      '[data-scope="date-picker"][data-part="trigger"]'
    )
    await trigger.click()

    const selectedDay = page
      .locator(
        '[data-scope="date-picker"][data-part="table-cell-trigger"][data-selected]'
      )
      .first()
    await expect(selectedDay).toBeVisible()
    await expect
      .poll(() =>
        selectedDay.evaluate((node) => getComputedStyle(node).outlineStyle)
      )
      .not.toBe("none")
    await expect
      .poll(() =>
        trigger.evaluate((node) => getComputedStyle(node).transitionProperty)
      )
      .toBe("none")
  })
})
