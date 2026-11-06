import { expect, type Page, test } from "@playwright/test"

async function expectContainedLines(page: Page) {
  const canvas = page.locator("#storybook-root")
  const root = canvas.locator('[data-scope="steps"][data-part="root"]')
  await expect(root).toHaveCount(1)
  const geometry = await root.evaluate((node) => {
    const container = node.parentElement
    const surface = container?.parentElement
    const frame = node.closest("#storybook-root")
    if (!(container && surface && frame)) {
      throw new Error("Lines must retain its bounded, padded story surface")
    }
    const padding = getComputedStyle(surface)
    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      scrollX: window.scrollX,
      frame: frame.getBoundingClientRect().toJSON(),
      root: node.getBoundingClientRect().toJSON(),
      expectedWidth: Math.min(
        surface.clientWidth -
          Number.parseFloat(padding.paddingInlineStart) -
          Number.parseFloat(padding.paddingInlineEnd),
        Number.parseFloat(getComputedStyle(container).maxWidth)
      ),
    }
  })
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth)
  expect(geometry.bodyWidth).toBeLessThanOrEqual(geometry.viewportWidth)
  expect(geometry.scrollX).toBe(0)
  expect(geometry.root.width).toBeGreaterThan(0)
  expect(Math.abs(geometry.root.width - geometry.expectedWidth)).toBeLessThan(1)
  expect(geometry.root.left).toBeGreaterThan(geometry.frame.left)
  expect(geometry.root.top).toBeGreaterThan(geometry.frame.top)
  expect(geometry.root.right).toBeLessThan(geometry.frame.right)
  expect(geometry.root.left).toBeGreaterThanOrEqual(0)
  expect(geometry.root.right).toBeLessThanOrEqual(geometry.viewportWidth)

  const list = root.getByRole("list")
  const items = list.getByRole("listitem")
  await expect(items).toHaveCount(3)
  await expect(root.locator('[data-part="indicator"]')).toHaveCount(0)
  await expect(root.locator('[data-part="description"]')).toHaveCount(0)
  for (const [index, title] of ["Brief", "Inputs", "Review"].entries()) {
    const item = items.nth(index)
    const trigger = item.getByRole("button", { name: title, exact: true })
    const label = trigger.getByText(title, { exact: true })
    const separator = item.locator('[data-part="separator"]')
    await expect(trigger).toBeVisible()
    await expect(label).toBeVisible()
    await expect(separator).toBeVisible()
    await expect(separator).toHaveCSS("position", "static")
    await expect(separator).toHaveCSS("opacity", "1")
    await expect(separator).not.toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)"
    )
    const column = await item.boundingBox()
    const line = await separator.boundingBox()
    const button = await trigger.boundingBox()
    const text = await label.evaluate((node) => {
      const range = document.createRange()
      range.selectNodeContents(node)
      return {
        lines: range.getClientRects().length,
        bounds: range.getBoundingClientRect().toJSON(),
      }
    })
    if (!(column && line && button)) {
      throw new Error(
        "Missing Lines column, flow connector or trigger geometry"
      )
    }
    expect(line.width).toBeGreaterThan(0)
    expect(line.height).toBeGreaterThan(0)
    expect(Math.abs(line.width - column.width)).toBeLessThan(1)
    expect(line.y + line.height).toBeLessThanOrEqual(button.y)
    expect(text.lines).toBe(1)
    expect(text.bounds.left).toBeGreaterThanOrEqual(column.x)
    expect(text.bounds.right).toBeLessThanOrEqual(column.x + column.width)
  }
  for (const element of await root
    .locator(
      '[data-part="content"]:not([hidden]), [data-part="completed-content"]:not([hidden]), [data-part="prev-trigger"], [data-part="next-trigger"]'
    )
    .all()) {
    const box = await element.boundingBox()
    if (!box) {
      throw new Error("Lines panels and navigation must remain visible")
    }
    expect(box.x).toBeGreaterThanOrEqual(geometry.root.left)
    expect(box.x + box.width).toBeLessThanOrEqual(geometry.root.right)
  }
}

for (const brand of ["base", "business"]) {
  for (const dir of ["ltr", "rtl"]) {
    const story = `molecules-steps--mixed-descriptions${dir === "rtl" ? "-rtl" : ""}`
    for (const variant of ["subtle", "solid"]) {
      for (const size of ["sm", "md", "lg"]) {
        test(`mixed Steps connectors: ${brand} ${dir} ${variant} ${size} at 320px`, async ({
          page,
        }) => {
          await page.setViewportSize({ width: 320, height: 900 })
          await page.goto(
            `/iframe.html?id=${story}&viewMode=story&globals=brand:${brand}&args=variant:${variant};size:${size}`
          )
          const roots = page.locator('[data-part="root"][data-scope="steps"]')
          await expect(roots).toHaveCount(3)
          await page.evaluate(() => document.fonts.ready)

          for (let describedIndex = 0; describedIndex < 3; describedIndex++) {
            const root = roots.nth(describedIndex)
            await expect(root).toHaveAttribute("dir", dir)
            await expect(root).toHaveAttribute(
              "data-description-index",
              String(describedIndex)
            )
            await expect(root.locator('[data-part="description"]')).toHaveCount(
              1
            )
            const list = root.locator('[data-part="list"]')
            // A reserved scrollbar gutter can reduce the containing block even
            // when documentElement.clientWidth still reports the full viewport.
            const availableWidth = await root.evaluate(
              (node) => node.clientWidth
            )
            expect(availableWidth).toBeGreaterThanOrEqual(300)
            expect(availableWidth).toBeLessThanOrEqual(320)
            expect(
              await list.evaluate((node) => node.getBoundingClientRect().width)
            ).toBe(availableWidth)
            const items = list.locator(':scope > [data-part="item"]')
            await expect(items).toHaveCount(3)
            await expect(
              items.nth(describedIndex).locator('[data-part="description"]')
            ).toHaveCount(1)

            for (let index = 0; index < 3; index++) {
              const item = items.nth(index)
              const indicator = item.locator('[data-part="indicator"]')
              await expect(indicator).toBeVisible()
              const column = await item.boundingBox()
              const current = await indicator.boundingBox()
              if (!(column && current)) {
                throw new Error("Missing step geometry")
              }
              expect(
                Math.abs(
                  current.x + current.width / 2 - column.x - column.width / 2
                )
              ).toBeLessThan(1)
              const trigger = await item
                .locator('[data-part="trigger"]')
                .boundingBox()
              if (!trigger) {
                throw new Error("Missing trigger geometry")
              }
              expect(Math.abs(trigger.width - column.width)).toBeLessThan(1)
              const separator = item.locator('[data-part="separator"]')
              if (index === 2) {
                await expect(separator).toBeHidden()
                continue
              }
              await expect(separator).toBeVisible()
              await expect(separator).toHaveCSS("position", "absolute")
              await expect(separator).toHaveCSS("opacity", "1")
              await expect(separator).not.toHaveCSS(
                "background-color",
                "rgba(0, 0, 0, 0)"
              )
              const line = await separator.boundingBox()
              const next = await items
                .nth(index + 1)
                .locator('[data-part="indicator"]')
                .boundingBox()
              if (!(line && next)) {
                throw new Error("Missing connector or next indicator")
              }
              expect(line.width).toBeGreaterThan(0)
              expect(line.height).toBeGreaterThan(0)
              expect(
                Math.abs(
                  current.y + current.height / 2 - line.y - line.height / 2
                )
              ).toBeLessThan(1)
              expect(
                Math.abs(next.y + next.height / 2 - line.y - line.height / 2)
              ).toBeLessThan(1)
              const [left, right] = [current, next].sort((a, b) => a.x - b.x)
              if (!(left && right)) {
                throw new Error("Missing adjacent indicator bounds")
              }
              // No overlap allowance: the connector must sit wholly in the gap.
              expect(line.x).toBeGreaterThanOrEqual(left.x + left.width)
              expect(line.x + line.width).toBeLessThanOrEqual(right.x)
            }
          }
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth)
          ).toBeLessThanOrEqual(320)
        })
      }
    }

    test(`mixed vertical Steps retain flow connectors: ${brand} ${dir}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 900 })
      await page.goto(
        `/iframe.html?id=${story}&viewMode=story&globals=brand:${brand}&args=orientation:vertical`
      )
      const lists = page.locator('[data-scope="steps"][data-part="list"]')
      await expect(lists).toHaveCount(3)
      for (const list of await lists.all()) {
        await expect(list).toHaveAttribute("data-orientation", "vertical")
        const separators = list.locator(
          '[data-part="separator"]:not([data-last])'
        )
        await expect(separators).toHaveCount(2)
        for (const separator of await separators.all()) {
          await expect(separator).toBeVisible()
          await expect(separator).toHaveCSS("position", "static")
        }
      }
    })
  }

  for (const width of [320, 393, 1280]) {
    test(`indicator-free Steps Lines retain bounded flow: ${brand} at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(
        `/iframe.html?id=molecules-steps--lines&viewMode=story&globals=brand:${brand}`
      )
      await page.evaluate(() => document.fonts.ready)
      await expectContainedLines(page)
      const canvas = page.locator("#storybook-root")
      await expect(canvas.locator('[data-part="content"]')).toHaveCount(3)
      await expect(
        canvas.getByRole("group", { name: "Inputs", exact: true })
      ).toHaveText("Inputs panel content.")
      for (const name of ["Review", "Workflow complete"]) {
        await canvas
          .getByRole("button", { name: "Continue", exact: true })
          .click()
        await expect(
          canvas.getByRole("group", { name, exact: true })
        ).toBeVisible()
        await expectContainedLines(page)
      }
      await expect(
        canvas.getByRole("button", { name: "Continue", exact: true })
      ).toBeDisabled()
      await canvas.getByRole("button", { name: "Back", exact: true }).click()
      await expect(
        canvas.getByRole("group", { name: "Review", exact: true })
      ).toHaveText("Review panel content.")
      await canvas.getByRole("button", { name: "Brief", exact: true }).click()
      await expect(
        canvas.getByRole("group", { name: "Brief", exact: true })
      ).toHaveText("Brief panel content.")
      await expectContainedLines(page)
    })
  }
}
