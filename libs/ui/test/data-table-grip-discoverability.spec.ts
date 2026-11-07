import { expect, test } from "@playwright/test"
import { openContractStory } from "./visual-shared-contracts.mjs"

const dropTargetClass = /border-b-2/

for (const [brand, mode] of [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
]) {
  test(`${brand} ${mode} row grip stays recognizable and keyboard reorder preserves geometry`, async ({
    page,
  }) => {
    await openContractStory(page, "organisms-datatable--row-reorder", {
      brand,
      mode,
    })
    const handle = page.getByRole("button", {
      name: "Drag to reorder row 1",
      exact: true,
    })
    const icon = handle.locator('[class~="icon-[mdi--drag-vertical]"]')
    await expect(icon).toBeVisible()
    await expect(handle).toHaveCSS("opacity", "1")
    const before = await handle.evaluate((element) => {
      const row = element.closest("tr")
      const table = element.closest("table")
      const glyph = element.querySelector('[aria-hidden="true"]')
      const cell = element.closest("td")
      if (!(row && table && glyph && cell)) {
        throw new Error("Missing row grip geometry")
      }
      const box = glyph.getBoundingClientRect()
      return {
        iconWidth: box.width,
        iconHeight: box.height,
        mask: getComputedStyle(glyph).maskImage,
        handleWidth: element.getBoundingClientRect().width,
        inheritedWidth: Number.parseFloat(getComputedStyle(cell).fontSize),
        rowHeight: row.getBoundingClientRect().height,
        tableWidth: table.getBoundingClientRect().width,
      }
    })
    expect(before.iconWidth).toBeGreaterThanOrEqual(20)
    expect(before.iconHeight).toBeGreaterThanOrEqual(20)
    expect(before.mask).not.toBe("none")
    expect(
      Math.abs(before.handleWidth - before.inheritedWidth)
    ).toBeLessThanOrEqual(1)
    await handle.focus()
    await handle.press("Space")
    await expect(handle).toHaveAttribute("aria-pressed", "true")
    await handle.press("ArrowDown")
    await expect(
      page.locator("tbody tr").filter({
        has: page.getByRole("button", {
          name: "Drag to reorder row 2",
          exact: true,
        }),
      })
    ).toHaveClass(dropTargetClass)
    await handle.press("Space")
    // DnD's accessibility fixture also contains a table; inspect this handle's owner.
    const firstCells = handle
      .locator("xpath=ancestor::table[1]")
      .locator(":scope > tbody > tr > td:nth-child(2)")
    await expect(firstCells.nth(0)).toHaveText("Alan")
    await expect(firstCells.nth(1)).toHaveText("Ada")
    await expect(handle).toBeFocused()
    await expect(handle).toHaveAttribute("aria-pressed", "false")
    const after = await handle.evaluate((element) => ({
      rowHeight: element.closest("tr")?.getBoundingClientRect().height,
      tableWidth: element.closest("table")?.getBoundingClientRect().width,
    }))
    expect(
      Math.abs((after.rowHeight ?? 0) - before.rowHeight)
    ).toBeLessThanOrEqual(1)
    expect(
      Math.abs((after.tableWidth ?? 0) - before.tableWidth)
    ).toBeLessThanOrEqual(1)
  })
}
