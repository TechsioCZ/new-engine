import { expect, test } from "@playwright/test"

const business = "&viewMode=story&globals=brand:business"

test("Business Hotkeys sm keycaps keep readable text and shared ink", async ({
  page,
}) => {
  await page.goto(`/iframe.html?id=atoms-hotkeys--sizes${business}`)
  const keys = page.locator("kbd")
  await expect(keys).toHaveCount(3)
  const styles = await keys.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element)
      return { color: style.color, size: Number.parseFloat(style.fontSize) }
    })
  )
  expect(styles[0]?.size).toBeGreaterThanOrEqual(12)
  expect(new Set(styles.map((style) => style.color)).size).toBe(1)
})

test("Hotkeys platform previews use one compact group rhythm", async ({
  page,
}) => {
  await page.goto(`/iframe.html?id=atoms-hotkeys--platforms${business}`)
  const headings = page.getByRole("heading", { level: 3 })
  await expect(headings).toHaveCount(3)
  const groups = await headings.evaluateAll((elements) =>
    elements.map((heading) => {
      const group = heading.parentElement?.getBoundingClientRect()
      return { top: group?.top ?? 0, bottom: group?.bottom ?? 0 }
    })
  )
  const gaps = groups
    .slice(1)
    .map((group, index) => group.top - (groups[index]?.bottom ?? 0))
  for (const gap of gaps) {
    expect(gap).toBeLessThanOrEqual(32)
    expect(gap).toBeCloseTo(gaps[0] ?? 0, 0)
  }
})

test("NumericInput uncontrolled labels sit next to their fields", async ({
  page,
}) => {
  await page.goto(
    `/iframe.html?id=atoms-numericinput--uncontrolled-defaults${business}`
  )
  for (const name of ["Numeric default quantity", "String default quantity"]) {
    const label = page.getByText(name, { exact: true })
    const input = page.getByRole("spinbutton", { name })
    const labelBox = await label.boundingBox()
    const control = await input
      .locator('xpath=ancestor::*[@data-part="control"][1]')
      .boundingBox()
    if (!(labelBox && control)) {
      throw new Error(`Missing ${name} layout`)
    }
    expect(control.y - (labelBox.y + labelBox.height)).toBeLessThanOrEqual(12)
  }
})

test("NumericInput fixture buttons leave room for the focus indicator", async ({
  page,
}) => {
  await page.goto(
    `/iframe.html?id=atoms-numericinput--deferred-parent-acknowledgement${business}`
  )
  const reset = page.getByRole("button", { name: "Reset quantity" })
  await reset.focus()
  const { gap, extent } = await reset.evaluate((button) => {
    const style = getComputedStyle(button)
    const spreads = [...style.boxShadow.matchAll(/(-?[\d.]+)px/g)]
      .map((match) => Number.parseFloat(match[1] ?? "0"))
      .filter((_, index) => index % 4 === 3)
    const outline =
      Number.parseFloat(style.outlineWidth) +
      Number.parseFloat(style.outlineOffset)
    const previous = button.previousElementSibling?.getBoundingClientRect()
    return {
      gap: button.getBoundingClientRect().top - (previous?.bottom ?? 0),
      extent: Math.max(outline, ...spreads),
    }
  })
  expect(gap).toBeGreaterThan(extent)
})

// Requires the Business --spacing-status-text-lg alias from
// build/council-atoms-review/build/fixes/shortcut-numeric-theme.json.
test("Business StatusText icon gap stays attached at every size", async ({
  page,
}) => {
  await page.goto(`/iframe.html?id=atoms-statustext--sizes${business}`)
  const messages = page.locator("[data-status=success]")
  await expect(messages).toHaveCount(3)
  const rows = await messages.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element)
      return {
        gap: Number.parseFloat(style.columnGap),
        size: Number.parseFloat(style.fontSize),
      }
    })
  )
  let previous = 0
  for (const row of rows) {
    expect(row.gap).toBeGreaterThanOrEqual(previous)
    expect(row.gap).toBeLessThanOrEqual(row.size / 2)
    previous = row.gap
  }
})
