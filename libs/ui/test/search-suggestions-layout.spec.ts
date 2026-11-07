import { expect, test } from "@playwright/test"

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 393, height: 659 },
  { width: 320, height: 568 },
]) {
  test(`search dialog leaves room for results at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto(
      "/iframe.html?id=templates-searchsuggestions--in-dialog&viewMode=story&globals=brand:business"
    )
    await page.getByRole("button", { name: "Open search" }).click()
    const dialog = page.getByRole("dialog", { name: "Search catalog" })
    const input = dialog.getByRole("combobox", { name: "Search catalog" })
    await input.focus()
    await input.press("ArrowDown")
    const content = dialog.locator(
      '[data-scope="combobox"][data-part="content"]'
    )
    await expect(content).toBeVisible()
    await expect(content).toHaveCSS("opacity", "1")
    await expect(content).toBeInViewport({ ratio: 1 })
    await expect(content.getByRole("option")).toHaveCount(3)

    // Visibility alone does not detect a popup painted over the title or close.
    for (const landmark of [
      dialog.getByRole("heading", { name: "Search catalog" }),
      dialog.locator('[data-scope="combobox"][data-part="label"]'),
      dialog.getByRole("button", { name: "Close dialog" }),
    ]) {
      await expect(landmark).toBeInViewport({ ratio: 1 })
      await expect
        .poll(() =>
          landmark.evaluate((node) => {
            const box = node.getBoundingClientRect()
            return node.contains(
              node.ownerDocument.elementFromPoint(
                box.left + box.width / 2,
                box.top + box.height / 2
              )
            )
          })
        )
        .toBe(true)
    }

    await expect
      .poll(() =>
        content.evaluate((node) => {
          const control = node
            .closest('[role="dialog"]')
            ?.querySelector('[data-scope="combobox"][data-part="control"]')
          return control
            ? node.getBoundingClientRect().top -
                control.getBoundingClientRect().bottom
            : -1
        })
      )
      .toBeGreaterThanOrEqual(0)
    await expect(input).toHaveAttribute("placeholder", "Search catalog")
    expect(
      await input.evaluate((node) => {
        const style = getComputedStyle(node)
        const context = new OffscreenCanvas(1, 1).getContext("2d")
        if (!context) {
          throw new Error("Missing text measurement context")
        }
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        const text = node.getAttribute("placeholder") ?? ""
        const letterSpacing = Number.parseFloat(style.letterSpacing) || 0
        const textWidth =
          context.measureText(text).width + letterSpacing * text.length
        return (
          textWidth <=
          node.clientWidth -
            Number.parseFloat(style.paddingLeft) -
            Number.parseFloat(style.paddingRight)
        )
      })
    ).toBe(true)

    await expect(input).toBeFocused()
    await input.press("Escape")
    await expect(content).toBeHidden()
    await expect(dialog).toBeVisible()
    await input.press("Escape")
    await expect(dialog).toBeHidden()
  })
}
