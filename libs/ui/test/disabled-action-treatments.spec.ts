import { expect, type Locator, type Page, test } from "@playwright/test"

const themes = [
  ["base", "light"],
  ["base", "dark"],
  ["neo", "light"],
  ["neo", "dark"],
  ["business", "light"],
  ["akros", "light"],
] as const

async function openStory(
  page: Page,
  story: string,
  brand: string,
  mode: string,
  args = ""
) {
  await page.goto(
    `/iframe.html?id=${story}&globals=brand:${brand};mode:${mode}${args ? `&args=${args}` : ""}`
  )
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __STORYBOOK_PREVIEW__?: { currentRender?: { phase?: string } }
            }
          ).__STORYBOOK_PREVIEW__?.currentRender?.phase
      )
    )
    .toBe("finished")
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${mode}\\b`))
  if (brand !== "base") {
    await expect(page.locator("html")).toHaveAttribute("data-theme", brand)
  }
}

function paint(locator: Locator) {
  return locator.evaluate((node) => {
    const style = getComputedStyle(node)
    const canvas = node.ownerDocument.createElement("canvas")
    canvas.width = 1
    canvas.height = 1
    const context = canvas.getContext("2d")
    if (!context) {
      throw new Error("Missing disabled-surface color context")
    }
    context.fillStyle = style.backgroundColor
    context.fillRect(0, 0, 1, 1)
    return {
      rgba: Array.from(context.getImageData(0, 0, 1, 1).data),
      border: style.borderColor,
      borderWidth: Number.parseFloat(style.borderTopWidth),
      color: style.color,
      opacity: style.opacity,
    }
  })
}

for (const [brand, mode] of themes) {
  test(`${brand}/${mode}: disabled Button silhouettes survive native hover and press`, async ({
    page,
  }) => {
    await openStory(page, "atoms-button--all-variants", brand, mode)
    const enabledBorderless = await paint(
      page.locator(".button-disabled-borderless").first()
    )
    const enabledOutlined = await paint(
      page.locator(".button-disabled-outlined").first()
    )
    await openStory(page, "atoms-button--states", brand, mode)
    const solid = page.getByRole("button", { name: "Solid", exact: true })
    const borderless = page.getByRole("button", {
      name: "Borderless",
      exact: true,
    })
    const outlined = page.getByRole("button", { name: "Outlined", exact: true })
    expect((await paint(solid)).rgba[3]).toBeGreaterThan(0)
    expect((await paint(borderless)).rgba).toEqual(enabledBorderless.rgba)
    expect((await paint(outlined)).rgba).toEqual(enabledOutlined.rgba)
    expect(enabledOutlined.borderWidth).toBeGreaterThan(0)
    expect((await paint(outlined)).borderWidth).toBe(
      enabledOutlined.borderWidth
    )
    for (const name of ["Solid", "Light", "Borderless", "Outlined"]) {
      const button = page.getByRole("button", { name, exact: true })
      await expect(button).toBeDisabled()
      const before = await paint(button)
      await button.hover()
      expect(await paint(button)).toEqual(before)
      await page.mouse.down()
      try {
        expect(await paint(button)).toEqual(before)
      } finally {
        await page.mouse.up()
      }
    }
    const busy = page.locator('#storybook-root button[aria-busy="true"]')
    await expect(busy).toHaveCount(3)
    await busy.first().focus()
    for (const button of await busy.all()) {
      expect(
        await button.evaluate((node) => (node as HTMLButtonElement).disabled)
      ).toBe(false)
      await expect(button).toHaveAttribute("aria-disabled", "true")
      await expect(button).toBeFocused()
      await page.keyboard.press("Tab")
    }
  })

  test(`${brand}/${mode}: disabled LinkButton treatments stay inert and out of Tab order`, async ({
    page,
  }) => {
    await openStory(page, "atoms-linkbutton--variants", brand, mode)
    const enabledSurfaces = {
      borderless: await paint(
        page.locator(".button-disabled-borderless").first()
      ),
      outlined: await paint(page.locator(".button-disabled-outlined").first()),
    }
    for (const theme of ["solid", "light", "borderless", "outlined"] as const) {
      await openStory(
        page,
        "atoms-linkbutton--states",
        brand,
        mode,
        `theme:${theme}`
      )
      const link = page.getByRole("link", { name: "View project", exact: true })
      await expect(link).toHaveAttribute("aria-disabled", "true")
      await expect(link).toHaveAttribute("tabindex", "-1")
      await expect(link).not.toHaveAttribute("href")
      expect(await link.evaluate((node) => node.tagName)).toBe("SPAN")
      const before = await paint(link)
      if (theme === "borderless" || theme === "outlined") {
        expect(before.rgba).toEqual(enabledSurfaces[theme].rgba)
      } else {
        expect(before.rgba[3]).toBeGreaterThan(0)
      }
      if (theme === "outlined") {
        expect(enabledSurfaces.outlined.borderWidth).toBeGreaterThan(0)
        expect(before.borderWidth).toBe(enabledSurfaces.outlined.borderWidth)
      }
      await link.hover()
      expect(await paint(link)).toEqual(before)
      await page.keyboard.press("Tab")
      await expect(link).not.toBeFocused()
    }
  })

  test(`${brand}/${mode}: disabled ActionIcon uses its state surface without dimming the glyph`, async ({
    page,
  }) => {
    for (const tone of ["neutral", "danger"]) {
      await openStory(
        page,
        "atoms-actionicon--states",
        brand,
        mode,
        `tone:${tone}`
      )
      const available = page.getByRole("button", {
        name: "Close preview",
        exact: true,
      })
      const disabled = page.getByRole("button", {
        name: "Close details",
        exact: true,
      })
      await expect(available).toBeEnabled()
      await expect(disabled).toBeDisabled()
      const resting = await paint(available)
      const before = await paint(disabled)
      if (brand === "business") {
        expect(before.rgba).not.toEqual(resting.rgba)
      } else {
        expect(before.rgba).toEqual(resting.rgba)
      }
      expect(before.opacity).toBe("1")
      await disabled.hover()
      expect(await paint(disabled)).toEqual(before)
      await disabled.evaluate((node) => {
        ;(node as HTMLElement).style.setProperty(
          "--color-action-icon-bg-disabled",
          "rgb(17 35 53)"
        )
      })
      expect((await paint(disabled)).rgba).toEqual([17, 35, 53, 255])
    }
  })

  test(`${brand}/${mode}: disabled numeric steppers retain compound styling and immutability`, async ({
    page,
  }) => {
    await openStory(page, "atoms-numericinput--disabled", brand, mode)
    const input = page.getByRole("spinbutton")
    await expect(input).toBeDisabled()
    await expect(input).toHaveValue("42")
    const buttons = page.locator('#storybook-root [data-part="control"] button')
    await expect(buttons).toHaveCount(2)
    for (const button of await buttons.all()) {
      await expect(button).toBeDisabled()
    }
    await page.keyboard.press("ArrowUp")
    await expect(input).toHaveValue("42")
  })
}
