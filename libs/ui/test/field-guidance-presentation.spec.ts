import { expect, type Page, test } from "@playwright/test"

const callerPaddingClass = /\bp-200\b/
const incompleteNameDescription = /first and last name/

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

for (const [brand, mode] of themes) {
  for (const size of ["sm", "md", "lg"] as const) {
    test(`${brand}/${mode}: ${size} neutral guidance preserves its text column and caller overrides`, async ({
      page,
    }) => {
      await openStory(
        page,
        "atoms-statustext--playground",
        brand,
        mode,
        `status:default;size:${size}`
      )
      const message = page.locator('#storybook-root [data-status="default"]')
      await expect(message).toHaveCount(1)
      await expect(message).not.toHaveAttribute("role")
      await expect(
        message.locator(':scope > [aria-hidden="true"]')
      ).toHaveCount(0)
      const geometry = await message.evaluate((node) => {
        const style = getComputedStyle(node)
        return {
          prefix: Number.parseFloat(style.paddingInlineStart),
          textColumn:
            Number.parseFloat(style.fontSize) +
            Number.parseFloat(style.columnGap),
        }
      })
      expect(geometry.prefix).toBe(
        brand === "business" ? geometry.textColumn : 0
      )
      await message.evaluate((node, currentSize) => {
        ;(node as HTMLElement).style.setProperty(
          `--padding-status-text-neutral-${currentSize}`,
          "var(--dimension-32)"
        )
      }, size)
      await expect(message).toHaveCSS("padding-inline-start", "32px")

      await openStory(
        page,
        "atoms-statustext--playground",
        brand,
        mode,
        `status:default;size:${size};icon:token-icon-home`
      )
      await expect(message).not.toHaveAttribute("role")
      await expect(
        message.locator(':scope > [aria-hidden="true"]')
      ).toHaveCount(1)
      await expect(message).toHaveCSS("padding-inline-start", "0px")

      await openStory(
        page,
        "atoms-statustext--playground",
        brand,
        mode,
        `status:default;size:${size}`
      )
      await message.evaluate((node) => node.classList.add("p-200"))
      await expect(message).toHaveClass(callerPaddingClass)
      const padding = await message.evaluate((node) => {
        const style = getComputedStyle(node)
        return { inline: style.paddingInlineStart, block: style.paddingTop }
      })
      expect(padding.inline).toBe(padding.block)
      expect(Number.parseFloat(padding.inline)).toBeGreaterThan(0)
    })
  }

  test(`${brand}/${mode}: Input read-only surface retains native focus and selection without editing`, async ({
    page,
  }) => {
    await openStory(page, "atoms-input--variants", brand, mode)
    const editable = page.getByRole("textbox", {
      name: "Contact name — default",
    })
    const editableSurface = await editable.evaluate(
      (node) => getComputedStyle(node).backgroundColor
    )
    await openStory(page, "atoms-input--read-only", brand, mode)
    const input = page.getByRole("textbox", {
      name: "Contact name",
      exact: true,
    })
    await expect(input).toHaveAttribute("readonly")
    await expect(input).toBeEnabled()
    await expect
      .poll(() => input.evaluate((node) => node.getAnimations().length))
      .toBe(0)
    const border = await input.evaluate(
      (node) => getComputedStyle(node).borderColor
    )
    const surface = await input.evaluate(
      (node) => getComputedStyle(node).backgroundColor
    )
    if (brand === "business") {
      expect(surface).not.toBe(editableSurface)
    }
    await input.hover()
    if (brand === "business") {
      await expect(input).toHaveCSS("border-color", border)
    }
    await input.focus()
    await page.keyboard.press("ControlOrMeta+A")
    expect(
      await input.evaluate((node) => {
        const field = node as HTMLInputElement
        return { start: field.selectionStart, end: field.selectionEnd }
      })
    ).toEqual({ start: 0, end: "Alex Morgan".length })
    await page.keyboard.type("Replacement")
    await page.keyboard.press("Backspace")
    await expect(input).toBeFocused()
    await expect(input).toHaveValue("Alex Morgan")
    if (brand === "business") {
      await expect(input).toHaveCSS("border-color", border)
      await expect(input).toHaveCSS("background-color", surface)
    }
  })

  test(`${brand}/${mode}: Input error copy matches its incomplete value and feedback text column`, async ({
    page,
  }) => {
    await openStory(page, "atoms-input--variants", brand, mode)
    const input = page.getByRole("textbox", { name: "Contact name — error" })
    await expect(input).toHaveValue("Alex")
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input).toHaveAccessibleDescription(incompleteNameDescription)
    const columns = await page
      .locator("#storybook-root [data-status]")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const message = node.lastElementChild
          if (!message) {
            throw new Error("Missing StatusText message column")
          }
          return message.getBoundingClientRect().left
        })
      )
    expect(columns).toHaveLength(4)
    if (brand === "business") {
      expect(new Set(columns).size).toBe(1)
    }
    await input.fill("Alex Morgan")
    await expect(input).toHaveValue("Alex Morgan")
    await expect(input).toBeFocused()
  })

  test(`${brand}/${mode}: both explicitly read-only Checkbox choices stay immutable`, async ({
    page,
  }) => {
    await openStory(page, "atoms-checkbox--read-only", brand, mode)
    const choices = [
      ["Saved product selection (read-only)", false],
      ["Confirmed selection (read-only)", true],
    ] as const
    for (const [name, checked] of choices) {
      const choice = page.getByRole("checkbox", { name, exact: true })
      await expect(choice).toBeEnabled()
      await choice.click()
      await page.keyboard.press("Space")
      await expect(choice).toBeFocused()
      await expect(choice).toBeChecked({ checked })
    }
  })
}
