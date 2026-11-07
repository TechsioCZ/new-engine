import { expect, type Locator, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

async function expectCalendarContext(day: Locator) {
  await expect
    .poll(() =>
      day.evaluate((element) => {
        const calendar = element.closest<HTMLElement>('[data-part="calendar"]')
        const navigation = calendar?.querySelector<HTMLElement>(
          '[data-part="view-control"]'
        )
        if (!(calendar && navigation)) {
          throw new Error("Missing calendar navigation")
        }
        const doc = element.ownerDocument
        const viewport = calendar.getBoundingClientRect()
        const header = navigation.getBoundingClientRect()
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        const outline =
          style.outlineStyle === "none"
            ? 0
            : Math.max(
                0,
                Number.parseFloat(style.outlineWidth) +
                  Number.parseFloat(style.outlineOffset)
              )
        const left = Math.max(0, viewport.left + calendar.clientLeft)
        const right = Math.min(
          doc.documentElement.clientWidth,
          viewport.left + calendar.clientLeft + calendar.clientWidth
        )
        const top = Math.max(0, viewport.top + calendar.clientTop)
        const bottom = Math.min(
          doc.documentElement.clientHeight,
          viewport.top + calendar.clientTop + calendar.clientHeight
        )
        const buttons = Array.from(navigation.querySelectorAll("button"))
        const controlsEscape = Math.max(
          ...buttons.map((button) => {
            const bounds = button.getBoundingClientRect()
            return Math.max(
              left - bounds.left,
              bounds.right - right,
              top - bounds.top,
              bounds.bottom - bottom
            )
          })
        )
        const clipping = Math.max(
          controlsEscape,
          left - header.left,
          header.right - right,
          top - header.top,
          header.bottom - bottom,
          left - rect.left + outline,
          rect.right + outline - right,
          header.bottom - rect.top + outline,
          rect.bottom + outline - bottom
        )
        const hit = doc.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        )
        return {
          pinned: calendar.hasAttribute("data-navigation-pinned"),
          sticky: getComputedStyle(navigation).position === "sticky",
          controls: buttons.length >= 4,
          dayHit: hit === element || element.contains(hit),
          fits: clipping <= 1,
          clipping,
        }
      })
    )
    .toMatchObject({
      pinned: true,
      sticky: true,
      controls: true,
      dayHit: true,
      fits: true,
    })
}

for (const brand of ["base", "business"] as const) {
  for (const width of [393, 1280]) {
    test(`${brand} ${width}px keeps keyboard navigation focus paint inside a scrolled calendar`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 659 })
      await openContractStory(
        page,
        "molecules-datepicker--transactional-time-granularities",
        { brand, mode: "light" }
      )
      const trigger = page
        .locator('[data-scope="date-picker"][data-part="trigger"]')
        .nth(1)
      await trigger.click()
      const calendar = page.locator(
        '[data-scope="date-picker"][data-part="calendar"]'
      )
      const selected = calendar.locator(
        '[data-part="table-cell-trigger"][data-selected]:not([data-outside-range])'
      )
      const navigation = calendar.locator('[data-part="view-control"]')
      const arrows = navigation.getByRole("button")
      await expect(arrows).toHaveCount(5)
      // Exercise a consumer's bounded Calendar surface: enough room for the
      // navigation and two full day rows, but not the complete month.
      await calendar.evaluate((element) => {
        const header = element.querySelector('[data-part="view-control"]')
        const day = element.querySelector('[data-part="table-cell-trigger"]')
        if (!(header && day)) {
          throw new Error("Missing bounded calendar anatomy")
        }
        const style = getComputedStyle(element)
        element.style.maxHeight = `${
          Number.parseFloat(style.paddingTop) +
          Number.parseFloat(style.paddingBottom) +
          Number.parseFloat(style.rowGap) +
          header.getBoundingClientRect().height +
          day.getBoundingClientRect().height * 2
        }px`
      })
      await expect(calendar).toHaveAttribute("data-navigation-pinned", "")
      await selected.focus()
      await page.keyboard.press("Shift+Tab")
      await expect(arrows.last()).toBeFocused()
      // Ordinary scrolling must not clip the outline of a still-focused sticky
      // control, even if the browser revealed the header when focus first moved.
      await calendar.evaluate((element) => {
        element.scrollTop = element.scrollHeight - element.clientHeight
      })
      await expect
        .poll(() =>
          arrows.last().evaluate((element) => {
            const surface = element.closest<HTMLElement>(
              '[data-part="calendar"]'
            )
            if (!surface) {
              throw new Error("Missing navigation scrollport")
            }
            const box = element.getBoundingClientRect()
            const viewport = surface.getBoundingClientRect()
            const style = getComputedStyle(element)
            const paint =
              style.outlineStyle === "none"
                ? 0
                : Math.max(
                    0,
                    Number.parseFloat(style.outlineWidth) +
                      Number.parseFloat(style.outlineOffset)
                  )
            const clipping = Math.max(
              viewport.left + surface.clientLeft - box.left + paint,
              box.right +
                paint -
                viewport.left -
                surface.clientLeft -
                surface.clientWidth,
              viewport.top + surface.clientTop - box.top + paint,
              box.bottom +
                paint -
                viewport.top -
                surface.clientTop -
                surface.clientHeight
            )
            return {
              scrolled: surface.scrollTop > 0,
              focusVisible: element.matches(":focus-visible"),
              painted: paint > 0,
              fits: clipping <= 1,
              clipping,
            }
          })
        )
        .toMatchObject({
          scrolled: true,
          focusVisible: true,
          painted: true,
          fits: true,
        })
      await test.info().attach("navigation-focus-geometry", {
        body: JSON.stringify(
          await arrows.last().evaluate((element) => {
            const surface = element.closest<HTMLElement>(
              '[data-part="calendar"]'
            )
            const headerElement = element.closest('[data-part="view-control"]')
            if (!(surface && headerElement)) {
              throw new Error("Missing navigation geometry")
            }
            const style = getComputedStyle(element)
            return {
              button: element.getBoundingClientRect().toJSON(),
              header: headerElement.getBoundingClientRect().toJSON(),
              calendar: surface.getBoundingClientRect().toJSON(),
              scrollTop: surface.scrollTop,
              outlineWidth: style.outlineWidth,
              outlineOffset: style.outlineOffset,
              stickyInset: getComputedStyle(headerElement).insetBlockStart,
            }
          })
        ),
        contentType: "application/json",
      })
      await page.keyboard.press("Escape")
    })
  }
}

for (const [brand, mode] of [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
] as const) {
  for (const [width, height] of [
    [393, 659],
    [1280, 720],
  ] as const) {
    test(`${brand} ${mode} ${width}x${height} keeps calendar context above pointer-opened time fields`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height })
      await openContractStory(
        page,
        "molecules-datepicker--transactional-time-granularities",
        { brand, mode }
      )
      const triggers = page.locator(
        '[data-scope="date-picker"][data-part="trigger"]'
      )
      const popup = page
        .locator('[data-scope="date-picker"][data-part="content"]')
        .filter({ visible: true })
      await expect(triggers).toHaveCount(3)
      for (let index = 0; index < 3; index++) {
        const trigger = triggers.nth(index)
        const control = trigger.locator(
          'xpath=ancestor::*[@data-scope="date-picker"][@data-part="control"]'
        )
        const accepted = await control.textContent()
        await trigger.click()
        const calendar = popup.locator(
          '[data-scope="date-picker"][data-part="calendar"]'
        )
        const selected = calendar.locator(
          '[data-part="table-cell-trigger"][data-selected]:not([data-outside-range])'
        )
        await expect(selected).toHaveCount(1)
        await expectCalendarContext(selected)
        await selected.focus()
        for (const [key, date] of [
          ["Home", "2026-08-01"],
          ["End", "2026-08-31"],
          ["ArrowUp", "2026-08-24"],
          ["ArrowDown", "2026-08-31"],
        ] as const) {
          await page.keyboard.press(key)
          const focused = calendar.locator(
            `[data-part="table-cell-trigger"][data-value="${date}"]`
          )
          // Zag commits focus on RAF; the calendar's focusin handler reveals
          // its paint on the following frame. Finish that key transaction before
          // starting the separate manual-scroll ownership check.
          await expect(focused).toBeFocused()
          await calendar.evaluate(
            () =>
              new Promise<void>((resolve) => {
                requestAnimationFrame(() => resolve())
              })
          )
          await expectCalendarContext(focused)
        }
        const scroll = await calendar.evaluate(async (element) => {
          const target = Math.max(
            0,
            (element.scrollHeight - element.clientHeight) / 2
          )
          element.scrollTop = target
          const before = element.scrollTop
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          )
          return { before, after: element.scrollTop }
        })
        expect(Math.abs(scroll.after - scroll.before)).toBeLessThanOrEqual(1)
        await page.keyboard.press("Escape")
        await expect(popup).toHaveCount(0)
        await expect(control).toHaveText(accepted ?? "")
        await expect
          .poll(() =>
            control.evaluate((element) =>
              element.contains(element.ownerDocument.activeElement)
            )
          )
          .toBe(true)
      }
    })
  }
}
