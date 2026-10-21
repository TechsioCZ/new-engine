import { expect, type Locator, type Page, test } from "@playwright/test"

const stories = {
  clearAndForm: "molecules-datepicker--clear-and-form-serialization",
  controlled: "molecules-datepicker--controlled-parent-behaviors",
  controlledRange: "molecules-datepicker--controlled-date-range",
  controlledTimedResync: "molecules-datepicker--controlled-timed-resync",
  dateOnly: "molecules-datepicker--date-only-calendar",
  dateRange: "molecules-datepicker--date-range-calendar",
  locales: "molecules-datepicker--locales-and-long-labels",
  localizedUnavailableRange:
    "molecules-datepicker--localized-unavailable-range",
  playground: "molecules-datepicker--playground",
  rangeForm: "molecules-datepicker--range-form-serialization",
  rejectingControlledRange:
    "molecules-datepicker--rejecting-controlled-date-range",
  sizes: "molecules-datepicker--sizes",
  states: "molecules-datepicker--states",
  timed: "molecules-datepicker--initially-open-timed-draft",
  timedRange: "molecules-datepicker--initially-open-date-time-range",
  timedVariants: "molecules-datepicker--transactional-time-granularities",
  typedValues: "molecules-datepicker--typed-date-time-values",
  zonedRange: "molecules-datepicker--zoned-date-time-range",
} as const

const inputStories = {
  playground: "atoms-input--playground",
  sizes: "atoms-input--sizes",
  variants: "atoms-input--variants",
} as const

const pickerRootSelector = '[data-scope="date-picker"][data-part="root"]'
const contentSelector = '[data-scope="date-picker"][data-part="content"]'
const daySelector =
  '[data-scope="date-picker"][data-part="table-cell-trigger"]:not([data-selected]):not([data-disabled]):not([data-unavailable]):not([data-outside-range])'

async function openStory(page: Page, storyId: string, args?: string) {
  const storyArgs = args ? `&args=${args}` : ""
  await page.goto(`/iframe.html?id=${storyId}&viewMode=story${storyArgs}`, {
    waitUntil: "domcontentloaded",
  })
  await expect(page.locator("#storybook-root")).not.toBeEmpty()
  await expect(page.locator(pickerRootSelector).first()).toBeVisible()
}

// Calendar examples intentionally start closed so their editable fields remain
// usable in Docs. Exercise the real trigger instead of assuming defaultOpen.
async function openCalendarStory(page: Page, storyId: string) {
  await openStory(page, storyId)
  const trigger = page.locator(
    '[data-scope="date-picker"][data-part="trigger"]'
  )
  await expect(trigger).toHaveAccessibleName("Open calendar")
  await expect(trigger).toHaveAttribute("aria-expanded", "false")
  await expect(page.locator(contentSelector)).toHaveCount(0)
  await trigger.click()
  await expect(trigger).toHaveAttribute("aria-expanded", "true")
  await expect(page.locator(contentSelector)).toBeVisible()
}

function pickerByLabel(page: Page, label: string) {
  return page.locator(pickerRootSelector).filter({ hasText: label })
}

function hiddenValue(root: Locator) {
  return root.locator('input[type="hidden"]')
}

function getControlStyles(control: Locator) {
  return control.evaluate((node) => {
    const styles = getComputedStyle(node)

    return {
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      borderWidth: styles.borderWidth,
      fontSize: styles.fontSize,
      outlineColor: styles.outlineColor,
      outlineStyle: styles.outlineStyle,
      outlineWidth: styles.outlineWidth,
    }
  })
}

async function chooseDifferentDay(page: Page) {
  const target = page.locator(daySelector).first()
  await expect(target).toBeVisible()
  const value = await target.getAttribute("data-value")
  await target.click()
  return value
}

test.describe("DatePicker browser behavior", () => {
  test.beforeEach(async ({ page }) => {
    // Empty calendars must not depend on the host's current month. Unlike fake
    // timers, a fixed wall clock leaves Zag's RAF/focus scheduling running.
    await page.clock.setFixedTime(new Date("2026-09-01T12:00:00Z"))
  })

  test("matches the shared Input size and validation presentation", async ({
    page,
  }) => {
    await openStory(page, stories.sizes)
    const datePickerControls = page.locator(
      '[data-scope="date-input"][data-part="control"]'
    )
    const datePickerFontSizes = await datePickerControls.evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).fontSize)
    )

    await page.goto(`/iframe.html?id=${inputStories.sizes}&viewMode=story`, {
      waitUntil: "domcontentloaded",
    })
    const inputs = page.locator("input")
    await expect(inputs.first()).toBeVisible()
    const inputFontSizes = await inputs.evaluateAll((nodes) =>
      nodes.slice(0, 3).map((node) => getComputedStyle(node).fontSize)
    )
    expect(datePickerFontSizes).toEqual(inputFontSizes)

    // Sizes now demonstrates filled values without placeholders. Measure a real
    // placeholder pseudo-element instead of the browser's unrendered fallback.
    await page.goto(
      `/iframe.html?id=${inputStories.playground}&viewMode=story`,
      {
        waitUntil: "domcontentloaded",
      }
    )
    const placeholderInput = page.getByPlaceholder("e.g. Alex Morgan")
    await expect(placeholderInput).toBeVisible()
    const inputPlaceholderColor = await placeholderInput.evaluate(
      (node) => getComputedStyle(node, "::placeholder").color
    )

    await page.goto(`/iframe.html?id=${inputStories.variants}&viewMode=story`, {
      waitUntil: "domcontentloaded",
    })
    const inputError = page.getByRole("textbox", {
      name: "Contact name — error",
    })
    await inputError.evaluate((node) => {
      node.style.transition = "none"
    })
    const inputErrorStyles = await getControlStyles(inputError)
    await inputError.hover()
    const inputErrorHoverStyles = await getControlStyles(inputError)
    await inputError.focus()
    const inputErrorFocusStyles = await getControlStyles(inputError)

    await openStory(page, stories.states)
    const invalidRoot = pickerByLabel(page, "Delivery date")
    const invalidControl = invalidRoot.locator(
      '[data-scope="date-input"][data-part="control"]'
    )
    const datePickerPlaceholderColor = await invalidRoot
      .locator('[data-scope="date-input"][data-part="segment"]')
      .first()
      .evaluate((node) => getComputedStyle(node).color)
    expect(datePickerPlaceholderColor).toBe(inputPlaceholderColor)
    await invalidControl.evaluate((node) => {
      node.style.transition = "none"
    })
    const invalidStyles = await getControlStyles(invalidControl)

    expect(invalidStyles.borderColor).toBe(inputErrorStyles.borderColor)
    expect(invalidStyles.borderWidth).toBe(inputErrorStyles.borderWidth)
    expect(invalidStyles.outlineStyle).toBe(inputErrorStyles.outlineStyle)
    expect(invalidStyles.outlineWidth).toBe(inputErrorStyles.outlineWidth)

    await invalidControl.hover()
    expect((await getControlStyles(invalidControl)).borderColor).toBe(
      inputErrorHoverStyles.borderColor
    )

    await invalidRoot
      .locator('[data-scope="date-input"][data-part="segment"]')
      .first()
      .focus()
    const invalidFocusStyles = await getControlStyles(invalidControl)
    expect(invalidFocusStyles.borderColor).toBe(
      inputErrorFocusStyles.borderColor
    )
    expect(invalidFocusStyles.outlineColor).toBe(
      inputErrorFocusStyles.outlineColor
    )
    expect(invalidFocusStyles.outlineStyle).toBe(
      inputErrorFocusStyles.outlineStyle
    )
    expect(invalidFocusStyles.outlineWidth).toBe(
      inputErrorFocusStyles.outlineWidth
    )
  })

  test("uses the distinct full-contrast read-only surface and exposes required semantics", async ({
    page,
  }) => {
    await openStory(page, stories.playground)
    const defaultControlStyles = await getControlStyles(
      page.locator('[data-scope="date-input"][data-part="control"]').first()
    )

    await openStory(page, stories.states)
    const readOnlyRoot = pickerByLabel(page, "Read only")
    const readOnlyControl = readOnlyRoot.locator(
      '[data-scope="date-input"][data-part="control"]'
    )
    await expect(readOnlyControl).toHaveAttribute("data-readonly")
    const readOnlyControlStyles = await getControlStyles(readOnlyControl)
    const expectedReadOnlyStyles = await readOnlyControl.evaluate((node) => {
      const probe = document.createElement("span")
      probe.style.backgroundColor = "var(--color-form-control-bg-readonly)"
      probe.style.color = "var(--color-form-control-fg-readonly)"
      node.append(probe)
      const style = getComputedStyle(probe)
      const result = {
        backgroundColor: style.backgroundColor,
        color: style.color,
      }
      probe.remove()
      return result
    })
    // Read-only is a distinct, full-contrast surface, not the editable surface
    // and not disabled dimming (component-contracts.md section 2).
    expect(readOnlyControlStyles.backgroundColor).toBe(
      expectedReadOnlyStyles.backgroundColor
    )
    expect(readOnlyControlStyles.backgroundColor).not.toBe(
      defaultControlStyles.backgroundColor
    )
    await expect(readOnlyControl).toHaveCSS(
      "color",
      expectedReadOnlyStyles.color
    )
    await expect(readOnlyControl).toHaveCSS("opacity", "1")

    const requiredRoot = pickerByLabel(page, "Required")
    await expect(
      requiredRoot
        .locator('[data-scope="date-input"][data-part="segment"]')
        .first()
    ).toHaveAttribute("aria-required", "true")
  })

  test("keeps the calendar heading compact and accessible", async ({
    page,
  }) => {
    await openCalendarStory(page, stories.dateOnly)

    const viewTrigger = page.locator(
      '[data-scope="date-picker"][data-part="view-trigger"]'
    )
    await expect(viewTrigger).toHaveText("Sep 2026")
    expect(
      await viewTrigger.evaluate((node) => node.scrollWidth <= node.clientWidth)
    ).toBe(true)
    await expect(viewTrigger).toHaveAttribute("title", "September 2026")
  })

  test("exposes every compound mode through the playground scenario controls", async ({
    page,
  }) => {
    const scenarios = [
      {
        args: "selectionMode:single;granularity:day;defaultOpen:true",
        granularity: "day",
        hiddenInputs: 1,
        monthPanels: 1,
        selectionMode: "single",
        timeGroups: 0,
      },
      {
        args: "selectionMode:range;granularity:day;defaultOpen:true",
        granularity: "day",
        hiddenInputs: 2,
        monthPanels: 2,
        selectionMode: "range",
        timeGroups: 0,
      },
      {
        args: "selectionMode:single;granularity:minute;defaultOpen:true",
        granularity: "minute",
        hiddenInputs: 1,
        monthPanels: 1,
        selectionMode: "single",
        timeGroups: 1,
      },
      {
        args: "selectionMode:range;granularity:minute;valueKind:zoned;defaultOpen:true",
        granularity: "minute",
        hiddenInputs: 2,
        monthPanels: 2,
        selectionMode: "range",
        timeGroups: 2,
      },
    ] as const

    for (const scenario of scenarios) {
      await openStory(page, stories.playground, scenario.args)

      const root = page.locator(pickerRootSelector).first()
      await expect(root).toHaveAttribute(
        "data-selection-mode",
        scenario.selectionMode
      )
      await expect(root).toHaveAttribute(
        "data-granularity",
        scenario.granularity
      )
      await expect(hiddenValue(root)).toHaveCount(scenario.hiddenInputs)
      await expect(page.locator(contentSelector)).toBeVisible()
      await expect(
        page.locator(
          '[data-scope="date-picker"][data-part="calendar"] > [data-index]'
        )
      ).toHaveCount(scenario.monthPanels)
      await expect(
        page.locator(
          '[data-scope="date-picker"][data-part="time-control"] > [role="group"]'
        )
      ).toHaveCount(scenario.timeGroups)
      await expect(
        page.getByTestId("date-picker-playground-scenario")
      ).toContainText(scenario.selectionMode)
    }
  })

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
            rect.left <= 4 &&
            rect.right >= 4 &&
            rect.top <= 4 &&
            rect.bottom >= 4
          )
        })
      )
      .toBe(true)
    await page.mouse.click(4, 4)
    await expect(content).toHaveCount(0)
  })

  for (const [direction, value, heading] of [
    ["previous", "2026-07-31", "Jul 2026"],
    ["next", "2026-09-01", "Sep 2026"],
  ] as const) {
    test(`selects a visible ${direction}-month day and navigates the timed draft`, async ({
      page,
    }) => {
      await openCalendarStory(page, stories.timed)
      const hidden = hiddenValue(page.locator(pickerRootSelector).first())
      const outsideDay = page.locator(
        `${contentSelector} [data-part="table-cell-trigger"][data-value^="${value}"]`
      )
      await expect(outsideDay).toHaveAttribute("data-outside-range")
      await expect(outsideDay).not.toHaveAttribute("data-disabled")
      await outsideDay.click()
      await expect(
        page.locator(`${contentSelector} [data-part="view-trigger"]`)
      ).toHaveText(heading)
      await expect(hidden).toHaveValue("2026-08-31T14:30:00")
      await page.getByRole("button", { name: "Confirm", exact: true }).click()
      await expect(hidden).toHaveValue(`${value}T14:30:00`)
    })
  }

  test("commits an adjacent-month date immediately and reopens in that month", async ({
    page,
  }) => {
    await openStory(page, stories.playground, "defaultOpen:true;locale:en-US")
    const root = page.locator(pickerRootSelector).first()
    await page
      .locator(
        `${contentSelector} [data-part="table-cell-trigger"][data-value="2026-09-01"]`
      )
      .click()
    await expect(hiddenValue(root)).toHaveValue("2026-09-01")
    await expect(page.locator(contentSelector)).toHaveCount(0)
    await root.getByRole("button", { name: "Open calendar" }).click()
    await expect(
      page.locator(`${contentSelector} [data-part="view-trigger"]`)
    ).toHaveText("Sep 2026")
  })

  test("navigates a range panel when starting on an adjacent-month day", async ({
    page,
  }) => {
    await openCalendarStory(page, stories.dateRange)
    const panels = page.locator(
      '[data-selection-mode="range"][data-view="day"] > [data-index]'
    )
    const previousDay = panels
      .first()
      .locator('[data-part="table-cell-trigger"][data-value="2026-08-31"]')
    await expect(previousDay).not.toHaveAttribute("data-disabled")
    await previousDay.click()
    await expect(panels.first()).toContainText("Aug 2026")
    await expect(panels.last()).toContainText("Oct 2026")
    await panels
      .last()
      .locator('[data-part="table-cell-trigger"][data-value="2026-10-10"]')
      .click()
    const hidden = hiddenValue(page.locator(pickerRootSelector).first())
    await expect(hidden.nth(0)).toHaveValue("2026-08-31")
    await expect(hidden.nth(1)).toHaveValue("2026-10-10")
  })

  for (const scenario of [
    {
      direction: "previous",
      start: "2026-08-31",
      end: "2026-08-30",
      headings: ["Aug 2026", "Oct 2026"],
      arrow: "ArrowLeft",
    },
    {
      direction: "next",
      start: "2026-10-01",
      end: "2026-10-02",
      headings: ["Oct 2026", "Nov 2026"],
      arrow: "ArrowRight",
    },
  ] as const) {
    for (const activation of ["pointer", "Enter"] as const) {
      test(`keeps range keyboard focus after ${activation} activation of a ${scenario.direction}-month start`, async ({
        page,
      }) => {
        await openCalendarStory(page, stories.dateRange)
        const content = page.locator(contentSelector)
        const panels = content.locator('[data-part="calendar"] > [data-index]')
        const adjacentDay = panels
          .first()
          .locator(
            `[data-part="table-cell-trigger"][data-value="${scenario.start}"]`
          )
        await expect(adjacentDay).toHaveAttribute("data-outside-range")
        if (activation === "pointer") {
          await adjacentDay.click()
        } else {
          await adjacentDay.focus()
          await page.keyboard.press("Enter")
        }

        await expect(panels.locator('[data-part="view-trigger"]')).toHaveText([
          ...scenario.headings,
        ])
        const tabStop = content.locator(
          '[data-part="table-cell-trigger"][tabindex="0"]'
        )
        await expect(tabStop).toHaveCount(1)
        await expect(tabStop).toHaveAttribute("data-value", scenario.start)
        await expect(tabStop).toBeFocused()
        const hidden = hiddenValue(page.locator(pickerRootSelector).first())
        await expect(hidden.nth(0)).toHaveValue("2026-09-05")
        await expect(hidden.nth(1)).toHaveValue("2026-09-18")

        await page.keyboard.press(scenario.arrow)
        await expect(tabStop).toHaveCount(1)
        await expect(tabStop).toHaveAttribute("data-value", scenario.end)
        await expect(tabStop).toBeFocused()
        await page.keyboard.press("Enter")
        await expect(hidden.nth(0)).toHaveValue(
          scenario.direction === "previous" ? scenario.end : scenario.start
        )
        await expect(hidden.nth(1)).toHaveValue(
          scenario.direction === "previous" ? scenario.start : scenario.end
        )
        await expect(content).toHaveCount(0)
      })
    }
  }

  test("keeps adjacent-month dates subject to bounds and availability", async ({
    page,
  }) => {
    await openCalendarStory(page, stories.localizedUnavailableRange)
    for (const value of ["2026-08-31", "2026-11-01", "2026-09-14"]) {
      const day = page
        .locator(
          `${contentSelector} [data-part="table-cell-trigger"][data-value^="${value}"]`
        )
        .first()
      await expect(day).toHaveAttribute("data-disabled")
      await expect(day).toHaveAttribute("aria-disabled", "true")
    }
    await expect(
      page
        .locator(
          `${contentSelector} [data-part="table-cell-trigger"][data-value="2026-09-30"]`
        )
        .last()
    ).not.toHaveAttribute("data-disabled")
  })

  for (const globals of [
    "brand:akros",
    "brand:base;mode:light",
    "brand:base;mode:dark",
  ]) {
    test(`provides an opaque elevated popup in ${globals}`, async ({
      page,
    }) => {
      await openCalendarStory(page, `${stories.timed}&globals=${globals}`)
      const surface = await page.locator(contentSelector).evaluate((node) => {
        const style = getComputedStyle(node)
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        if (!(context && node.parentElement)) {
          throw new Error("Expected a canvas context and floating positioner")
        }
        context.fillStyle = style.backgroundColor
        context.fillRect(0, 0, 1, 1)
        return {
          alpha: context.getImageData(0, 0, 1, 1).data[3],
          border: Number.parseFloat(style.borderTopWidth),
          shadow: style.boxShadow,
          z: Number(getComputedStyle(node.parentElement).zIndex),
        }
      })
      expect(surface.alpha).toBe(255)
      expect(surface.border).toBeGreaterThan(0)
      expect(surface.shadow).not.toBe("none")
      expect(surface.z).toBeGreaterThanOrEqual(50)
    })
  }

  test("edits popup time using arrows, Home, End and typing without committing early", async ({
    page,
  }) => {
    await openStory(
      page,
      stories.playground,
      "granularity:second;defaultOpen:true;hourCycle:24"
    )
    const hidden = hiddenValue(page.locator(pickerRootSelector).first())
    const content = page.locator(contentSelector)
    for (const [label, min, max] of [
      ["Hour", "0", "23"],
      ["Minute", "0", "59"],
      ["Second", "0", "59"],
    ] as const) {
      const input = content.getByRole("spinbutton", {
        name: label,
        exact: true,
      })
      await input.press("End")
      await expect(input).toHaveValue(max)
      await input.press("ArrowUp")
      await expect(input).toHaveValue(min)
      await input.press("ArrowDown")
      await expect(input).toHaveValue(max)
      await input.press("Home")
      await expect(input).toHaveValue(min)
      await input.fill("12")
      await expect(input).toHaveValue("12")
      await input.press("ArrowUp")
      await expect(input).toHaveValue("13")
      await input.press("ArrowDown")
      await expect(input).toHaveValue("12")
    }
    await expect(hidden).toHaveValue("2026-08-31T14:30:45")
    await content.getByRole("button", { name: "Confirm", exact: true }).click()
    await expect(hidden).toHaveValue("2026-08-31T12:12:12")
  })

  test("wraps 12-hour time independently of the day period and cancels keyboard edits", async ({
    page,
  }) => {
    await openStory(page, stories.timedVariants)
    const root = pickerByLabel(page, "Appointment hour")
    await root.getByRole("button", { name: "Open calendar" }).click()
    const content = page.locator(contentSelector)
    const hour = content.getByRole("spinbutton", { name: "Hour", exact: true })
    await hour.press("End")
    await expect(hour).toHaveValue("12")
    await hour.press("ArrowUp")
    await expect(hour).toHaveValue("1")
    await hour.press("ArrowDown")
    await expect(hour).toHaveValue("12")
    await hour.press("Home")
    await expect(hour).toHaveValue("1")
    await expect(content.getByLabel("Day period")).toHaveValue("12")
    await content.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(hiddenValue(root)).toHaveValue("2026-08-31T14:00:00")
  })

  test("commits date-only selection immediately and owns one scalar hidden value", async ({
    page,
  }) => {
    await openCalendarStory(page, stories.dateOnly)

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
    await openCalendarStory(page, stories.dateRange)

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
    await expect(panels.nth(0)).toContainText("Sep 2026")
    await expect(panels.nth(1)).toContainText("Nov 2026")

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
    await openCalendarStory(page, stories.dateRange)

    const panels = page.locator(
      '[data-selection-mode="range"][data-view] > [data-index]'
    )
    const startPanel = panels.nth(0)
    const endPanel = panels.nth(1)

    await expect(startPanel.locator("tbody tr")).toHaveCount(6)
    await expect(endPanel.locator("tbody tr")).toHaveCount(6)

    await startPanel.getByRole("button", { name: /previous month/i }).click()
    await expect(startPanel).toContainText("Aug 2026")
    await expect(endPanel).toContainText("Oct 2026")

    await endPanel.getByRole("button", { name: /October 2026/ }).click()
    await expect(startPanel).toContainText("Aug 2026")
    await expect(endPanel).toHaveAttribute("data-view", "month")
    await expect(
      endPanel.getByRole("button", { name: /November/ })
    ).toBeVisible()

    await endPanel.getByRole("button", { name: /November/ }).click()
    await expect(startPanel).toContainText("Aug 2026")
    await expect(endPanel).toHaveAttribute("data-view", "day")
    await expect(endPanel).toContainText("Nov 2026")
  })

  test("commits indexed direct range entry only after both groups are complete", async ({
    page,
  }) => {
    await openStory(page, stories.dateRange)

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
    await openCalendarStory(page, stories.timedRange)

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

  test("keeps complete direct timed range input private until confirm", async ({
    page,
  }) => {
    await openStory(
      page,
      stories.playground,
      "selectionMode:range;granularity:minute;initialValue:empty;locale:en-US;hourCycle:24"
    )

    const root = page.locator(pickerRootSelector).first()
    const hidden = hiddenValue(root)
    const groups = root.locator(
      '[data-scope="date-input"][data-part="segment-group"]'
    )
    const enterEndpoint = async (
      group: Locator,
      endpoint: {
        day: string
        hour: string
        minute: string
        month: string
        year: string
      }
    ) => {
      for (const part of ["month", "day", "year", "hour", "minute"] as const) {
        const segment = group.locator(`[data-type="${part}"]`)
        await segment.click()
        await segment.pressSequentially(endpoint[part])
      }
    }

    await enterEndpoint(groups.nth(0), {
      day: "06",
      hour: "10",
      minute: "15",
      month: "09",
      year: "2026",
    })
    await enterEndpoint(groups.nth(1), {
      day: "19",
      hour: "16",
      minute: "45",
      month: "09",
      year: "2026",
    })

    await expect(page.locator(contentSelector)).toBeVisible()
    await expect(hidden.nth(0)).toHaveValue("")
    await expect(hidden.nth(1)).toHaveValue("")
    await expect(page.getByRole("button", { name: "Confirm" })).toBeEnabled()

    await page.getByRole("button", { name: "Cancel" }).click()
    await expect(page.locator(contentSelector)).toHaveCount(0)
    await expect(hidden.nth(0)).toHaveValue("")
    await expect(hidden.nth(1)).toHaveValue("")

    await enterEndpoint(groups.nth(0), {
      day: "06",
      hour: "10",
      minute: "15",
      month: "09",
      year: "2026",
    })
    await enterEndpoint(groups.nth(1), {
      day: "19",
      hour: "16",
      minute: "45",
      month: "09",
      year: "2026",
    })
    await page.getByRole("button", { name: "Confirm" }).click()

    await expect(hidden.nth(0)).toHaveValue("2026-09-06T10:15:00")
    await expect(hidden.nth(1)).toHaveValue("2026-09-19T16:45:00")
  })

  test("discards partial direct timed range input when opening the popup transaction", async ({
    page,
  }) => {
    await openStory(
      page,
      stories.playground,
      "selectionMode:range;granularity:minute;initialValue:empty;locale:en-US;hourCycle:24"
    )

    const root = page.locator(pickerRootSelector).first()
    const hidden = hiddenValue(root)
    const firstEndpoint = root
      .locator('[data-scope="date-input"][data-part="segment-group"]')
      .first()

    for (const [part, value] of [
      ["month", "09"],
      ["day", "06"],
      ["year", "2026"],
      ["hour", "10"],
      ["minute", "15"],
    ] as const) {
      const segment = firstEndpoint.locator(`[data-type="${part}"]`)
      await segment.click()
      await segment.pressSequentially(value)
    }

    await expect(firstEndpoint.locator('[data-type="year"]')).toHaveText("2026")
    await expect(hidden.nth(0)).toHaveValue("")
    await expect(hidden.nth(1)).toHaveValue("")

    await root
      .locator('[data-scope="date-picker"][data-part="trigger"]')
      .click()

    await expect(page.locator(contentSelector)).toBeVisible()
    await expect(firstEndpoint.locator('[data-type="year"]')).toHaveAttribute(
      "data-placeholder-shown"
    )
    await expect(page.getByRole("button", { name: "Confirm" })).toBeDisabled()
    await expect(hidden.nth(0)).toHaveValue("")
    await expect(hidden.nth(1)).toHaveValue("")
  })

  test("discards partial direct date range input when opening the popup", async ({
    page,
  }) => {
    await openStory(
      page,
      stories.playground,
      "selectionMode:range;granularity:day;initialValue:empty;locale:en-US"
    )

    const root = page.locator(pickerRootSelector).first()
    const hidden = hiddenValue(root)
    const firstEndpoint = root
      .locator('[data-scope="date-input"][data-part="segment-group"]')
      .first()

    for (const [part, value] of [
      ["month", "09"],
      ["day", "06"],
      ["year", "2026"],
    ] as const) {
      const segment = firstEndpoint.locator(`[data-type="${part}"]`)
      await segment.click()
      await segment.pressSequentially(value)
    }

    await expect(firstEndpoint.locator('[data-type="year"]')).toHaveText("2026")
    await expect(hidden.nth(0)).toHaveValue("")
    await expect(hidden.nth(1)).toHaveValue("")

    await root
      .locator('[data-scope="date-picker"][data-part="trigger"]')
      .click()

    await expect(page.locator(contentSelector)).toBeVisible()
    await expect(firstEndpoint.locator('[data-type="year"]')).toHaveAttribute(
      "data-placeholder-shown"
    )
    await expect(hidden.nth(0)).toHaveValue("")
    await expect(hidden.nth(1)).toHaveValue("")
  })

  test("discards one timed range transaction on Escape and Cancel", async ({
    page,
  }) => {
    await openCalendarStory(page, stories.timedRange)

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
    await openCalendarStory(page, stories.timed)

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

    await openCalendarStory(page, stories.timed)
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

    await openCalendarStory(page, stories.timed)
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
    await openCalendarStory(page, stories.timed)

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

    await openCalendarStory(page, stories.timedRange)
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
    await openCalendarStory(page, stories.controlledTimedResync)

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

  test("restores a rejected controlled range after closing the popup", async ({
    page,
  }) => {
    await openCalendarStory(page, stories.rejectingControlledRange)

    const root = page.locator(pickerRootSelector).first()
    const hidden = hiddenValue(root)
    await expect(page.locator(contentSelector)).toBeVisible()

    const firstEndpoint = root
      .locator('[data-scope="date-input"][data-part="segment-group"]')
      .first()
    for (const [part, value] of [
      ["month", "09"],
      ["day", "06"],
      ["year", "2026"],
    ] as const) {
      const segment = firstEndpoint.locator(`[data-type="${part}"]`)
      await segment.click()
      await segment.pressSequentially(value)
    }

    await expect(hidden.nth(0)).toHaveValue("")
    await expect(hidden.nth(1)).toHaveValue("")
    await page
      .locator(
        '[data-scope="date-picker"][data-part="table-cell-trigger"][data-value="2026-09-19"]'
      )
      .click()
    await page
      .locator(
        '[data-scope="date-picker"][data-part="table-cell-trigger"][data-value="2026-09-20"]'
      )
      .click()

    await expect(page.locator(contentSelector)).toHaveCount(0)
    await expect(page.getByTestId("date-picker-range-proposal")).toHaveText(
      "2026-09-19 – 2026-09-20"
    )
    await expect(firstEndpoint.locator('[data-type="year"]')).toHaveAttribute(
      "data-placeholder-shown"
    )
    await expect(hidden.nth(0)).toHaveValue("")
    await expect(hidden.nth(1)).toHaveValue("")
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
    // Mutation affordances are omitted, rather than left as disabled tab stops.
    await expect(readOnlyClearTrigger).toHaveCount(0)
    await expect(
      readOnlyRoot.locator('[data-scope="date-picker"][data-part="trigger"]')
    ).toHaveCount(0)
    const readOnlyDay = readOnlyRoot.getByRole("spinbutton", {
      name: "Day",
      exact: true,
    })
    await readOnlyDay.focus()
    await expect(readOnlyDay).toBeFocused()
    await readOnlyDay.press("ArrowUp")
    await readOnlyDay.press("Delete")
    await expect(readOnlyDay).toHaveText("31")
    await expect(page.locator(contentSelector)).toHaveCount(0)
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
    await openCalendarStory(page, stories.localizedUnavailableRange)

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
