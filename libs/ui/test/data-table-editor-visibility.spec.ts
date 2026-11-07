import { expect, type Locator, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

async function expectFieldContained(field: Locator) {
  await expect
    .poll(() =>
      field.evaluate((element) => {
        const table = element.closest("table")
        const viewport = table?.parentElement
        if (!viewport) {
          throw new Error("Missing owning table scrollport")
        }
        const bounds = viewport.getBoundingClientRect()
        const style = getComputedStyle(viewport)
        const start = Number.parseFloat(style.scrollPaddingInlineStart) || 0
        const end = Number.parseFloat(style.scrollPaddingInlineEnd) || 0
        const rtl = style.direction === "rtl"
        const left = bounds.left + viewport.clientLeft + (rtl ? end : start)
        const right =
          bounds.left +
          viewport.clientLeft +
          viewport.clientWidth -
          (rtl ? start : end)
        const fieldStyle = getComputedStyle(element)
        const clearance = Math.max(
          0,
          (Number.parseFloat(fieldStyle.outlineWidth) || 0) +
            (Number.parseFloat(fieldStyle.outlineOffset) || 0)
        )
        const rect = element.getBoundingClientRect()
        if (rect.width <= 0) {
          throw new Error("Empty focused field geometry")
        }
        return Math.max(
          left - rect.left + clearance,
          rect.right + clearance - right
        )
      })
    )
    .toBeLessThanOrEqual(1)
}

for (const [brand, mode] of [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
]) {
  for (const dir of ["ltr", "rtl"]) {
    test(`${brand} ${mode} ${dir} focused header filter and custom cell remain fully visible`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 361, height: 844 })
      for (const [story, label, value] of [
        ["header-filter-template", "Custom email filter", "nasa"],
        ["inline-edit-custom-cell", "Edit role for Alan", "Admin"],
      ] as const) {
        await openContractStory(page, `organisms-datatable--${story}`, {
          brand,
          mode,
        })
        const field = page.getByLabel(label, { exact: true })
        if (dir === "ltr") {
          // Inspect the completed play before a corrective test interaction.
          await expect(field).toBeFocused()
          await expect(field).toHaveValue(value)
          await expectFieldContained(field)
        }
        await page.locator("#storybook-root").evaluate((root, direction) => {
          root.setAttribute("dir", direction)
        }, dir)
        await expect(field).toHaveCSS("direction", dir)
        const state = await field.evaluate((element) => {
          const viewport = element.closest("table")?.parentElement
          if (!viewport) {
            throw new Error("Missing table")
          }
          element.setAttribute("data-identity-probe", "original")
          return {
            columns: Array.from(
              viewport.querySelectorAll("colgroup col"),
              (col) => (col as HTMLElement).style.width
            ),
            windowX: window.scrollX,
            windowY: window.scrollY,
            viewportTop: viewport.scrollTop,
          }
        })
        await field.evaluate((element) => {
          const viewport = element.closest("table")?.parentElement
          if (!viewport) {
            throw new Error("Missing table")
          }
          element.blur()
          viewport.scrollTo({ left: 0, behavior: "instant" })
          element.focus({ preventScroll: true })
        })
        await expect(field).toBeFocused()
        await expect(field).toHaveValue(value)
        await expect(field).toHaveAttribute("data-identity-probe", "original")
        await expectFieldContained(field)
        const after = await field.evaluate((element) => {
          const viewport = element.closest("table")?.parentElement
          if (!viewport) {
            throw new Error("Missing table")
          }
          return {
            columns: Array.from(
              viewport.querySelectorAll("colgroup col"),
              (col) => (col as HTMLElement).style.width
            ),
            windowX: window.scrollX,
            windowY: window.scrollY,
            viewportTop: viewport.scrollTop,
          }
        })
        expect(after).toEqual(state)
        // Native horizontal panning remains the user's choice after focus.
        await field.evaluate((element) =>
          element
            .closest("table")
            ?.parentElement?.scrollTo({ left: 0, behavior: "instant" })
        )
        await expect
          .poll(() =>
            field.evaluate(
              (element) => element.closest("table")?.parentElement?.scrollLeft
            )
          )
          .toBe(0)
        await expect(field).toBeFocused()
      }
    })
  }

  test(`${brand} ${mode} empty native date endpoints stay unambiguous without replacing inputs`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 844 })
    await openContractStory(page, "organisms-datatable--required-date-range", {
      brand,
      mode,
    })
    await page
      .getByRole("button", { name: "Edit row booking", exact: true })
      .click()
    const from = page.getByLabel("Edit Period: Start", { exact: true })
    const to = page.getByLabel("Edit Period: End", { exact: true })
    const save = page.getByRole("button", { name: "Save row", exact: true })
    await from.fill("")
    await to.fill("")
    await save.click()
    const error = page.getByRole("alert")
    await expect(error).toContainText("Enter a value")
    for (const field of [from, to]) {
      await expect(field).toHaveValue("")
      await expect(field).toHaveAttribute("type", "date")
      await expect(field).toHaveAttribute("aria-invalid", "true")
      await expect(field).toHaveAttribute(
        "aria-describedby",
        (await error.getAttribute("id")) as string
      )
      const hint = field.locator("..").locator("[data-empty-label]")
      await expect(hint).toHaveAttribute("aria-hidden", "true")
      await expect(hint).toHaveCSS("visibility", "visible")
      expect(
        await hint.evaluate(
          (element) => getComputedStyle(element, "::after").content
        )
      ).toBe('"No date"')
      await expect(field).toHaveCSS(
        "-webkit-text-fill-color",
        "rgba(0, 0, 0, 0)"
      )
      await field.evaluate((element) =>
        element.setAttribute("data-identity-probe", "original")
      )
    }
    await from.focus()
    await expect(from).toBeFocused()
    await expect(from.locator("..").locator("[data-empty-label]")).toHaveCSS(
      "visibility",
      "hidden"
    )
    await expect(from).not.toHaveCSS(
      "-webkit-text-fill-color",
      "rgba(0, 0, 0, 0)"
    )
    await expectFieldContained(from)
    expect(
      await from.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return (
          element.ownerDocument.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
          ) === element
        )
      })
    ).toBe(true)
    await from.fill("2026-04-01")
    await expect(from).toHaveAttribute("data-identity-probe", "original")
    await expect(from.locator("..")).not.toHaveAttribute("data-empty")
    await expect(to).toHaveAttribute("min", "2026-04-01")
    await to.fill("2026-03-29")
    await save.click()
    await expect(error).toContainText("start on or before the end")
    await expect(from).toHaveValue("2026-04-01")
    await expect(to).toHaveValue("2026-03-29")
    await to.fill("")
    await save.click()
    await expect(from).toHaveCount(0)
    await expect(error).toHaveCount(0)
    await page
      .getByRole("button", { name: "Edit row booking", exact: true })
      .click()
    // This callback-only story does not echo commits into its controlled data.
    await expect(from).toHaveValue("2026-03-29")
    await expect(to).toHaveValue("2026-03-30")
    await from.press("Escape")
    await expect(from).toHaveCount(0)
    await expect(
      page.getByRole("button", { name: "Edit row booking", exact: true })
    ).toBeFocused()
  })
}
